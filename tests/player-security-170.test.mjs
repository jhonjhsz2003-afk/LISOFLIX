import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const ui=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const headers=readFileSync(new URL('../public/_headers',import.meta.url),'utf8');
const security=ui.slice(ui.indexOf('function validEmbedOption(p){'),ui.indexOf('function playerModal(){'));
const player=ui.slice(ui.indexOf('function playerModal(){'),ui.indexOf('function trailerModal(){'));
function render(choice=0,spoof=false){
 const players=[{provider:'embedmovies',label:'Principal',url:'https://myembed.biz/filme/969681'},
 {provider:'cineveok',label:'Alternativo',url:spoof?'https://unsafe.invalid/embed/movie/969681':'https://cineveok.firebaseapp.com/embed/movie/969681'}];
 return runInNewContext(`${security}\n${player}\nplayerModal();`,{
  URL, state:{detail:{id:969681,title:'Título de teste'},playerEpisode:null,playerOptionIndex:choice,playback:{available:true,mode:'iframe',players}},
  title:d=>d.title,esc:v=>String(v),icon:()=>'',dVideo:()=>null,pics:()=>null,
 });
}
test('Player principal usa sandbox, segunda fonte válida é selecionável no topo',()=>{
 const html=render(0);assert.match(html,/src="https:\/\/myembed\.biz\/filme\/969681"[^>]*sandbox=/);
 assert.match(html,/id="player-provider-select"/);assert.match(html,/Principal/);assert.match(html,/Alternativo/);
 assert.doesNotMatch(html,/multiembed\.mov|superembed/i);
});
test('URL secundária segue formato de filmes e abre sem sandbox só nesse provedor',()=>{
 const html=render(1);assert.match(html,/src="https:\/\/cineveok\.firebaseapp\.com\/embed\/movie\/969681"/);
 assert.doesNotMatch(html,/<iframe[^>]+sandbox=/);assert.match(html,/id="player-provider-select"/);
});
test('Domínios suspeitos nunca são liberados como iframe',()=>{
 const html=render(1,true);assert.doesNotMatch(html,/unsafe\.invalid/);assert.match(html,/src="https:\/\/myembed\.biz/);
 assert.equal(runInNewContext(`${security}\nvalidEmbedOption({provider:'cineveok',url:'https://cineveok.firebaseapp.com.evil.test/embed/movie/123'})`,{URL}),false);
 assert.equal(runInNewContext(`${security}\nvalidEmbedOption({provider:'cineveok',url:'https://cineveok.firebaseapp.com/embed/movie/123?redirect=https://evil.test'})`,{URL}),false);
});
test('CSP não permite terceiros arbitrários e não contém SuperEmbed',()=>{
 assert.match(headers,/frame-src.*https:\/\/myembed\.biz.*https:\/\/cineveok\.firebaseapp\.com/);
 assert.doesNotMatch(headers,/frame-src\s+\*/);assert.doesNotMatch(headers,/multiembed|superembed|streamingnow/i);
});
