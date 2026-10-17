import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import app from '../src/worker.js';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
function mock(){const s=new DatabaseSync(':memory:');s.exec(read('schema.sql'));return {sqlite:s,DB:{prepare(sql){let args=[];const o={bind(...x){args=x;return o},first(){return s.prepare(sql).get(...args)||null},all(){return {results:s.prepare(sql).all(...args)}},run(){return s.prepare(sql).run(...args)}};return o}}};}
const opts={ENABLE_EXTERNAL_EMBEDS:'true',ENABLE_EMBEDMOVIES_AUTOMATIC:'true',ENABLE_VIDSRC_FALLBACK:'true',ENABLE_SUPERFLIX_FALLBACK:'false'};
async function get(DB,endpoint,flags={}){const res=await app.fetch(new Request('https://lisoflix.test'+endpoint),{DB,ASSETS:{fetch:()=>new Response('ok')},...flags},{});return {status:res.status,value:await res.json()};}
test('fallback opt-in: player primario continua EmbedMovies e sem a flag so existe uma opcao',async()=>{
 const {DB}=mock();const path='/api/playback?type=movie&id=399566';
 const off=(await get(DB,path,{...opts,ENABLE_VIDSRC_FALLBACK:'false'})).value;
 assert.equal(off.url,'https://myembed.biz/filme/399566');
 assert.deepEqual(off.players.map(p=>p.provider),['embedmovies']);
 const on=(await get(DB,path,opts)).value;
 assert.equal(on.available,true);assert.equal(on.url,off.url);
 assert.equal(on.availabilityVerified,false);
 assert.deepEqual(on.players.map(p=>p.provider),['embedmovies','vidsrc']);
 assert.equal(on.players[1].url,'https://vidsrc.mov/embed/movie/399566');
 assert.equal(on.players[1].availabilityVerified,false);
});
test('cadastro explicito oferece fallback mesmo com descoberta automatica desligada',async()=>{
 const {DB,sqlite}=mock();
 sqlite.prepare("INSERT INTO playback_embeds(media_type,media_id,provider,mode) VALUES('movie',399566,'embedmovies','standard')").run();
 const r=(await get(DB,'/api/playback?type=movie&id=399566',{...opts,ENABLE_EMBEDMOVIES_AUTOMATIC:'false'})).value;
 assert.deepEqual(r.players.map(p=>p.provider),['embedmovies','vidsrc']);
 const missing=(await get(DB,'/api/playback?type=movie&id=99999',{...opts,ENABLE_EMBEDMOVIES_AUTOMATIC:'false'})).value;
 assert.equal(missing.available,false);
});
test('episódios usam temporada e episódio exatos no player secundário sem alterar o primário',async()=>{
 const {DB}=mock();const r=(await get(DB,'/api/playback?type=tv&id=157336&season=2&episode=8',opts)).value;
 assert.equal(r.url,'https://myembed.biz/serie/157336/2/8');
 assert.equal(r.players[1].url,'https://vidsrc.mov/embed/tv/157336/2/8');
 for(const qs of ['?type=tv&id=157336&season=2&episode=0','?type=tv&id=157336&season=-1&episode=8','?type=movie&id=399566&season=1&episode=1']){
  const bad=await get(DB,'/api/playback'+qs,opts);assert.equal(bad.status,400);
 }
});
test('desativação explicita da fonte impede ambos provedores, inclusive episodio sobreposto ao geral',async()=>{
 const {DB,sqlite}=mock();
 sqlite.prepare("INSERT INTO playback_embeds(media_type,media_id,season,episode,provider,enabled) VALUES('tv',100,0,0,'embedmovies',1)").run();
 sqlite.prepare("INSERT INTO playback_embeds(media_type,media_id,season,episode,provider,enabled) VALUES('tv',100,1,4,'embedmovies',0)").run();
 assert.deepEqual((await get(DB,'/api/playback?type=tv&id=100&season=1&episode=4',opts)).value,{available:false,reason:'source-disabled'});
 assert.equal((await get(DB,'/api/playback?type=tv&id=100&season=1&episode=5',opts)).value.players.length,2);
});
test('video nativo tem prioridade sobre ambos embeds externos',async()=>{
 const {DB,sqlite}=mock();
 sqlite.prepare("INSERT INTO playback_sources(media_type,media_id,url,mime) VALUES('movie',399566,'https://video.example/clip.mp4','video/mp4')").run();
 const r=(await get(DB,'/api/playback?type=movie&id=399566',{...opts,MEDIA_ALLOWED_HOSTS:'video.example'})).value;
 assert.equal(r.mode,'native');assert.equal(r.url,'https://video.example/clip.mp4');assert.equal(r.players,undefined);
});
test('falta de permissao para embeddings não libera alternativa',async()=>{
 const {DB}=mock();const r=(await get(DB,'/api/playback?type=movie&id=399566',{...opts,ENABLE_EXTERNAL_EMBEDS:'false'})).value;
 assert.equal(r.available,false);assert.equal(r.players,undefined);
});
test('interface com troca superior, sem barras e sandbox por fornecedor',()=>{
 const ui=read('public/app.js'),css=read('public/style.css'),hdr=read('public/_headers');
 assert.match(ui,/id="player-provider-select"/);
 assert.match(ui,/case 'switchplayer'/);
 assert.match(ui,/playerOptionIndex=0/);
 assert.match(ui,/state.overlay!=='play'\|\|!overlay.querySelector\('\.player-shell'\)/);
 assert.match(ui,/id="player-provider-select"/);
 assert.doesNotMatch(ui,/class="embed-notice"/);
 assert.doesNotMatch(ui,/class="player-banner"/);
 assert.match(ui,/sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"/);
 assert.match(ui,/embedSandboxAttr\(activeEmbed\)/);
 assert.match(ui,/function validEmbedOption\(p\)/);
 assert.match(ui,/allow-popups/);assert.doesNotMatch(ui,/allow-top-navigation/);
 assert.match(css,/v1\.6\.4: player sem faixas inferiores/);
 assert.match(hdr,/frame-src.*https:\/\/vidsrc\.mov.*https:\/\/superflixapi\.fun/);
 assert.doesNotMatch(hdr,/frame-src \*/);
});
test('status informa que secundário está habilitado sem expor URLs de iframe',async()=>{
 const {DB}=mock();const v=(await get(DB,'/api/config',opts)).value;
 assert.equal(v.version,'1.7.4');assert.equal(v.secondaryPlayer,'vidsrc');
 assert.doesNotMatch(JSON.stringify(v),/vidsrc\.mov/);
 const none=(await get(DB,'/api/config',{...opts,ENABLE_VIDSRC_FALLBACK:'false'})).value;
 assert.equal(none.secondaryPlayer,null);
});

test('SuperFlix habilitado por flag aparece antes do VidSrc e sem inventar disponibilidade',async()=>{
 const {DB}=mock();const url='/api/playback?type=movie&id=969681';
 const off=(await get(DB,url,opts)).value;
 assert.deepEqual(off.players.map(p=>p.provider),['embedmovies','vidsrc']);
 const on=(await get(DB,url,{...opts,ENABLE_SUPERFLIX_FALLBACK:'true'})).value;
 assert.deepEqual(on.players.map(p=>p.provider),['embedmovies','superflix','vidsrc']);
 assert.equal(on.players[1].url,'https://superflixapi.fun/filme/969681');
 assert.equal(on.players[1].availabilityVerified,false);
 const tv=(await get(DB,'/api/playback?type=tv&id=157336&season=1&episode=9',{...opts,ENABLE_SUPERFLIX_FALLBACK:'true'})).value;
 assert.equal(tv.players[1].url,'https://superflixapi.fun/serie/157336/1/9');
});
test('SuperFlix nao pode ignorar fonte desativada no D1',async()=>{
 const {DB,sqlite}=mock();
 sqlite.prepare("INSERT INTO playback_embeds(media_type,media_id,season,episode,provider,enabled) VALUES('movie',12345,0,0,'embedmovies',0)").run();
 const r=(await get(DB,'/api/playback?type=movie&id=12345',{...opts,ENABLE_SUPERFLIX_FALLBACK:'true'})).value;
 assert.deepEqual(r,{available:false,reason:'source-disabled'});
});
test('status permite controlar as fontes individualmente sem expor dominios',async()=>{
 const {DB}=mock();
 const cfg=(await get(DB,'/api/config',{...opts,ENABLE_SUPERFLIX_FALLBACK:'true',ENABLE_VIDSRC_FALLBACK:'false'})).value;
 assert.deepEqual(cfg.fallbackPlayers,['superflix']);assert.equal(cfg.secondaryPlayer,'superflix');
 assert.doesNotMatch(JSON.stringify(cfg),/\.fun\/|\.mov\//);
});
