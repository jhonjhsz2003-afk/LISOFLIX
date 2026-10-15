import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import handler from '../src/worker.js';
const txt=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function mockDB(){
 const db=new DatabaseSync(':memory:');db.exec(txt('schema.sql'));
 const api={prepare(sql){let args=[];const st={bind(...a){args=a;return st;},all(){return {results:db.prepare(sql).all(...args)};},first(){return db.prepare(sql).get(...args)||null;},run(){return db.prepare(sql).run(...args);}};return st;}};
 return api;
}
async function req(env,path){let r=await handler.fetch(new Request('https://lisoflix.example'+path),{ASSETS:{fetch:()=>new Response('OK')},...env},{});return {status:r.status,value:await r.json()};}
test('zip PHP nao entrou em Workers e fonte externa nao liga por padrao',async()=>{
 assert.doesNotMatch(txt('src/worker.js'),/CURLOPT_SSL_VERIFYPEER/);
 const d=mockDB();d.prepare("INSERT INTO playback_embeds(media_type,media_id,provider,mode) VALUES ('movie',123456,'embedmovies','standard')").run();
 const v=await req({DB:d},'/api/playback?type=movie&id=123456');assert.equal(v.value.available,false);
 const c=await req({DB:d},'/api/config');assert.equal(c.value.embeds,false);
});
test('ativacao explicita usa URL documentada a partir de ID TMDB permitido',async()=>{
 const d=mockDB();d.prepare("INSERT INTO playback_embeds(media_type,media_id,provider,mode) VALUES ('movie',123456,'embedmovies','standard')").run();
 const v=await req({DB:d,ENABLE_EXTERNAL_EMBEDS:'true'},'/api/playback?type=movie&id=123456');
 assert.equal(v.value.available,true);assert.equal(v.value.mode,'iframe');assert.equal(v.value.customControls,false);
 assert.equal(v.value.url,'https://myembed.biz/filme/123456');
 const no=await req({DB:d,ENABLE_EXTERNAL_EMBEDS:'true'},'/api/playback?type=movie&id=777');assert.equal(no.value.available,false);
});
test('episodios autorizados usam IDs e temporada exatos e sandbox bloqueia popup',async()=>{
 const d=mockDB();d.prepare("INSERT INTO playback_embeds(media_type,media_id,season,episode,provider,mode) VALUES ('tv',114472,1,2,'embedmovies','standard')").run();
 const v=await req({DB:d,ENABLE_EXTERNAL_EMBEDS:'true'},'/api/playback?type=tv&id=114472&season=1&episode=2');
 assert.equal(v.value.url,'https://myembed.biz/serie/114472/1/2');
 const ui=txt('public/app.js');assert.match(ui,/sandbox=\"allow-scripts allow-same-origin allow-forms allow-presentation\"/);assert.doesNotMatch(ui,/allow-popups/);
 assert.match(txt('public/_headers'),/frame-src.*https:\/\/myembed\.biz/);
});
