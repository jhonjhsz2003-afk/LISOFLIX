import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const ui=read('public/app.js');
const isolated=ui.slice(ui.indexOf('function validEmbedOption(p){'),ui.indexOf('function trailerModal(){'));
function render(provider,url){
 return runInNewContext(`${isolated}\nplayerModal();`,{
  URL,state:{detail:{title:'Teste'},playerEpisode:null,playerOptionIndex:0,playback:{available:true,mode:'iframe',players:[{provider,url,label:'teste'}]}},
  esc:v=>String(v),icon:()=>'',title:d=>d.title,dVideo:()=>null,pics:()=>''
 });
}
test('WarezCDN aprovado usa formato oficial: sem sandbox, permissões de iframe e rota exata',()=>{
 const html=render('warezcdn','https://warezcdn.sbs/serie/1434/1/1');
 assert.match(html,/src="https:\/\/warezcdn\.sbs\/serie\/1434\/1\/1"/);
 assert.doesNotMatch(html,/src="https:\/\/warezcdn\.sbs\/serie\/1434\/1\/1"[^>]*sandbox=/);
 assert.match(html,/allow="[^"]*clipboard-write/);
 assert.match(html,/referrerpolicy="strict-origin-when-cross-origin"/);
});
test('exceção de sandbox não atinge EmbedMovies nem URLs parecidas fraudulentas',()=>{
 const embedded=render('embedmovies','https://myembed.biz/filme/969681');
 assert.match(embedded,/src="https:\/\/myembed\.biz\/filme\/969681"[^>]*sandbox=/);
 const spoof=render('warezcdn','https://warezcdn.sbs.evil.invalid/serie/1434/1/1');
 assert.doesNotMatch(spoof,/warezcdn\.sbs\.evil/);
 assert.equal(runInNewContext(`${isolated}\nvalidEmbedOption({provider:'warezcdn',url:'https://warezcdn.sbs/serie/1434/1/1?x=1'})`,{URL}),false);
});
