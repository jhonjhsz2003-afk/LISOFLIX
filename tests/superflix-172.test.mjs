import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import handler from '../src/worker.js';
const read = f => readFileSync(new URL('../'+f,import.meta.url),'utf8');
const defaults=JSON.parse(read('wrangler.jsonc')).vars;
function mock(){const sqlite=new DatabaseSync(':memory:');sqlite.exec(read('schema.sql'));return {sqlite,DB:{prepare(sql){let binds=[];return {bind(...a){binds=a;return this},first(){return sqlite.prepare(sql).get(...binds)||null},all(){return {results:sqlite.prepare(sql).all(...binds)}},run(){return sqlite.prepare(sql).run(...binds)}}}}};}
async function get(DB,resource,flags=defaults){const response=await handler.fetch(new Request('https://lisoflix.example'+resource),{DB,...flags,ASSETS:{fetch:()=>new Response('ok')}},{});return {status:response.status,json:await response.json()};}
test('As tres fontes aparecem na configuracao padrao, preservando prioridade',async()=>{
 assert.equal(defaults.ENABLE_SUPERFLIX_FALLBACK,'true');
 assert.equal(defaults.ENABLE_VIDSRC_FALLBACK,'true');
 const {DB}=mock();const conf=(await get(DB,'/api/config')).json;
 assert.equal(conf.version,'1.7.4');
 assert.deepEqual(conf.fallbackPlayers,['superflix','vidsrc']);
 assert.equal(conf.secondaryPlayer,'superflix');
});
test('URLs do SuperFlix em filmes e episodios (temporada exata)',async()=>{
 const {DB}=mock();
 const film=(await get(DB,'/api/playback?type=movie&id=1061474')).json;
 assert.equal(film.available,true);
 assert.deepEqual(film.players.map(x=>x.provider),['embedmovies','superflix','vidsrc']);
 assert.equal(film.players[1].url,'https://superflixapi.fun/filme/1061474');
 assert.equal(film.players[1].availabilityVerified,false);
 const ep=(await get(DB,'/api/playback?type=tv&id=1396&season=1&episode=1')).json;
 assert.equal(ep.players[1].url,'https://superflixapi.fun/serie/1396/1/1');
});
test('fonte D1 desativada nao e liberada pelo SuperFlix',async()=>{
 const {DB,sqlite}=mock();
 sqlite.prepare("INSERT INTO playback_embeds(media_type,media_id,provider,enabled) VALUES('movie',1061474,'embedmovies',0)").run();
 assert.deepEqual((await get(DB,'/api/playback?type=movie&id=1061474')).json,{available:false,reason:'source-disabled'});
});
