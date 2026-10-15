import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import handler from '../src/worker.js';
const read=(name)=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const makeDB=()=>{
 const db=new DatabaseSync(':memory:');db.exec(read('schema.sql'));
 const api={prepare(sql){let args=[];const st={bind(...a){args=a;return st},all(){return {results:db.prepare(sql).all(...args)}},first(){return db.prepare(sql).get(...args)||null},run(){return db.prepare(sql).run(...args)}};return st}};
 return {db,api};
};
async function playback(DB,params){const r=await handler.fetch(new Request('https://lisoflix.example/api/playback?'+new URLSearchParams(params)),{DB,ENABLE_EXTERNAL_EMBEDS:'true',ASSETS:{fetch:()=>new Response('ok')}},{});return {status:r.status,result:await r.json()};}
test('mesmo caminho de episodio direto do AnimeDragon para serie autorizada e sem cadastro repetido',async()=>{
 const {db,api}=makeDB();
 db.prepare("INSERT INTO playback_embeds(media_type,media_id,season,episode,provider,mode,label) VALUES ('tv',73223,0,0,'embedmovies','standard','Teste autorizado')").run();
 for(const [season,episode] of [[1,1],[1,23],[2,10]]){
  const {status,result}=await playback(api,{type:'tv',id:'73223',season,episode});
  assert.equal(status,200);assert.equal(result.available,true);assert.equal(result.scope,'series');assert.equal(result.availabilityVerified,false);
  assert.equal(result.url,`https://myembed.biz/serie/73223/${season}/${episode}`);
 }
});
test('episodio desativado explicitamente bloqueia a autorizacao da serie inteira',async()=>{
 const {db,api}=makeDB();
 db.prepare("INSERT INTO playback_embeds(media_type,media_id,season,episode,provider) VALUES ('tv',73223,0,0,'embedmovies')").run();
 db.prepare("INSERT INTO playback_embeds(media_type,media_id,season,episode,provider,enabled) VALUES ('tv',73223,1,2,'embedmovies',0)").run();
 assert.equal((await playback(api,{type:'tv',id:73223,season:1,episode:2})).result.available,false);
 assert.equal((await playback(api,{type:'tv',id:73223,season:1,episode:3})).result.available,true);
 assert.equal((await playback(api,{type:'tv',id:88888,season:1,episode:3})).result.available,false);
});
test('parametros de episodio invalidos nunca geram iframe e filmes exigem cadastro',async()=>{
 const {db,api}=makeDB();
 db.prepare("INSERT INTO playback_embeds(media_type,media_id,provider) VALUES ('movie',999,'embedmovies')").run();
 for(const q of [{type:'tv',id:73223,season:0,episode:0},{type:'tv',id:73223,season:1,episode:'2x'},{type:'movie',id:999,season:1,episode:3}]){
  const {status}=await playback(api,q);assert.equal(status,400);
 }
 assert.equal((await playback(api,{type:'movie',id:999})).result.url,'https://myembed.biz/filme/999');
});
test('ui do lisoflix aguarda primeiro episodio real e nao permite popups no iframe',()=>{
 const code=read('public/app.js');
 assert.match(code,/if\(mediaType\(d\)==='tv'&&!episode\)/);
 assert.match(code,/episode=\{season:s,episode:\+first\.episode_number\}/);
 assert.match(code,/sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"/);
 assert.doesNotMatch(code,/sandbox="[^"]*allow-popups/);
 const manager=read('11-GERENCIAR-FONTES.ps1');
 assert.match(manager,/Autorizar TODOS os episodios desta serie/);
 assert.match(manager,/MediaDetails -AllowWholeSeries/);
});
