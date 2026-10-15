import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import worker from '../src/worker.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function env(){const sqlite=new DatabaseSync(':memory:');sqlite.exec(read('schema.sql'));const DB={prepare(sql){let args=[];const x={bind(...z){args=z;return x},first(){return sqlite.prepare(sql).get(...args)||null},all(){return {results:sqlite.prepare(sql).all(...args)}},run(){return sqlite.prepare(sql).run(...args)}};return x},async batch(items){sqlite.exec('BEGIN');try{for(const item of items)await item.run();sqlite.exec('COMMIT')}catch(e){sqlite.exec('ROLLBACK');throw e}}};return {DB,sqlite,ASSETS:{fetch:()=>new Response('ok')}}}
async function request(e,path,data=null,cookie=''){
 const headers={};if(data){headers['Content-Type']='application/json'}if(cookie)headers.Cookie=cookie;
 const r=await worker.fetch(new Request('https://lisoflix.example'+path,{method:data?'POST':'GET',headers,body:data?JSON.stringify(data):undefined}),e,{});
 return {status:r.status,body:await r.json(),cookie:r.headers.get('Set-Cookie')?.split(';')[0]||''};
}
test('início sem chips duplicados, seta volta fora do início, busca dinâmica e botões proporcionais',()=>{
 const ui=read('public/app.js'),style=read('public/style.css');
 assert.doesNotMatch(ui,/<div class="pills"><button class="pill active"/);
 assert.match(ui,/state\.page!==\'inicio\'/);
 assert.match(ui,/search-suggestions/);assert.match(ui,/searchTimer=setTimeout/);
 assert.match(style,/\.rail-arrows-overlay \.arrow,.rail-arrows-overlay \.arrow-next\{width:44px;height:56px/);
 assert.match(ui,/filmGenres/);assert.match(ui,/seriesGenres/);
});
test('Minha Lista envia snapshot compacto, sem payload inteiro do detalhe',()=>{
 const ui=read('public/app.js');assert.match(ui,/function briefSnapshot\(d\)/);
 assert.match(ui,/snapshot:briefSnapshot\(d\)/);
 assert.doesNotMatch(ui,/snapshot:d\}/);
});
test('conta criada seleciona primeiro perfil e login volta ao mesmo automaticamente; sem PIN',async()=>{
 const e=env();const created=await request(e,'/api/auth/register',{name:'Rafa',email:'rafa@example.com',password:'senha-muito-segura-120'});
 assert.equal(created.status,200);assert.equal(created.body.profiles.length,1);
 assert.equal(created.body.activeProfile,created.body.profiles[0].id);
 const login=await request(e,'/api/auth/login',{email:'rafa@example.com',password:'senha-muito-segura-120'});
 assert.equal(login.status,200);assert.equal(login.body.activeProfile,created.body.activeProfile);
 const profile=await request(e,'/api/profiles',null,login.cookie);assert.equal(profile.status,200);
 const edit=await request(e,'/api/profiles/update',{id:created.body.activeProfile,name:'Atualizado',newPin:'1234'},login.cookie);
 assert.equal(edit.status,200);
 const safe=await request(e,'/api/profiles',null,login.cookie);
 assert.equal(safe.body.profiles[0].locked,undefined);
 assert.equal(e.sqlite.prepare('SELECT pin_hash FROM profiles LIMIT 1').get().pin_hash,null);
 assert.doesNotMatch(read('public/app.js'),/Digite o PIN|PIN de acesso \(opcional\)/);
});
test('comentários podem ser editados e excluídos somente pelo dono',async()=>{
 const e=env();const a=await request(e,'/api/auth/register',{name:'A',email:'a@example.com',password:'senha-muito-segura-123'});
 const b=await request(e,'/api/auth/register',{name:'B',email:'b@example.com',password:'senha-muito-segura-123'});
 const m={type:'movie',id:15958,content:'Comentário original'};
 const posted=await request(e,'/api/comments',m,a.cookie);assert.equal(posted.status,201);
 const listed=await request(e,'/api/comments?type=movie&id=15958',null,a.cookie);
 const id=listed.body.comments[0].id;assert.equal(listed.body.comments[0].mine,true);
 const otherList=await request(e,'/api/comments?type=movie&id=15958',null,b.cookie);
 assert.equal(otherList.body.comments[0].mine,false);
 const foreign=await request(e,'/api/comments/edit',{id,content:'Não permitido'},b.cookie);
 assert.equal(foreign.status,403);
 const owned=await request(e,'/api/comments/edit',{id,content:'Minha edição'},a.cookie);
 assert.equal(owned.status,200);
 const deleteForeign=await request(e,'/api/comments/delete',{id},b.cookie);assert.equal(deleteForeign.status,403);
 const deleted=await request(e,'/api/comments/delete',{id},a.cookie);assert.equal(deleted.status,200);
 assert.equal((await request(e,'/api/comments?type=movie&id=15958')).body.comments.length,0);
});
test('migração do provedor externo não toca perfis nem contas e é repetível',()=>{
 const e=env();const schema=read('schema.sql');const legacySql=schema.match(/CREATE TABLE IF NOT EXISTS playback_embeds \([\s\S]*?\);/)[0].replace("provider IN ('embedmovies')","provider IN ('multiembed')").replace("mode IN ('standard')","mode IN ('standard','vip')");
 e.sqlite.exec('DROP TABLE playback_embeds;');e.sqlite.exec(legacySql);
 e.sqlite.prepare("INSERT INTO playback_embeds(media_type,media_id,provider,mode) VALUES('movie',399566,'multiembed','standard')").run();
 const migrate=read('migrations/0002-limpar-embeds-antigos.sql');
 e.sqlite.exec(migrate);e.sqlite.exec(migrate);
 assert.equal(e.sqlite.prepare('SELECT COUNT(*) n FROM playback_embeds').get().n,0);
 e.sqlite.prepare("INSERT INTO playback_embeds(media_type,media_id,provider,mode) VALUES('movie',399566,'embedmovies','standard')").run();
 assert.equal(e.sqlite.prepare('SELECT COUNT(*) n FROM playback_embeds').get().n,1);
 assert.match(migrate,/BEGIN TRANSACTION/);
 assert.doesNotMatch(migrate,/DROP TABLE (users|profiles|sessions|comments)/);
 const pins=read('migrations/0003-remover-pin-perfis.sql');assert.match(pins,/UPDATE profiles SET pin_hash = NULL/);assert.doesNotMatch(pins,/UPDATE users SET/);
});
