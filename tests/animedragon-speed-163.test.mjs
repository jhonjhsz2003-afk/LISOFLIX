import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import handler from '../src/worker.js';
const text=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const makeDB=()=>{
 const db=new DatabaseSync(':memory:');db.exec(text('schema.sql'));
 const api={prepare(sql){let a=[];const q={bind(...args){a=args;return q;},first(){return db.prepare(sql).get(...a)||null;},all(){return {results:db.prepare(sql).all(...a)}},run(){return db.prepare(sql).run(...a)}};return q;}};
 return {db,api};
};
async function playback(DB,params,opts={}){
 const env={DB,ENABLE_EXTERNAL_EMBEDS:'true',...opts,ASSETS:{fetch:()=>new Response('ok')}};
 const r=await handler.fetch(new Request(`https://lisoflix.test/api/playback?${new URLSearchParams(params)}`),env,{});
 return {status:r.status,body:await r.json()};
}
test('descoberta automática é opt-in e não afirma confirmar reprodução',async()=>{
 const {api}=makeDB();
 const args={type:'tv',id:'157336',season:'1',episode:'1'};
 const off=await playback(api,args);
 assert.equal(off.body.available,false);
 const on=await playback(api,args,{ENABLE_EMBEDMOVIES_AUTOMATIC:'true'});
 assert.equal(on.status,200);
 assert.equal(on.body.available,true);
 assert.equal(on.body.availabilityVerified,false);
 assert.equal(on.body.scope,'provider-auto');
 assert.equal(on.body.url,'https://myembed.biz/serie/157336/1/1');
});
test('bloqueio D1 expresso prevalece e outros fornecedores nao sao liberados',async()=>{
 const {db,api}=makeDB();
 db.prepare("INSERT INTO playback_embeds(media_type,media_id,season,episode,provider,enabled) VALUES ('tv',157336,1,1,'embedmovies',0)").run();
 const opts={ENABLE_EMBEDMOVIES_AUTOMATIC:'true'};
 assert.deepEqual((await playback(api,{type:'tv',id:157336,season:1,episode:1},opts)).body,{available:false,reason:'source-disabled'});
 assert.equal((await playback(api,{type:'tv',id:157336,season:1,episode:2},opts)).body.available,true);
 assert.equal((await playback(api,{type:'movie',id:333},opts)).body.available,true);
});
test('configuração padrão não libera embeds automaticamente',async()=>{
 const {api}=makeDB();
 const r=await handler.fetch(new Request('https://lisoflix.test/api/config'),{DB:api,ENABLE_EXTERNAL_EMBEDS:'true'},{});
 const d=await r.json();assert.equal(d.automaticEmbeds,false);assert.equal(d.version,'1.7.0');
});
test('catálogo progressivo entrega a primeira página antes das páginas seguintes',()=>{
 const ui=text('public/app.js');
 assert.match(ui,/await limitedPool\(names,5/);
 assert.match(ui,/renderCatalogWithoutScrollJump\(page\)/);
 assert.match(ui,/void limitedPool\(more,3/);
 assert.match(ui,/await Promise\.all\(\[\s*api\('\/api\/config'/);
 assert.match(text('public/index.html'),/app\.js\?v=1\.7\.0/);
});
