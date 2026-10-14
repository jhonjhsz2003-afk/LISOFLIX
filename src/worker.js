import { DEMO } from '../public/demo.js';

const ORIGIN_TMDB = 'https://api.themoviedb.org/3';
const DAY = 86400;
const SESSION_AGE = DAY * 30;
const sections = {
  trending: ['/trending/all/week', {}],
  movies: ['/discover/movie', {sort_by:'popularity.desc', watch_region:'BR', include_adult:'false'}],
  series: ['/discover/tv', {sort_by:'popularity.desc', include_adult:'false'}],
  anime: ['/discover/tv', {with_genres:'16', with_original_language:'ja', sort_by:'popularity.desc', include_adult:'false'}],
  cartoons: ['/discover/tv', {with_genres:'16', without_original_language:'ja', sort_by:'popularity.desc', include_adult:'false'}],
  upcoming: ['/movie/upcoming', {region:'BR'}],
  airing: ['/tv/on_the_air', {}],
  topmovies: ['/movie/top_rated', {}],
  topseries: ['/tv/top_rated', {}],
  action: ['/discover/movie', {with_genres:'28', sort_by:'popularity.desc'}],
  romance: ['/discover/movie', {with_genres:'10749', sort_by:'popularity.desc'}],
  scifi: ['/discover/movie', {with_genres:'878', sort_by:'popularity.desc'}],
  family: ['/discover/movie', {with_genres:'10751', sort_by:'popularity.desc'}],
  horror: ['/discover/movie', {with_genres:'27', sort_by:'popularity.desc'}],
};

function json(data, status=200, headers={}) {
  return new Response(JSON.stringify(data), {status, headers: {
    'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff',
    'Referrer-Policy':'strict-origin-when-cross-origin', ...headers }});
}
function fail(error, status=400) { return json({error}, status); }
function b64u(bytes) { return btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,''); }
function randomId() { return crypto.randomUUID(); }
function secretToken() { return b64u(crypto.getRandomValues(new Uint8Array(32))); }
async function sha256(s) { return b64u(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))); }
async function passwordHash(password, salt) {
  const derived = await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:210000,hash:'SHA-256'}, await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']),256);
  return b64u(new Uint8Array(derived));
}
async function createHash(password) {const salt=secretToken();return `${salt}.${await passwordHash(password,salt)}`;}
async function verifyHash(password, stored) {
  if(!stored?.includes('.')) return false;
  const [salt,expected]=stored.split('.');const actual=await passwordHash(password,salt);
  const a=new TextEncoder().encode(actual),b=new TextEncoder().encode(expected);
  let diff=a.length^b.length;
  for(let i=0;i<Math.max(a.length,b.length);i++) diff|=(a[i]||0)^(b[i]||0);
  return diff===0;
}
function cookie(name,value,req,maxAge) {
 const secure=new URL(req.url).protocol==='https:'?'; Secure':'';
 return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=${maxAge}`;
}
function fromCookie(req,name) {const match=(req.headers.get('Cookie')||'').match(new RegExp('(?:^|;\\s*)'+name+'=([^;]*)'));return match?decodeURIComponent(match[1]):null;}
function dateAfter(seconds) {return new Date(Date.now()+seconds*1000).toISOString();}
async function bodyJson(req) {const body=await req.text();if(body.length>12000)throw Error('Requisição muito grande.');return JSON.parse(body||'{}');}
async function session(req, env) {
 if(!env.DB)return null;
 const token=fromCookie(req,'lisoflix_session');if(!token)return null;
 return await env.DB.prepare(`SELECT s.user_id,s.profile_id,u.email FROM sessions s JOIN users u ON u.id=s.user_id
 WHERE s.id_hash=? AND s.expires_at>?`).bind(await sha256(token),new Date().toISOString()).first();
}
function profileSafe(p) {return {id:p.id,name:p.name,avatar:p.avatar,isKids:!!p.is_kids,locked:!!p.pin_hash};}
async function profiles(env,userId) {return (await env.DB.prepare('SELECT * FROM profiles WHERE user_id=? ORDER BY created_at').bind(userId).all()).results.map(profileSafe);}
async function authResponse(env,req,userId,profileId=null) {
 const token=secretToken();const hash=await sha256(token);
 await env.DB.prepare('INSERT INTO sessions (id_hash,user_id,profile_id,expires_at) VALUES (?,?,?,?)').bind(hash,userId,profileId,dateAfter(SESSION_AGE)).run();
 const u=await env.DB.prepare('SELECT email FROM users WHERE id=?').bind(userId).first();
 return json({user:{email:u.email},profiles:await profiles(env,userId),activeProfile:profileId},200,{'Set-Cookie':cookie('lisoflix_session',token,req,SESSION_AGE)});
}
function safeMedia(type,id) {return ['movie','tv'].includes(type)&&Number.isSafeInteger(+id)&&+id>0&&+id<100000000;}
function cleanSnapshot(o,type,id) {return JSON.stringify({id:+id,media_type:type,title:String(o?.title||o?.name||'').slice(0,120),name:String(o?.name||o?.title||'').slice(0,120),poster_path: /^\/[a-zA-Z0-9]+\.(jpg|png|webp)$/.test(o?.poster_path||'')?o.poster_path:null,backdrop_path:/^\/[a-zA-Z0-9]+\.(jpg|png|webp)$/.test(o?.backdrop_path||'')?o.backdrop_path:null,vote_average:Number(o?.vote_average)||0,overview:String(o?.overview||'').slice(0,700),genre_ids:Array.isArray(o?.genre_ids)?o.genre_ids.slice(0,10):[],first_air_date:String(o?.first_air_date||'').slice(0,10),release_date:String(o?.release_date||'').slice(0,10)});}
async function tmdb(env,path,params={},cacheSeconds=900) {
 if(!tmdbReady(env)) throw Error('TMDB_NOT_CONFIGURED');
 const u=new URL(ORIGIN_TMDB+path);
 const q={language:'pt-BR',...params};for(const [k,v]of Object.entries(q))u.searchParams.set(k,String(v));
 // TMDB aceita a chave v3 (Secret TMDB_API_KEY) ou o token v4 (TMDB_BEARER_TOKEN).
 if(env.TMDB_API_KEY) u.searchParams.set('api_key',env.TMDB_API_KEY);
 const headers={Accept:'application/json'};
 if(!env.TMDB_API_KEY && env.TMDB_BEARER_TOKEN) headers.Authorization=`Bearer ${env.TMDB_BEARER_TOKEN}`;
 const r=await fetch(u.toString(),{headers,cf:{cacheTtl:cacheSeconds,cacheEverything:true}});
 if(!r.ok)throw Error(`TMDB respondeu ${r.status}`);
 return r.json();
}
function tmdbReady(env) {return !!(env.TMDB_API_KEY||env.TMDB_BEARER_TOKEN);}
function typeFromSection(sec) {return ['movies','upcoming','topmovies','action','romance','scifi','family','horror'].includes(sec)?'movie':'tv';}
function demoSection(sec,page=1) {
 let arr=DEMO;
 if(['movies','topmovies','upcoming','action','romance','scifi','family','horror'].includes(sec))arr=DEMO.filter(x=>x.media_type==='movie');
 if(['series','topseries','airing'].includes(sec))arr=DEMO.filter(x=>x.media_type==='tv');
 if(sec==='anime')arr=DEMO.filter(x=>x.media_type==='tv'&&x.genre_ids.includes(16));
 if(sec==='cartoons')arr=DEMO.filter(x=>x.media_type==='tv'&&x.genre_ids.includes(16));
 return {results: page===1?arr:[],page,total_pages:1,demo:true,updatedAt:new Date().toISOString()};
}
async function catalog(env,sec,page=1,force=false) {
 if(!sections[sec])throw Error('Seção inválida');
 if(!tmdbReady(env))return demoSection(sec,page);
 if(!force&&env.DB){const cached=await env.DB.prepare('SELECT payload,expires_at FROM catalog_cache WHERE section=? AND page=?').bind(sec,page).first();if(cached?.expires_at>Date.now())return JSON.parse(cached.payload);}
 const [path,opts]=sections[sec];const payload=await tmdb(env,path,{...opts,page},600);
 const type=typeFromSection(sec);
 const results=(payload.results||[]).filter(x=>x.media_type!=='person'&&!x.adult&&!!(x.poster_path||x.backdrop_path)).map(x=>({...x,media_type:x.media_type||type}));
 const data={results,page:payload.page,total_pages:payload.total_pages,demo:false,updatedAt:new Date().toISOString()};
 if(env.DB)await env.DB.prepare('INSERT INTO catalog_cache(section,page,payload,expires_at) VALUES (?,?,?,?) ON CONFLICT(section,page) DO UPDATE SET payload=excluded.payload,expires_at=excluded.expires_at').bind(sec,page,JSON.stringify(data),Date.now()+600000).run();
 return data;
}
function validatedAvatar(input) {return input===''||/^[a-zA-Z0-9_-]+\.(png|webp|jpe?g|gif)$/i.test(input||'') ? input : null;}
const isMutating=req=>['POST','PUT','PATCH','DELETE'].includes(req.method);
async function handle(req,env) {
 const url=new URL(req.url);const path=url.pathname;const method=req.method;
 if(isMutating(req)) {
  const origin=req.headers.get('Origin');
  if(origin&&origin!==url.origin)return fail('Origem não autorizada.',403);
  if(!req.headers.get('Content-Type')?.startsWith('application/json'))return fail('Use application/json.',415);
 }
 if(path==='/api/config'&&method==='GET')return json({tmdb:!!tmdbReady(env),embeds:env.ENABLE_EXTERNAL_EMBEDS==='true',version:'1.0.0'});
 if(path==='/api/health'&&method==='GET')return json({status:'ok',database:!!env.DB,tmdb:!!tmdbReady(env),time:new Date().toISOString()});
 if(path==='/api/catalog'&&method==='GET'){
  const sec=url.searchParams.get('section')||'trending',page=Math.max(1,Math.min(5,Number(url.searchParams.get('page'))||1));
  return json(await catalog(env,sec,page));
 }
 if(path==='/api/discover'&&method==='GET') {
  const type=url.searchParams.get('type')==='movie'?'movie':'tv';
  const lang=(url.searchParams.get('lang')||'en').toLowerCase();
  if(!/^[a-z]{2}$/.test(lang))return fail('Idioma inválido.');
  if(!tmdbReady(env))return json({results:DEMO.filter(x=>x.media_type===type),demo:true});
  const d=await tmdb(env,`/discover/${type}`,{with_original_language:lang,sort_by:'popularity.desc',include_adult:'false',page:Math.max(1,Math.min(5,+url.searchParams.get('page')||1))},600);
  return json({results:(d.results||[]).filter(x=>x.poster_path).map(x=>({...x,media_type:type})),demo:false});
 }
 if(path==='/api/search'&&method==='GET') {
  const q=(url.searchParams.get('q')||'').trim().slice(0,100);
  if(q.length<2)return json({results:[],demo:!tmdbReady(env)});
  if(!tmdbReady(env))return json({results:DEMO.filter(x=>(x.name||x.title).toLocaleLowerCase('pt-BR').includes(q.toLocaleLowerCase('pt-BR'))),demo:true});
  const result=await tmdb(env,'/search/multi',{query:q,include_adult:'false',page:1},150);
  return json({results:(result.results||[]).filter(x=>['tv','movie'].includes(x.media_type)&&x.poster_path),demo:false});
 }
 if(path==='/api/detail'&&method==='GET') {
  const type=url.searchParams.get('type'),id=url.searchParams.get('id');if(!safeMedia(type,id))return fail('Título inválido');
  if(!tmdbReady(env)){const found=DEMO.find(x=>x.id===+id&&x.media_type===type);if(!found)return fail('Título fora do catálogo de demonstração',404);return json({...found,seasons:type==='tv'?[{season_number:1,episode_count:10,name:'Temporada 1'}]:[],recommendations:{results:DEMO.filter(x=>x.id!==+id)},videos:{results:[]},credits:{cast:[]},demo:true});}
  return json(await tmdb(env,`/${type}/${+id}`,{append_to_response:'videos,recommendations,similar,credits',include_video_language:'pt-BR,en-US,null'},600));
 }
 if(path==='/api/season'&&method==='GET'){
  const id=+url.searchParams.get('id'),season=+url.searchParams.get('season');if(!Number.isSafeInteger(id)||id<1||!Number.isInteger(season)||season<0||season>100)return fail('Temporada inválida');
  if(!tmdbReady(env))return json({season_number:season,episodes:[],demo:true});
  return json(await tmdb(env,`/tv/${id}/season/${season}`,{},900));
 }
 if(path==='/api/collection'&&method==='GET'){
  const id=+url.searchParams.get('id');if(!Number.isSafeInteger(id)||id<1)return fail('Coleção inválida');
  if(!tmdbReady(env))return json({parts:[],demo:true});
  return json(await tmdb(env,`/collection/${id}`,{},1800));
 }
 if(path==='/api/auth/register'&&method==='POST'){
  if(!env.DB)return fail('Configure o D1 para criar contas.',503);
  const b=await bodyJson(req),email=String(b.email||'').trim().toLowerCase(),pw=String(b.password||'');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>180)return fail('E-mail inválido.');
  if(pw.length<10||pw.length>128)return fail('Use uma senha de 10 a 128 caracteres.');
  const exists=await env.DB.prepare('SELECT id FROM users WHERE email=?').bind(email).first();if(exists)return fail('Já existe uma conta com esse e-mail.',409);
  const id=randomId(),profileId=randomId();
  await env.DB.batch([
   env.DB.prepare('INSERT INTO users(id,email,password_hash) VALUES(?,?,?)').bind(id,email,await createHash(pw)),
   env.DB.prepare('INSERT INTO profiles(id,user_id,name) VALUES(?,?,?)').bind(profileId,id,String(b.name||'Meu perfil').trim().slice(0,24)||'Meu perfil')
  ]);
  return await authResponse(env,req,id,profileId);
 }
 if(path==='/api/auth/login'&&method==='POST'){
  if(!env.DB)return fail('Configure o D1 para entrar.',503);
  const b=await bodyJson(req),email=String(b.email||'').toLowerCase().trim();
  if(email.length>180||String(b.password||'').length>128)return fail('E-mail ou senha incorretos.',401);
  const emailHash=await sha256(email);
  const guard=await env.DB.prepare('SELECT attempts,blocked_until FROM login_guards WHERE email_hash=?').bind(emailHash).first();
  if(guard?.blocked_until>Date.now())return fail('Muitas tentativas. Aguarde 15 minutos e tente novamente.',429);
  const u=await env.DB.prepare('SELECT id,password_hash FROM users WHERE email=?').bind(email).first();
  if(!u?.password_hash||!await verifyHash(String(b.password||''),u.password_hash)){
   const attempts=(guard?.blocked_until<Date.now()?0:(guard?.attempts||0))+1;
   await env.DB.prepare(`INSERT INTO login_guards(email_hash,attempts,blocked_until) VALUES(?,?,?)
    ON CONFLICT(email_hash) DO UPDATE SET attempts=excluded.attempts,blocked_until=excluded.blocked_until`)
    .bind(emailHash, attempts>=8?0:attempts, attempts>=8?Date.now()+15*60*1000:0).run();
   return fail('E-mail ou senha incorretos.',401);
  }
  await env.DB.prepare('DELETE FROM login_guards WHERE email_hash=?').bind(emailHash).run();
  return await authResponse(env,req,u.id);
 }
 if(path==='/api/comments'&&method==='GET'){
  const type=url.searchParams.get('type'),id=url.searchParams.get('id');if(!safeMedia(type,id))return fail('Título inválido.');
  if(!env.DB)return json({comments:[]});
  const rows=await env.DB.prepare(`SELECT c.id,c.content,c.created_at,p.name,p.avatar FROM comments c
   JOIN profiles p ON p.id=c.profile_id WHERE c.media_type=? AND c.media_id=?
   ORDER BY c.created_at DESC LIMIT 80`).bind(type,+id).all();
  return json({comments:rows.results});
 }
 const s=await session(req,env);
 if(path==='/api/auth/me'&&method==='GET') {
  if(!s)return json({user:null,profiles:[],activeProfile:null});
  return json({user:{email:s.email},profiles:await profiles(env,s.user_id),activeProfile:s.profile_id});
 }
 if(path==='/api/auth/logout'&&method==='POST') {
  const token=fromCookie(req,'lisoflix_session');if(token&&env.DB)await env.DB.prepare('DELETE FROM sessions WHERE id_hash=?').bind(await sha256(token)).run();
  return json({ok:true},200,{'Set-Cookie':cookie('lisoflix_session','',req,0)});
 }
 if(!s)return fail('Entre na sua conta para continuar.',401);
 if(path==='/api/profiles'&&method==='GET')return json({profiles:await profiles(env,s.user_id),activeProfile:s.profile_id});
 if(path==='/api/profiles'&&method==='POST'){
  const count=await env.DB.prepare('SELECT COUNT(*) n FROM profiles WHERE user_id=?').bind(s.user_id).first();if(count.n>=5)return fail('Limite de 5 perfis.',409);
  const b=await bodyJson(req),name=String(b.name||'').trim().slice(0,24),avatar=validatedAvatar(b.avatar||'');if(!name||avatar===null)return fail('Nome ou avatar inválido.');
  const id=randomId();await env.DB.prepare('INSERT INTO profiles(id,user_id,name,avatar,is_kids,pin_hash) VALUES(?,?,?,?,?,?)').bind(id,s.user_id,name,avatar,b.isKids?1:0,b.pin&&/^\d{4,8}$/.test(b.pin)?await createHash(b.pin):null).run();
  return json({ok:true,profiles:await profiles(env,s.user_id)});
 }
 if(path==='/api/profiles/select'&&method==='POST'){
  const b=await bodyJson(req),p=await env.DB.prepare('SELECT * FROM profiles WHERE id=? AND user_id=?').bind(String(b.id||''),s.user_id).first();if(!p)return fail('Perfil não encontrado.',404);
  if(p.pin_hash&&!await verifyHash(String(b.pin||''),p.pin_hash))return fail('PIN incorreto.',403);
  const token=fromCookie(req,'lisoflix_session');await env.DB.prepare('UPDATE sessions SET profile_id=? WHERE id_hash=?').bind(p.id,await sha256(token)).run();return json({ok:true,activeProfile:p.id});
 }
 if(path==='/api/profiles/update'&&method==='POST'){
  const b=await bodyJson(req),p=await env.DB.prepare('SELECT * FROM profiles WHERE id=? AND user_id=?').bind(String(b.id||''),s.user_id).first();if(!p)return fail('Perfil não encontrado.',404);
  if(p.pin_hash&&!await verifyHash(String(b.currentPin||''),p.pin_hash))return fail('PIN atual incorreto.',403);
  const avatar=validatedAvatar(b.avatar??p.avatar),name=String(b.name??p.name).trim().slice(0,24);if(!name||avatar===null)return fail('Nome ou avatar inválido.');
  let hash=p.pin_hash;
  if(b.removePin)hash=null;
  else if(b.newPin){if(!/^\d{4,8}$/.test(String(b.newPin)))return fail('O PIN precisa ter de 4 a 8 dígitos.');hash=await createHash(String(b.newPin));}
  await env.DB.prepare('UPDATE profiles SET name=?,avatar=?,is_kids=?,pin_hash=? WHERE id=?').bind(name,avatar,b.isKids?1:0,hash,p.id).run();return json({ok:true,profiles:await profiles(env,s.user_id)});
 }
 if(path==='/api/profiles/delete'&&method==='POST'){
  const b=await bodyJson(req),p=await env.DB.prepare('SELECT * FROM profiles WHERE id=? AND user_id=?').bind(String(b.id||''),s.user_id).first();if(!p)return fail('Perfil não encontrado.',404);
  if(p.pin_hash&&!await verifyHash(String(b.pin||''),p.pin_hash))return fail('PIN incorreto.',403);
  const count=await env.DB.prepare('SELECT COUNT(*) n FROM profiles WHERE user_id=?').bind(s.user_id).first();if(count.n<=1)return fail('Mantenha ao menos um perfil.',409);
  await env.DB.prepare('UPDATE sessions SET profile_id=NULL WHERE profile_id=?').bind(p.id).run();await env.DB.prepare('DELETE FROM profiles WHERE id=?').bind(p.id).run();return json({ok:true});
 }
 if(!s.profile_id)return fail('Selecione um perfil.',403);
 const owned=await env.DB.prepare('SELECT id,is_kids FROM profiles WHERE id=? AND user_id=?').bind(s.profile_id,s.user_id).first();if(!owned)return fail('Perfil inválido.',403);
 if(path==='/api/library'&&method==='GET'){
  const [a,b]=await Promise.all([env.DB.prepare('SELECT media_type,media_id,payload FROM my_list WHERE profile_id=? ORDER BY created_at DESC LIMIT 100').bind(s.profile_id).all(),env.DB.prepare('SELECT media_type,media_id,season,episode,payload,updated_at FROM watching WHERE profile_id=? ORDER BY updated_at DESC LIMIT 100').bind(s.profile_id).all()]);
  return json({list:a.results.map(x=>({...JSON.parse(x.payload),media_type:x.media_type,id:x.media_id})),watching:b.results.map(x=>({...JSON.parse(x.payload),media_type:x.media_type,id:x.media_id,season:x.season,episode:x.episode,updated_at:x.updated_at}))});
 }
 if(path==='/api/library/toggle'&&method==='POST'){
  const b=await bodyJson(req);if(!safeMedia(b.type,b.id))return fail('Título inválido.');
  const existing=await env.DB.prepare('SELECT media_id FROM my_list WHERE profile_id=? AND media_type=? AND media_id=?').bind(s.profile_id,b.type,+b.id).first();
  if(existing)await env.DB.prepare('DELETE FROM my_list WHERE profile_id=? AND media_type=? AND media_id=?').bind(s.profile_id,b.type,+b.id).run();
  else await env.DB.prepare('INSERT INTO my_list(profile_id,media_type,media_id,payload) VALUES(?,?,?,?)').bind(s.profile_id,b.type,+b.id,cleanSnapshot(b.snapshot,b.type,b.id)).run();
  return json({saved:!existing});
 }
 if(path==='/api/watch'&&method==='POST'){
  const b=await bodyJson(req);if(!safeMedia(b.type,b.id))return fail('Título inválido.');
  const season=Math.max(0,Math.min(100,Number(b.season)||0)),episode=Math.max(0,Math.min(2000,Number(b.episode)||0));
  await env.DB.prepare(`INSERT INTO watching(profile_id,media_type,media_id,season,episode,payload,updated_at) VALUES(?,?,?,?,?,?,datetime('now'))
    ON CONFLICT(profile_id,media_type,media_id) DO UPDATE SET season=excluded.season,episode=excluded.episode,payload=excluded.payload,updated_at=datetime('now')`).bind(s.profile_id,b.type,+b.id,season,episode,cleanSnapshot(b.snapshot,b.type,b.id)).run();return json({ok:true});
 }
 if(path==='/api/comments'&&method==='POST'){
  const b=await bodyJson(req),content=String(b.content||'').trim();if(!safeMedia(b.type,b.id)||content.length<2||content.length>500)return fail('Comentário precisa ter de 2 a 500 caracteres.');
  const last=await env.DB.prepare('SELECT created_at FROM comments WHERE profile_id=? ORDER BY created_at DESC LIMIT 1').bind(s.profile_id).first();
  if(last&&Date.now()-Date.parse(last.created_at.replace(' ','T')+'Z')<12000)return fail('Aguarde alguns segundos para comentar novamente.',429);
  await env.DB.prepare('INSERT INTO comments(id,profile_id,media_type,media_id,content) VALUES(?,?,?,?,?)').bind(randomId(),s.profile_id,b.type,+b.id,content).run();return json({ok:true},201);
 }
 return fail('Rota não encontrada.',404);
}
export default {
 async fetch(req,env,ctx){
  try {
   const url=new URL(req.url);
   if(url.pathname.startsWith('/api/'))return await handle(req,env);
   return env.ASSETS.fetch(req);
  } catch(e) {
   console.error('LISOFLIX API:',e?.message||e);
   const msg=e?.message||'Falha inesperada';
   return fail(msg==='TMDB_NOT_CONFIGURED'?'Configure a chave do TMDB.':msg,500);
  }
 },
 async scheduled(event,env,ctx){
  if(!env.DB)return;
  ctx.waitUntil((async()=>{
   await env.DB.prepare('DELETE FROM sessions WHERE expires_at<?').bind(new Date().toISOString()).run();
   await env.DB.prepare('DELETE FROM login_guards WHERE blocked_until<? AND attempts=0').bind(Date.now()-86400000).run();
   if(!tmdbReady(env))return;
   for(const sec of ['trending','upcoming','airing','anime','movies','series']){
    try{await catalog(env,sec,1,true);}catch(e){console.error('refresh',sec,e?.message);}
   }
  })());
 }
};
