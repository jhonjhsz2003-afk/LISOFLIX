import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../src/worker.js';
const rows=[
 {id:1,media_type:'tv',name:'Anime teste',genre_ids:[16],original_language:'ja',poster_path:'/test.jpg'},
 {id:2,media_type:'tv',name:'Desenho teste',genre_ids:[16],original_language:'en',poster_path:'/test.jpg'},
 {id:3,media_type:'tv',name:'Serie teste',genre_ids:[18],original_language:'pt',poster_path:'/test.jpg'},
 {id:4,media_type:'movie',title:'Filme teste',genre_ids:[28],original_language:'en',poster_path:'/test.jpg'},
 {id:5,media_type:'movie',title:'Anime filme teste',genre_ids:[16],original_language:'ja',poster_path:'/test.jpg'},
 {id:6,media_type:'movie',title:'Desenho filme teste',genre_ids:[16],original_language:'en',poster_path:'/test.jpg'},
 ];
test('Separa filmes, series, animes e desenhos sem misturar entradas do provedor',async()=>{
 const orig=globalThis.fetch;
 globalThis.fetch=async()=>new Response(JSON.stringify({page:1,total_pages:1,results:rows}),{status:200});
 try{
  const env={TMDB_API_KEY:'local-test',ASSETS:{fetch:()=>new Response('ok')}};
  const expected={movies:[4],series:[3],anime:[1],cartoons:[2],animefilms:[5],cartoonfilms:[6],trending:[4],trendingseries:[3]};
  for(const [section,ids] of Object.entries(expected)){
   const res=await handler.fetch(new Request('https://site.test/api/catalog?section='+section),env,{});
   assert.equal(res.status,200,section);
   const d=await res.json();assert.deepEqual(d.results.map(x=>x.id),ids,section);
  }
 }finally{globalThis.fetch=orig;}
});
