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
 {provider:'vidsrc',label:'Alternativo',url:spoof?'https://unsafe.invalid/embed/movie/969681':'https://vidsrc.mov/embed/movie/969681'}];
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
test('VidSrc tem exceção de sandbox por domínio validado e sem consultas adicionais',()=>{
 const html=render(1);assert.match(html,/src="https:\/\/vidsrc\.mov\/embed\/movie\/969681"/);
 assert.doesNotMatch(html,/src="https:\/\/vidsrc\.mov\/embed\/movie\/969681"[^>]*sandbox=/);assert.match(html,/id="player-provider-select"/);
});
test('Domínios suspeitos nunca são liberados como iframe',()=>{
 const html=render(1,true);assert.doesNotMatch(html,/unsafe\.invalid/);assert.match(html,/src="https:\/\/myembed\.biz/);
 assert.equal(runInNewContext(`${security}\nvalidEmbedOption({provider:'vidsrc',url:'https://vidsrc.mov.evil.test/embed/movie/123'})`,{URL}),false);
 assert.equal(runInNewContext(`${security}\nvalidEmbedOption({provider:'vidsrc',url:'https://vidsrc.mov/embed/movie/123?redirect=https://evil.test'})`,{URL}),false);
});
test('CSP não permite terceiros arbitrários e não contém SuperEmbed',()=>{
 assert.match(headers,/frame-src.*https:\/\/myembed\.biz.*https:\/\/vidsrc\.mov.*https:\/\/superflixapi\.fun/);
 assert.doesNotMatch(headers,/frame-src\s+\*/);assert.doesNotMatch(headers,/multiembed|superembed|streamingnow/i);
});

test('SuperFlix nao aceita hosts falsos, caminho invalido, consultas ou HTTP',()=>{
 const safe={URL};
 assert.equal(runInNewContext(`${security}\nvalidEmbedOption({provider:'superflix',url:'https://superflixapi.fun/filme/969681'})`,safe),true);
 assert.equal(runInNewContext(`${security}\nvalidEmbedOption({provider:'superflix',url:'https://superflixapi.fun/serie/157336/1/8'})`,safe),true);
 for(const url of ['http://superflixapi.fun/filme/123', 'https://superflixapi.fun.evil.example/filme/123', 'https://superflixapi.fun/filme/123?next=https://evil.example', 'https://superflixapi.fun/serie/123/0/1']){
  assert.equal(runInNewContext(`${security}\nvalidEmbedOption({provider:'superflix',url:${JSON.stringify(url)}})`,safe),false,url);
 }
});
