import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import handler from '../src/worker.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
async function req(path,env={}){const r=await handler.fetch(new Request('https://lisoflix.example'+path),{ASSETS:{fetch:()=>new Response('html')},...env},{});return {status:r.status,json:await r.json()};}
test('system-check publico nao exibe segredos e relata fontes ausentes',async()=>{
 const env={TMDB_API_KEY:undefined};const data=(await req('/api/system-check',env)).json;
 assert.equal(data.version,'1.3.1');assert.equal(data.catalogAuth,'not-configured');
 assert.equal(data.database,false);assert.equal(data.activeSources,null);
 assert.equal(data.externalEmbedsSupported,false);
 assert.equal(JSON.stringify(data).includes('TMDB_API_KEY'),false);
});
test('cache bust em CSS e JS evita mostrar frontend antigo',()=>{
 const page=read('public/index.html');assert.match(page,/\/app\.js\?v=1\.3\.1/);
 assert.match(page,/\/style\.css\?v=1\.3\.1/);
 const headers=read('public/_headers');assert.match(headers,/\/app\.js\n\s+Cache-Control: no-cache/);
});
test('script de deploy preserva dados e impede backup em repositorio publico',()=>{
 const ps=read('08-VERIFICAR-CORRIGIR-PUBLICAR.ps1');
 assert.match(ps,/LOCALAPPDATA/);assert.match(ps,/\'d1\',\'export\'/);
 assert.match(ps,/\'d1\',\'execute\'/);
 assert.match(ps,/database_id/);
 assert.match(read('04-ATUALIZAR-REPOSITORIO-EXTRAIDO.ps1'),/'backups'/);
});
test('o player preserva progresso salvo ao abrir fonte autorizada',()=>{
 const ui=read('public/app.js');
 assert.match(ui,/attachNativePlayer\(playback\.position\|\|0\)/);
 assert.doesNotMatch(ui,/await savePlayerProgress\(0,0\);/);
});
test('configuracao unica D1 ja existe sem placeholders e sem flag enganosa',()=>{
 const cfg=JSON.parse(read('wrangler.jsonc'));
 assert.equal(cfg.d1_databases.length,1);
 assert.equal(cfg.d1_databases[0].binding,'DB');
 assert.match(cfg.d1_databases[0].database_id,/^[0-9a-f-]{36}$/);
 assert.equal(Object.hasOwn(cfg.vars,'ENABLE_EXTERNAL_EMBEDS'),false);
});
