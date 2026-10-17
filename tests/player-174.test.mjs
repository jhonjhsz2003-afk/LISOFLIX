import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const ui=read('public/app.js');
const isolated=ui.slice(ui.indexOf('function validEmbedOption(p){'),ui.indexOf('function trailerModal(){'));
function render(selected,genreIds=[16],superflixRoute=''){
 const sources=[
  {provider:'embedmovies',url:'https://myembed.biz/serie/1434/1/1',label:'EmbedMovies'},
  {provider:'superflix',url:'https://superflixapi.fun/serie/1434/1/1',label:'SuperFlixAPI'},
  {provider:'vidsrc',url:'https://vidsrc.mov/embed/tv/1434/1/1',label:'VidSrc'},
 ];
 return runInNewContext(`${isolated}\nplayerModal();`,{URL,state:{detail:{title:'Teste',id:1434,genre_ids:genreIds},playerEpisode:{season:1,episode:1},playerOptionIndex:selected,superflixRoute,playback:{available:true,mode:'iframe',players:sources}},esc:v=>String(v),icon:()=>'',title:d=>d.title,dVideo:()=>null,pics:()=>''});
}
test('as tres fontes continuam presentes e ativas na interface',()=>{
 const html=render(0);
 assert.match(html,/EmbedMovies/);assert.match(html,/SuperFlixAPI/);assert.match(html,/VidSrc/);
 assert.match(html,/id="player-provider-select"/);assert.match(html,/data-action="switchplayer"/);
});
test('para animacao o SuperFlix tenta caminho /anime fornecido por seu painel, sem mudar as demais fontes',()=>{
 const html=render(1);
 assert.match(html,/src="https:\/\/superflixapi\.fun\/anime\/1434\/1\/1"/);
 assert.match(html,/data-action="superflixroute"/);
 assert.match(html,/Tentar série/);
 assert.match(render(1,[16],'serie'),/src="https:\/\/superflixapi\.fun\/serie\/1434\/1\/1"/);
 assert.doesNotMatch(render(1,[]),/src="https:\/\/superflixapi\.fun\/anime\/1434/);
});
test('anuncios via popup apenas no iframe SuperFlix, sem navegacao do topo por permissao explicita',()=>{
 const html=render(1);
 assert.match(html,/src="https:\/\/superflixapi\.fun\/anime\/1434\/1\/1"[^>]*sandbox="[^"]*allow-popups"/);
 assert.doesNotMatch(html,/allow-top-navigation/);
 const primary=render(0);
 assert.match(primary,/src="https:\/\/myembed\.biz\/serie\/1434\/1\/1"[^>]*sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"/);
 const third=render(2);
 assert.match(third,/src="https:\/\/vidsrc\.mov\/embed\/tv\/1434\/1\/1"/);
});
test('origem do provider permanece validada, inclusive para /anime',()=>{
 assert.equal(runInNewContext(`${isolated}\nvalidEmbedOption({provider:'superflix',url:'https://superflixapi.fun/anime/1434/1/1'})`,{URL}),true);
 for(const bad of ['https://superflixapi.fun.evil.invalid/anime/1434/1/1','https://superflixapi.fun/anime/1434/1/1?q=x','http://superflixapi.fun/anime/1434/1/1']){
  assert.equal(runInNewContext(`${isolated}\nvalidEmbedOption({provider:'superflix',url:${JSON.stringify(bad)}})`,{URL}),false);
 }
});
