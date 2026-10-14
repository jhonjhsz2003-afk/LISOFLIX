import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';

const endpoint='https://lisoflix.test';
const base={ASSETS:{fetch:()=>new Response('site')}};
const send=(path,env)=>worker.fetch(new Request(endpoint+path),{...base,...env},{});
const stubFetch=(fn)=>{const old=globalThis.fetch;globalThis.fetch=fn;return()=>{globalThis.fetch=old;};};

test('API Key v3 vai somente na query, sem vazar nas respostas',async()=>{
 let seen;
 const restore=stubFetch(async(u,opts)=>{seen={u:new URL(u),opts};return Response.json({id:11});});
 try{
  const r=await send('/api/tmdb/check',{TMDB_API_KEY:'  abcdef0123456789abcdef0123456789  '});
  assert.equal(r.status,200);assert.equal((await r.json()).authorized,true);
  assert.equal(seen.u.searchParams.get('api_key'),'abcdef0123456789abcdef0123456789');
  assert.equal(seen.opts.headers.Authorization,undefined);
 }finally{restore();}
});

test('JWT em TMDB_API_KEY e reconhecido automaticamente como Bearer',async()=>{
 let seen;
 const token='eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.abc123def';
 const restore=stubFetch(async(u,opts)=>{seen={u:new URL(u),opts};return Response.json({id:11});});
 try{
  const r=await send('/api/tmdb/check',{TMDB_API_KEY:token});
  assert.equal(r.status,200);assert.equal((await r.json()).authorized,true);
  assert.equal(seen.u.searchParams.has('api_key'),false);
  assert.equal(seen.opts.headers.Authorization,`Bearer ${token}`);
 }finally{restore();}
});

test('TMDB_BEARER_TOKEN permite prefixo Bearer e aspas externas',async()=>{
 let seen;
 const restore=stubFetch(async(u,opts)=>{seen={u:new URL(u),opts};return Response.json({id:11});});
 try{
  const r=await send('/api/tmdb/check',{TMDB_BEARER_TOKEN:' "Bearer eyJ.abc.def" '});
  assert.equal(r.status,200);
  assert.equal(seen.u.searchParams.has('api_key'),false);
  assert.equal(seen.opts.headers.Authorization,'Bearer eyJ.abc.def');
 }finally{restore();}
});

test('fallback para API Key v3 caso token secundario receba 401',async()=>{
 const requests=[];
 const restore=stubFetch(async(u,opts)=>{
  requests.push({u:new URL(u),opts});
  if(opts.headers.Authorization)return Response.json({status_message:'Invalid API key'},{status:401});
  return Response.json({ok:true});
 });
 try{
  const r=await send('/api/tmdb/check',{TMDB_BEARER_TOKEN:'eyJ.invalid.token',TMDB_API_KEY:'validv3key'});
  assert.equal(r.status,200);assert.equal((await r.json()).authorized,true);
  assert.equal(requests.length,2);
  assert.equal(requests[1].u.searchParams.get('api_key'),'validv3key');
 }finally{restore();}
});

test('401 gera erro amigavel 502 sem expor credencial',async()=>{
 const restore=stubFetch(async()=>Response.json({status_message:'Invalid API key'},{status:401}));
 try{
  const secret='abcdef0123456789abcdef0123456789';
  const r=await send('/api/tmdb/check',{TMDB_API_KEY:secret});
  const text=await r.text();
  assert.equal(r.status,502);assert.match(text,/401/);
  assert.equal(text.includes(secret),false);
 }finally{restore();}
});

test('check sem secret nao tenta consultar TMDB',async()=>{
 const r=await send('/api/tmdb/check',{});
 assert.equal(r.status,503);assert.equal((await r.json()).configured,false);
});
