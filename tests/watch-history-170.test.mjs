import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import app from '../src/worker.js';
function setup(){const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../schema.sql',import.meta.url),'utf8'));const DB={prepare(sql){let args=[];const q={bind(...a){args=a;return q;},all(){return {results:db.prepare(sql).all(...args)}},first(){return db.prepare(sql).get(...args)||null;},run(){return db.prepare(sql).run(...args)}};return q},async batch(arr){db.exec('BEGIN');try{const result=[];for(const q of arr)result.push(await q.run());db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}};return {DB,ASSETS:{fetch:()=>new Response('ok')}};}
async function fetchAPI(env,path,body=null,cookie=''){const r=await app.fetch(new Request('https://lisoflix.example'+path,{method:body?'POST':'GET',headers:{...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}),env,{});return {status:r.status,body:await r.json(),cookie:r.headers.get('Set-Cookie')?.split(';')[0]};}
test('marcar assistido persiste por perfil, pode desmarcar e suporta progresso nativo',async()=>{
 const env=setup();const reg=await fetchAPI(env,'/api/auth/register',{name:'Pessoa',email:'watched@example.org',password:'senha-longa-para-teste-123'});assert.equal(reg.status,200);const c=reg.cookie;
 const title={title:'Filme de demonstração',poster_path:'/image.jpg',genre_ids:[12],release_date:'2024-01-01'};
 assert.equal((await fetchAPI(env,'/api/watch',{type:'movie',id:123,position:50,duration:200,snapshot:title},c)).status,200);
 let lib=(await fetchAPI(env,'/api/library',null,c)).body;assert.equal(lib.watching[0].watched,false);assert.equal(lib.watching[0].position,50);assert.equal(lib.watching[0].duration,200);
 assert.equal((await fetchAPI(env,'/api/watch/mark',{type:'movie',id:123,watched:true,snapshot:title},c)).status,200);
 lib=(await fetchAPI(env,'/api/library',null,c)).body;assert.equal(lib.watching[0].watched,true);
 await fetchAPI(env,'/api/watch',{type:'movie',id:123,position:99,duration:200,snapshot:title},c);
 lib=(await fetchAPI(env,'/api/library',null,c)).body;assert.equal(lib.watching[0].watched,true);assert.equal(lib.watching[0].position,99);
 await fetchAPI(env,'/api/watch/mark',{type:'movie',id:123,watched:false},c);
 lib=(await fetchAPI(env,'/api/library',null,c)).body;assert.equal(lib.watching[0].watched,false);
});
test('não aceita marcar assistido sem login, nem valores arbitrários',async()=>{
 const env=setup();assert.notEqual((await fetchAPI(env,'/api/watch/mark',{type:'movie',id:999,watched:true})).status,200);
 const reg=await fetchAPI(env,'/api/auth/register',{name:'Pessoa',email:'watch2@example.org',password:'senha-longa-para-teste-987'});
 assert.equal((await fetchAPI(env,'/api/watch/mark',{type:'movie',id:999,watched:'true'},reg.cookie)).status,400);
});
test('interface de perfil distingue lista, novo e edição sem reconstruir o formulário ao escolher avatar',()=>{
 const ui=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 assert.match(ui,/case 'newprofile'/);assert.match(ui,/state.profileFormOpen/);
 assert.match(ui,/case 'avatar':state.chosenAvatar=el.dataset.avatar\|\|'';document.querySelectorAll/);
 assert.match(ui,/watchStatus\(m\)/);assert.match(ui,/Já assistidos/);
 assert.match(ui,/O progresso exato é salvo apenas por fontes/);
});
