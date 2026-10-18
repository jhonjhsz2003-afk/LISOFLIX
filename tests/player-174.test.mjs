import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const ui=read('public/app.js');
const isolated=ui.slice(ui.indexOf('function validEmbedOption(p){'),ui.indexOf('function trailerModal(){'));
function render(selected){
 const sources=[
  {provider:'embedmovies',url:'https://myembed.biz/serie/1434/1/1',label:'EmbedMovies'},
  {provider:'warezcdn',url:'https://warezcdn.sbs/serie/1434/1/1',label:'WarezCDN'},
  {provider:'vidsrc',url:'https://vidsrc.mov/embed/tv/1434/1/1',label:'VidSrc'}
 ];
 return runInNewContext(`${isolated}\nplayerModal();`,{URL,state:{detail:{title:'Teste',id:1434},playerEpisode:{season:1,episode:1},playerOptionIndex:selected,playback:{available:true,mode:'iframe',players:sources}},esc:v=>String(v),icon:()=>'',title:d=>d.title,dVideo:()=>null,pics:()=>''});
}
test('tres fontes aparecem na ordem correta, sem Warez CDN injetar scripts',()=>{
 const html=render(0);assert.match(html,/EmbedMovies/);assert.match(html,/WarezCDN/);assert.match(html,/VidSrc/);
 assert.match(html,/id="player-provider-select"/);assert.match(html,/data-action="switchplayer"/);
 assert.doesNotMatch(html,/superflixapi|data-action="warezcdnroute"/i);
});
test('WarezCDN usa apenas rota de serie documentada, sem trocar por /anime',()=>{
 const html=render(1);
 assert.match(html,/src="https:\/\/warezcdn\.sbs\/serie\/1434\/1\/1"/);
 assert.doesNotMatch(html,/warezcdn\.sbs\/anime/);
 assert.match(html,/src="https:\/\/warezcdn\.sbs[^" ]*"[^>]*sandbox="[^"]*allow-popups"/);
 assert.doesNotMatch(html,/allow-top-navigation/);
});
test('EmbedMovies permanece isolado; VidSrc mantém excecao por host',()=>{
 assert.match(render(0),/src="https:\/\/myembed\.biz\/serie\/1434\/1\/1"[^>]*sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"/);
 assert.doesNotMatch(render(2),/src="https:\/\/vidsrc\.mov\/embed\/tv\/1434\/1\/1"[^>]*sandbox=/);
});
test('validacao bloqueia host falso, parametros e HTTP para WarezCDN',()=>{
 for(const bad of ['https://warezcdn.sbs.evil.invalid/serie/1434/1/1','https://warezcdn.sbs/serie/1434/1/1?q=x','http://warezcdn.sbs/serie/1434/1/1','https://warezcdn.sbs/anime/1434/1/1']){
  assert.equal(runInNewContext(`${isolated}\nvalidEmbedOption({provider:'warezcdn',url:${JSON.stringify(bad)}})`,{URL}),false,bad);
 }
 for(const url of ['https://warezcdn.sbs/filme/969681','https://warezcdn.sbs/serie/1434/1/1']){
  assert.equal(runInNewContext(`${isolated}\nvalidEmbedOption({provider:'warezcdn',url:${JSON.stringify(url)}})`,{URL}),true,url);
 }
});
test('ajuda nao bloqueia video e mantem troca de fonte',()=>{
 const html=render(1);assert.match(html,/data-action="playerhelp"/);assert.doesNotMatch(html,/class="player-help-panel"/);
});
