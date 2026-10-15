import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import worker from '../src/worker.js';
const read=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const rows=[
 {id:100,media_type:'tv',name:'Anime A',genre_ids:[16,10759],original_language:'ja',poster_path:'/a.jpg'},
 {id:200,media_type:'tv',name:'Animação não japonesa',genre_ids:[16,10759],original_language:'en',poster_path:'/b.jpg'},
 {id:300,media_type:'tv',name:'Série comum',genre_ids:[18],original_language:'en',poster_path:'/c.jpg'},
 {id:400,media_type:'movie',title:'Longa de anime',genre_ids:[16,28],original_language:'ja',poster_path:'/d.jpg'},
 {id:500,media_type:'movie',title:'Filme comum',genre_ids:[14],original_language:'en',poster_path:'/e.jpg'}
];
test('Gêneros em Animes aceitam séries e longas japoneses sem desenhos de outro país',async()=>{
 const original=globalThis.fetch;const requests=[];
 globalThis.fetch=async(url)=>{requests.push(new URL(url));return new Response(JSON.stringify({results:rows,total_pages:1,page:1}),{status:200});};
 try{
  const env={TMDB_API_KEY:'key-test',ASSETS:{fetch:()=>new Response('ok')}};
  for(const [type,genre,expectedPath,expectedGenres] of [['tv','10759','/3/discover/tv','16,10759'],['movie','28','/3/discover/movie','16,28']]){
   const r=await worker.fetch(new Request(`https://site.test/api/discover?category=anime&type=${type}&genre=${genre}`),env,{});
   assert.equal(r.status,200);const d=await r.json();assert.deepEqual(d.results.map(x=>x.id).filter(id=>type==='tv'?id<400:id>=400),type==='tv'?[100]:[400]);
   assert.equal(requests.at(-1).pathname,expectedPath);assert.equal(requests.at(-1).searchParams.get('with_genres'),expectedGenres);
   assert.equal(requests.at(-1).searchParams.get('with_original_language'),'ja');
  }
 }finally{globalThis.fetch=original;}
});
test('Filtro de filmes e séries comuns exclui animação e não perde seleção de gênero',async()=>{
 const original=globalThis.fetch,urls=[];
 globalThis.fetch=async url=>{urls.push(new URL(url));return Response.json({results:rows});};
 try{const env={TMDB_API_KEY:'key-test'};await worker.fetch(new Request('https://site.test/api/discover?type=movie&genre=14'),env,{});assert.equal(urls.at(-1).searchParams.get('without_genres'),'16');}
 finally{globalThis.fetch=original;}
});
test('Grade de catálogo tem cinco capas grandes no desktop e duas em telas pequenas',()=>{
 const css=read('public/style.css');
 assert.match(css,/v1\.6\.1[^]*?\.catalog-grid\s*\{\s*grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
 assert.match(css,/@media\(max-width:720px\)\{\.catalog-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 const ui=read('public/app.js');assert.match(ui,/const animeGenres=/);assert.match(ui,/Gêneros de anime/);
 assert.match(ui,/moviePages=page==='animes'/);
});
test('Player EmbedMovies possui controles seguros de recarga e suporte ao formato documentado',()=>{
 const ui=read('public/app.js');const workerCode=read('src/worker.js');
 assert.match(ui,/data-action="retryembed"/);
 assert.match(ui,/encrypted-media/);
 assert.match(ui,/sandbox="allow-scripts allow-same-origin allow-presentation"/);
 assert.match(workerCode,/https:\/\/myembed\.biz\/filme\/\$\{id\}/);
 assert.match(workerCode,/https:\/\/myembed\.biz\/serie\/\$\{id\}\/\$\{season\}\/\$\{episode\}/);
});
