import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const ui=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const headers=readFileSync(new URL('../public/_headers',import.meta.url),'utf8');
const fnValid=ui.match(/function validEmbedOption\(p\)\{[^\n]*\}/)?.[0];
const fnSandbox=ui.match(/function embedSandboxAttr\(p\)\{[^\n]*\}/)?.[0];
const player=ui.match(/function playerModal\(\)\{[\s\S]*?\n\}\n\nfunction trailerModal/)?.[0].replace(/\n\nfunction trailerModal$/,'');
assert.ok(fnValid&&fnSandbox&&player,'Player security helpers must be present');
const funcs=fnValid+'\n'+fnSandbox;

function render(provider,choice){
 const players=[
  {provider:'embedmovies',url:'https://myembed.biz/filme/969681'},
  {provider:'superembed',url:'https://multiembed.mov/?video_id=969681&tmdb=1'},
 ];
 if(provider==='spoof')players[1]={provider:'superembed',url:'https://external.invalid/?video_id=969681'};
 return runInNewContext(`${funcs}\n${player}\nplayerModal();`,{
  state:{detail:{id:969681,title:'Homem-Aranha: Um Novo Dia'},playerEpisode:null,
    playback:{available:true,mode:'iframe',players},playerOptionIndex:choice},
  title:d=>d.title,esc:v=>String(v),icon:()=>'',dVideo:()=>null,pics:()=>null,
 });
}

test('Player 1 EmbedMovies mantém sandbox sem permitir popups',()=>{
 const html=render('embedmovies',0);
 assert.match(html,/<iframe[^>]+src="https:\/\/myembed\.biz\/filme\/969681"[^>]+sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"/);
 assert.doesNotMatch(html,/allow-popups/);
});
test('Player 2 SuperEmbed permite incorporação sem atributo sandbox',()=>{
 const html=render('superembed',1);
 assert.match(html,/<iframe[^>]+src="https:\/\/multiembed\.mov\/\?video_id=969681&tmdb=1"/);
 assert.doesNotMatch(html,/<iframe[^>]+sandbox=/);
 assert.match(html,/Trocar player/);
});
test('Domínios desconhecidos não desativam o sandbox nem aparecem como player',()=>{
 const html=render('spoof',1);
 assert.doesNotMatch(html,/external\.invalid/);
 assert.match(html,/myembed\.biz/);
 assert.doesNotMatch(html,/Player 2\/2/);
 assert.match(runInNewContext(`${funcs}\nembedSandboxAttr({provider:'superembed',url:'https://evil.test/'})`),/sandbox=/);
});
test('Apenas domínios previstos na CSP, nunca frame-src liberado a qualquer origem',()=>{
 assert.match(headers,/frame-src.*https:\/\/myembed\.biz.*https:\/\/multiembed\.mov/);
 assert.doesNotMatch(headers,/frame-src\s+\*/);
 assert.match(ui,/src="https:\/\/www\.youtube-nocookie\.com\/embed\//);
 assert.match(ui,/sandbox="allow-scripts allow-same-origin allow-presentation"/);
});
