import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../src/worker.js';
const env={ASSETS:{fetch:()=>new Response('asset')}};
const request=(path,opt)=>handler.fetch(new Request(`https://teste.workers.dev${path}`,opt),env,{});
const api=async(path,opt)=>{const r=await request(path,opt);return [r.status,await r.json()];};
test('health sem conta externa',async()=>{
 const [status,j]=await api('/api/health');assert.equal(status,200);assert.equal(j.status,'ok');assert.equal(j.tmdb,false);
});
test('config nao expõe Google nem credenciais',async()=>{
 const [status,j]=await api('/api/config');assert.equal(status,200);assert.equal(j.tmdb,false);assert.equal('google' in j,false);assert.equal(j.embeds,false);
});
test('catalogo demonstracao retorna resultados',async()=>{
 const [status,j]=await api('/api/catalog?section=anime');assert.equal(status,200);assert.equal(j.demo,true);assert.ok(j.results.length>0);
});
test('busca e detalhe demonstracao',async()=>{
 const [s,j]=await api('/api/search?q=One%20Piece');assert.equal(s,200);assert.ok(j.results.length>0);
 const [ds,d]=await api('/api/detail?type=movie&id=157336');assert.equal(ds,200);assert.equal(d.id,157336);
});
test('nao permite cadastro sem D1',async()=>{
 const [s,j]=await api('/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'teste@exemplo.com',password:'senhatestelong'} )});
 assert.equal(s,503);assert.match(j.error,/D1/);
});
test('proteção de origem no envio JSON',async()=>{
 const [s,j]=await api('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://site-atacante.test'},body:'{}'});
 assert.equal(s,403);assert.match(j.error,/Origem/);
});
test('comentarios publicos vazios na previsualizacao',async()=>{
 const [s,j]=await api('/api/comments?type=movie&id=157336');assert.equal(s,200);assert.deepEqual(j.comments,[]);
});
test('servicos estaticos atendidos',async()=>{
 const r=await request('/qualquer');assert.equal(await r.text(),'asset');
});
test('TMDB_API_KEY do Secret fica no backend, nao na resposta publica',async()=>{
 const old=globalThis.fetch;
 let requested=null;
 globalThis.fetch=async(url,options)=>{
  requested={url,options};
  return new Response(JSON.stringify({results:[{id:157336,title:'Exemplo',poster_path:'/abc123.jpg'}],page:1,total_pages:1}),{status:200});
 };
 try{
  const local={...env,TMDB_API_KEY:'SEGREDO_DE_TESTE_12345'};
  const r=await handler.fetch(new Request('https://teste.workers.dev/api/catalog?section=movies'),local,{});
  const body=await r.text();
  assert.equal(r.status,200);assert.ok(requested);
  assert.equal(new URL(requested.url).searchParams.get('api_key'),'SEGREDO_DE_TESTE_12345');
  assert.equal(body.includes('SEGREDO_DE_TESTE_12345'),false);
  assert.equal(JSON.parse(body).results[0].id,157336);
 }finally{globalThis.fetch=old;}
});
