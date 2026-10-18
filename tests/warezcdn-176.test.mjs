import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import handler from '../src/worker.js';
const read = f => readFileSync(new URL('../'+f,import.meta.url),'utf8');
const defaults=JSON.parse(read('wrangler.jsonc')).vars;
function mock(){const sqlite=new DatabaseSync(':memory:');sqlite.exec(read('schema.sql'));return {sqlite,DB:{prepare(sql){let binds=[];return {bind(...a){binds=a;return this},first(){return sqlite.prepare(sql).get(...binds)||null},all(){return {results:sqlite.prepare(sql).all(...binds)}},run(){return sqlite.prepare(sql).run(...binds)}}}}};}
async function get(DB,resource,flags=defaults){const response=await handler.fetch(new Request('https://lisoflix.example'+resource),{DB,...flags,ASSETS:{fetch:()=>new Response('ok')}},{});return {status:response.status,json:await response.json()};}
test('Apos aprovacao as tres fontes aparecem, preservando prioridade',async()=>{
 assert.equal(defaults.ENABLE_WAREZCDN_FALLBACK,'false');
 assert.equal(defaults.ENABLE_VIDSRC_FALLBACK,'true');
 const {DB}=mock();const conf=(await get(DB,'/api/config',{...defaults,ENABLE_WAREZCDN_FALLBACK:'true'})).json;
 assert.equal(conf.version,'1.7.6');
 assert.deepEqual(conf.fallbackPlayers,['warezcdn','vidsrc']);
 assert.equal(conf.secondaryPlayer,'warezcdn');
});
test('URLs do WarezCDN em filmes e episodios (temporada exata)',async()=>{
 const {DB}=mock();
 const film=(await get(DB,'/api/playback?type=movie&id=1061474',{...defaults,ENABLE_WAREZCDN_FALLBACK:'true'})).json;
 assert.equal(film.available,true);
 assert.deepEqual(film.players.map(x=>x.provider),['embedmovies','warezcdn','vidsrc']);
 assert.equal(film.players[1].url,'https://warezcdn.sbs/filme/1061474');
 assert.equal(film.players[1].availabilityVerified,false);
 const ep=(await get(DB,'/api/playback?type=tv&id=1396&season=1&episode=1',{...defaults,ENABLE_WAREZCDN_FALLBACK:'true'})).json;
 assert.equal(ep.players[1].url,'https://warezcdn.sbs/serie/1396/1/1');
});
test('fonte D1 desativada nao e liberada pelo WarezCDN',async()=>{
 const {DB,sqlite}=mock();
 sqlite.prepare("INSERT INTO playback_embeds(media_type,media_id,provider,enabled) VALUES('movie',1061474,'embedmovies',0)").run();
 assert.deepEqual((await get(DB,'/api/playback?type=movie&id=1061474',{...defaults,ENABLE_WAREZCDN_FALLBACK:'true'})).json,{available:false,reason:'source-disabled'});
});
test('dominio pendente: WarezCDN nao aparece com a flag desativada por padrao',async()=>{
 const {DB}=mock();const r=(await get(DB,'/api/playback?type=movie&id=969681')).json;
 assert.deepEqual(r.players.map(p=>p.provider),['embedmovies','vidsrc']);
 assert.equal((await get(DB,'/api/config')).json.secondaryPlayer,'vidsrc');
});
test('WarezCDN desliga quando embeddings externos sao desativados',async()=>{
 const {DB}=mock();const flags={...defaults,ENABLE_WAREZCDN_FALLBACK:'true',ENABLE_EXTERNAL_EMBEDS:'false'};
 const conf=(await get(DB,'/api/config',flags)).json;
 assert.deepEqual(conf.fallbackPlayers,[]);
 assert.deepEqual((await get(DB,'/api/playback?type=movie&id=969681',flags)).json,{available:false,reason:'no-source-configured'});
});
test('nenhuma URL do provedor anterior permanece no codigo ativo',()=>{
 for(const path of ['src/worker.js','public/app.js','public/_headers','wrangler.jsonc']){
  const text=read(path);assert.doesNotMatch(text,/superflixapi|ENABLE_SUPERFLIX_FALLBACK|superflixapi\.fun/i,path);
 }
});
