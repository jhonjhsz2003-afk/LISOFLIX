import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import handler from '../src/worker.js';

function makeEnv(withoutLoginGuards=false) {
 const sqlite = new DatabaseSync(':memory:');
 let schema = readFileSync(new URL('../schema.sql',import.meta.url),'utf-8');
 if(withoutLoginGuards) schema=schema.replace(/CREATE TABLE IF NOT EXISTS login_guards \([\s\S]*?\);/,'');
 sqlite.exec(schema);
 const wrapper = {
   prepare(sql) {
     let bound=[];
     const obj={
       bind(...vals){bound=vals;return obj;},
       first(){return sqlite.prepare(sql).get(...bound)||null;},
       all(){return {results:sqlite.prepare(sql).all(...bound)};},
       run(){return sqlite.prepare(sql).run(...bound);}
     };
     return obj;
   },
   async batch(statements) {
     sqlite.exec('BEGIN TRANSACTION');
     try {const results=[];for(const st of statements)results.push(await st.run());sqlite.exec('COMMIT');return results;}
     catch(e){sqlite.exec('ROLLBACK');throw e;}
   }
 };
 return {DB:wrapper,ASSETS:{fetch:()=>new Response('html')}};
}
async function api(env,path,opt={},cookie=''){
 const headers={...opt.headers};if(cookie)headers.Cookie=cookie;
 const r=await handler.fetch(new Request('https://lisoflix.example'+path,{...opt,headers}),env,{});
 return {status:r.status,data:await r.json(),cookie:r.headers.get('Set-Cookie')?.split(';')[0]||''};
}
const json=(data)=>({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
test('Banco completo e cadastro salvam usuário e primeiro perfil',async()=>{
 const env=makeEnv();
 const health=await api(env,'/api/health');assert.equal(health.data.schemaReady,true);
 const created=await api(env,'/api/auth/register',json({name:'Teste',email:'teste@exemplo.com',password:'senha-muito-segura-42'}));
 assert.equal(created.status,200);assert.equal(created.data.profiles.length,1);assert.ok(created.cookie.startsWith('lisoflix_session='));
 const me=await api(env,'/api/auth/me',{},created.cookie);assert.equal(me.data.user.email,'teste@exemplo.com');
 assert.equal(me.data.activeProfile,created.data.profiles[0].id);
});
test('Login se recupera de tabela login_guards ausente sem apagar usuário',async()=>{
 const env=makeEnv(true);const reg=await api(env,'/api/auth/register',json({email:'recuperacao@exemplo.com',password:'senha-bem-forte-123'}));
 assert.equal(reg.status,200);
 const before=await api(env,'/api/health');assert.ok(before.data.missing.includes('login_guards'));
 const login=await api(env,'/api/auth/login',json({email:'recuperacao@exemplo.com',password:'senha-bem-forte-123'}));
 assert.equal(login.status,200);
 const after=await api(env,'/api/health');assert.equal(after.data.schemaReady,true);
});
test('Curtidas e descurtidas persistem por perfil, alternam e não multiplicam votos',async()=>{
 const env=makeEnv();const registered=await api(env,'/api/auth/register',json({email:'like@exemplo.com',password:'senha-com-12-chars'}));
 const cookie=registered.cookie;
 const initial=await api(env,'/api/reactions?type=movie&id=157336');assert.deepEqual(initial.data,{likes:0,dislikes:0,mine:0});
 assert.equal((await api(env,'/api/reactions',json({type:'movie',id:157336,vote:1}),cookie)).status,200);
 let votes=await api(env,'/api/reactions?type=movie&id=157336',{},cookie);
 assert.equal(votes.data.likes,1);assert.equal(votes.data.mine,1);
 assert.equal((await api(env,'/api/reactions',json({type:'movie',id:157336,vote:-1}),cookie)).status,200);
 votes=await api(env,'/api/reactions?type=movie&id=157336',{},cookie);
 assert.equal(votes.data.likes,0);assert.equal(votes.data.dislikes,1);
 assert.equal((await api(env,'/api/reactions',json({type:'movie',id:157336,vote:0}),cookie)).status,200);
 votes=await api(env,'/api/reactions?type=movie&id=157336');assert.equal(votes.data.dislikes,0);
 const invalid=await api(env,'/api/reactions',json({type:'tv',id:10,vote:77}),cookie);assert.equal(invalid.status,400);
});
