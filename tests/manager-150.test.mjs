import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import worker from '../src/worker.js';
const text=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function dbMock(){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec(text('schema.sql'));
 return {sqlite,DB:{prepare(sql){let args=[];const chain={bind(...v){args=v;return chain},first(){return sqlite.prepare(sql).get(...args)||null},all(){return {results:sqlite.prepare(sql).all(...args)}},run(){return sqlite.prepare(sql).run(...args)}};return chain;}}};
}
async function get(env,path){const response=await worker.fetch(new Request('https://localhost'+path),{ASSETS:{fetch:()=>new Response('ok')},...env},{});return {status:response.status,data:await response.json()};}
test('system-check separa videos nativos e players externos sem divulgar URLs',async()=>{
 const {sqlite,DB}=dbMock();
 sqlite.prepare("INSERT INTO playback_sources(media_type,media_id,url,mime) VALUES ('movie', 100, 'https://media.example.com/one.mp4', 'video/mp4')").run();
 sqlite.prepare("INSERT INTO playback_embeds(media_type,media_id,provider,mode) VALUES ('movie',200,'embedmovies','standard')").run();
 const result=await get({DB,ENABLE_EXTERNAL_EMBEDS:'true'},'/api/system-check');
 assert.equal(result.status,200);assert.equal(result.data.version,'1.7.0');
 assert.equal(result.data.activeSources,1);assert.equal(result.data.activeEmbeds,1);
 assert.equal(result.data.externalEmbedsEnabled,true);
 assert.doesNotMatch(JSON.stringify(result.data),/media\.example\.com/);
});
test('titulo sem fonte retorna indisponivel; fonte aprovada requer cadastro explicito',async()=>{
 const {sqlite,DB}=dbMock();
 assert.equal((await get({DB,ENABLE_EXTERNAL_EMBEDS:'true'},'/api/playback?type=movie&id=900')).data.available,false);
 sqlite.prepare("INSERT INTO playback_embeds(media_type,media_id,provider,mode) VALUES ('movie',900,'embedmovies','standard')").run();
 const ready=await get({DB,ENABLE_EXTERNAL_EMBEDS:'true'},'/api/playback?type=movie&id=900');
 assert.equal(ready.data.available,true);assert.equal(ready.data.mode,'iframe');
 sqlite.prepare("UPDATE playback_embeds SET enabled=0 WHERE media_type='movie' AND media_id=900").run();
 assert.equal((await get({DB,ENABLE_EXTERNAL_EMBEDS:'true'},'/api/playback?type=movie&id=900')).data.available,false);
});
test('gestor verifica a conta, faz backup externo e nao distribui fontes automaticamente',()=>{
 const manager=text('11-GERENCIAR-FONTES.ps1');
 assert.match(manager,/wrangler whoami/);
 assert.match(manager,/wrangler d1 list --json/);
 assert.match(manager,/uuidConfig/);
 assert.match(manager,/databaseTarget = 'DB'/);
 assert.match(manager,/--json/);
 assert.match(manager,/Nenhuma fonte cadastrada/);
 assert.match(manager,/ToUpperInvariant/);
 assert.match(manager,/LOCALAPPDATA/);
 assert.match(manager,/BackupOnce/);
 assert.match(manager,/autorizacao|direitos/i);
 assert.doesNotMatch(text('schema.sql'),/INSERT INTO playback_embeds\(/);
});
