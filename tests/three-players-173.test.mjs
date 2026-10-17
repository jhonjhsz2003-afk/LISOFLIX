import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {runInNewContext} from 'node:vm';
import app from '../src/worker.js';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const vars=JSON.parse(read('wrangler.jsonc')).vars;
function mock(){const sqlite=new DatabaseSync(':memory:');sqlite.exec(read('schema.sql'));return {sqlite,DB:{prepare(sql){let args=[];return {bind(...a){args=a;return this},first(){return sqlite.prepare(sql).get(...args)||null},all(){return {results:sqlite.prepare(sql).all(...args)}},run(){return sqlite.prepare(sql).run(...args)}}}}};}
async function api(DB,url){const r=await app.fetch(new Request('https://site.example'+url),{DB,...vars,ASSETS:{fetch:()=>new Response('ok')}},{});return {status:r.status,data:await r.json()};}
test('as tres opcoes vem da API em ordem: EmbedMovies, SuperFlixAPI e VidSrc',async()=>{
 const {DB}=mock();const c=(await api(DB,'/api/config')).data;
 assert.equal(c.version,'1.7.3'); assert.deepEqual(c.fallbackPlayers,['superflix','vidsrc']);
 for(const [url,expected] of [
  ['/api/playback?type=movie&id=969681',['https://myembed.biz/filme/969681','https://superflixapi.fun/filme/969681','https://vidsrc.mov/embed/movie/969681']],
  ['/api/playback?type=tv&id=1396&season=2&episode=3',['https://myembed.biz/serie/1396/2/3','https://superflixapi.fun/serie/1396/2/3','https://vidsrc.mov/embed/tv/1396/2/3']]
 ]) {const r=(await api(DB,url)).data;assert.deepEqual(r.players.map(p=>p.url),expected);assert.ok(r.players.every(p=>p.availabilityVerified===false));}
});
test('um bloqueio no banco continua bloqueando todos os players',async()=>{
 const {DB,sqlite}=mock();sqlite.prepare("INSERT INTO playback_embeds(media_type,media_id,provider,enabled) VALUES('movie',969681,'embedmovies',0)").run();
 assert.deepEqual((await api(DB,'/api/playback?type=movie&id=969681')).data,{available:false,reason:'source-disabled'});
});
test('seletor e próximo player aparecem apenas com mais de uma fonte, e iframe usa host validado',()=>{
 const ui=read('public/app.js'),start=ui.indexOf('function validEmbedOption(p){'),end=ui.indexOf('function trailerModal(){');const isolated=ui.slice(start,end);
 const frame=(provider,url)=>runInNewContext(`${isolated}
playerModal();`,{URL,state:{detail:{title:'Teste'},playerEpisode:null,playerOptionIndex:provider,playback:{available:true,mode:'iframe',players:[{provider:'embedmovies',label:'EmbedMovies',url:'https://myembed.biz/filme/969681'},{provider:'superflix',label:'SuperFlixAPI',url:'https://superflixapi.fun/filme/969681'},{provider:'vidsrc',label:'VidSrc',url:url||'https://vidsrc.mov/embed/movie/969681'}]}},esc:v=>String(v),icon:()=>'',title:x=>x.title,dVideo:()=>null,pics:()=>''});
 const primary=frame(0);assert.match(primary,/data-action="switchplayer"/);assert.match(primary,/id="player-provider-select"/);assert.match(primary,/VidSrc/);
 assert.match(frame(1),/src="https:\/\/superflixapi.fun\/filme\/969681"[^>]*sandbox=/);
 assert.match(frame(2),/src="https:\/\/vidsrc.mov\/embed\/movie\/969681"[^>]*referrerpolicy="no-referrer"/);
 assert.doesNotMatch(frame(2),/src="https:\/\/vidsrc.mov\/embed\/movie\/969681"[^>]*sandbox=/);
 assert.doesNotMatch(frame(2,'https://vidsrc.mov.evil.site/embed/movie/969681'),/vidsrc.mov.evil.site/);
});
