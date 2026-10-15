import { DEMO } from '../public/demo.js';

const ORIGIN_TMDB = 'https://api.themoviedb.org/3';
const APP_VERSION = '1.6.2';
const DAY = 86400;
const SESSION_AGE = DAY * 30;
const schemaMemo=new WeakMap();
const CORE_TABLES=['users','profiles','sessions','login_guards','comments','reactions','my_list','watching','catalog_cache','playback_sources','playback_progress','playback_embeds'];
async function databaseHealth(env) {
 if (!env.DB) return {database:false,schemaReady:false,missing:CORE_TABLES};
 const cached=schemaMemo.get(env.DB);if(cached&&Date.now()-cached.at<10000)return cached.result;
 try {const r=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();const names=new Set(r.results.map(x=>x.name));const missing=CORE_TABLES.filter(x=>!names.has(x));const result={database:true,schemaReady:missing.length===0,missing};schemaMemo.set(env.DB,{at:Date.now(),result});return result;}
 catch(e) {console.warn('D1 unavailable',e?.message);return {database:false,schemaReady:false,missing:CORE_TABLES};}
}
async function requireSchema(env) {const h=await databaseHealth(env);return h.schemaReady?null:json({error:'O banco de dados ainda não está pronto. Execute 05-CORRIGIR-D1-E-PUBLICAR.ps1 antes de criar contas.',code:'DATABASE_NOT_READY',missing:h.missing},503);}
const sections = {
  trending: ['/trending/movie/week', {}],
  trendingseries: ['/trending/tv/week', {}],
  movies: ['/discover/movie', {without_genres:'16',sort_by:'popularity.desc',include_adult:'false'}],
  series: ['/discover/tv', {without_genres:'16',sort_by:'popularity.desc',include_adult:'false'}],
  anime: ['/discover/tv', {with_genres:'16',with_original_language:'ja',sort_by:'popularity.desc',include_adult:'false'}],
  animenew: ['/discover/tv', {with_genres:'16',with_original_language:'ja',sort_by:'first_air_date.desc',include_adult:'false'}],
  animefilms: ['/discover/movie', {with_genres:'16',with_original_language:'ja',sort_by:'popularity.desc',include_adult:'false'}],
  cartoons: ['/discover/tv', {with_genres:'16',without_original_language:'ja',sort_by:'popularity.desc',include_adult:'false'}],
  cartoonnew: ['/discover/tv', {with_genres:'16',without_original_language:'ja',sort_by:'first_air_date.desc',include_adult:'false'}],
  cartoonfilms: ['/discover/movie', {with_genres:'16',without_original_language:'ja',sort_by:'popularity.desc',include_adult:'false'}],
  dorama: ['/discover/tv', {with_original_language:'ko',without_genres:'16',sort_by:'popularity.desc',include_adult:'false'}],
  scifiseries: ['/discover/tv', {with_genres:'10765',without_genres:'16',sort_by:'popularity.desc',include_adult:'false'}],
  crimeseries: ['/discover/tv', {with_genres:'80',without_genres:'16',sort_by:'popularity.desc',include_adult:'false'}],
  upcoming: ['/movie/upcoming', {region:'BR'}],
  airing: ['/tv/on_the_air', {}],
  topmovies: ['/discover/movie', {without_genres:'16',sort_by:'vote_average.desc','vote_count.gte':350,include_adult:'false'}],
  topseries: ['/discover/tv', {without_genres:'16',sort_by:'vote_average.desc','vote_count.gte':200,include_adult:'false'}],
  action: ['/discover/movie', {with_genres:'28',sort_by:'popularity.desc'}],
  romance: ['/discover/movie', {with_genres:'10749',sort_by:'popularity.desc'}],
  scifi: ['/discover/movie', {with_genres:'878',sort_by:'popularity.desc'}],
  family: ['/discover/movie', {with_genres:'10751',without_genres:'16',sort_by:'popularity.desc'}],
  horror: ['/discover/movie', {with_genres:'27',sort_by:'popularity.desc'}],
};

// Iframes de fontes explicitamente cadastradas (sem executar PHP ou acessar URLs arbitrárias).
function iframeFeatureEnabled(env) {return String(env.ENABLE_EXTERNAL_EMBEDS||'').toLowerCase()==='true';}
function licensedEmbedUrl(type,id,season,episode,mode='standard') {
 if(!safeMedia(type,id)||mode!=='standard')return null;
 if(type==='tv'&&(!Number.isInteger(season)||season<1||!Number.isInteger(episode)||episode<1))return null;
 // Endereço publicado pelo fornecedor, somente para títulos explicitamente autorizados no D1.
 return type==='movie'?`https://myembed.biz/filme/${id}`:`https://myembed.biz/serie/${id}/${season}/${episode}`;
}

const movieSections = new Set(['trending','movies','animefilms','cartoonfilms','upcoming','topmovies','action','romance','scifi','family','horror']);
function sectionMedia(section) { return movieSections.has(section) ? 'movie' : 'tv'; }
function isAnimation(row) { return (row.genre_ids || []).includes(16); }
function matchesSection(section, row) {
 const type = row.media_type || sectionMedia(section);
 if (type !== sectionMedia(section)) return false;
 if (['anime','animenew','animefilms'].includes(section)) return isAnimation(row) && row.original_language === 'ja';
 if (['cartoons','cartoonnew','cartoonfilms'].includes(section)) return isAnimation(row) && row.original_language !== 'ja';
 if (['series','topseries','trendingseries','airing','dorama','scifiseries','crimeseries','movies','topmovies','trending','family'].includes(section)) return !isAnimation(row);
 return true;
}

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
  const derived = await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:100000,hash:'SHA-256'}, await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']),256);
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
function profileSafe(p) {return {id:p.id,name:p.name,avatar:p.avatar,isKids:!!p.is_kids};}
async function profiles(env,userId) {return (await env.DB.prepare('SELECT * FROM profiles WHERE user_id=? ORDER BY created_at').bind(userId).all()).results.map(profileSafe);}
async function authResponse(env,req,userId,profileId=null) {
 const token=secretToken();const hash=await sha256(token);
 await env.DB.prepare('INSERT INTO sessions (id_hash,user_id,profile_id,expires_at) VALUES (?,?,?,?)').bind(hash,userId,profileId,dateAfter(SESSION_AGE)).run();
 const u=await env.DB.prepare('SELECT email FROM users WHERE id=?').bind(userId).first();
 return json({user:{email:u.email},profiles:await profiles(env,userId),activeProfile:profileId},200,{'Set-Cookie':cookie('lisoflix_session',token,req,SESSION_AGE)});
}
function safeMedia(type,id) {return ['movie','tv'].includes(type)&&Number.isSafeInteger(+id)&&+id>0&&+id<100000000;}
function cleanSnapshot(o,type,id) {return JSON.stringify({id:+id,media_type:type,title:String(o?.title||o?.name||'').slice(0,120),name:String(o?.name||o?.title||'').slice(0,120),poster_path: /^\/[a-zA-Z0-9]+\.(jpg|png|webp)$/.test(o?.poster_path||'')?o.poster_path:null,backdrop_path:/^\/[a-zA-Z0-9]+\.(jpg|png|webp)$/.test(o?.backdrop_path||'')?o.backdrop_path:null,vote_average:Number(o?.vote_average)||0,overview:String(o?.overview||'').slice(0,700),genre_ids:Array.isArray(o?.genre_ids)?o.genre_ids.slice(0,10):[],first_air_date:String(o?.first_air_date||'').slice(0,10),release_date:String(o?.release_date||'').slice(0,10)});}
// Aceita tanto a API Key v3 quanto o API Read Access Token (Bearer).
// Alguns usuarios colam o token Bearer por engano no Secret TMDB_API_KEY;
// isso nao deve transformar um token em um parametro ?api_key invalido.
function cleanCredential(value) {
 let v=String(value??'').trim();
 if ((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'"))) v=v.slice(1,-1).trim();
 return v;
}
function tmdbCredentials(env) {
 const out=[];
 for(const [key,configuredAsBearer] of [['TMDB_BEARER_TOKEN',true],['TMDB_API_KEY',false]]) {
  const raw=cleanCredential(env[key]);
  if(!raw)continue;
  const hasBearer=/^Bearer\s+/i.test(raw);
  const value=hasBearer?raw.replace(/^Bearer\s+/i,'').trim():raw;
  // A chave v3 normalmente possui 32 caracteres hexadecimais, enquanto
  // o Read Access Token e um JWT (3 trechos separados por pontos).
  const jwt=/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);
  const mode=configuredAsBearer||hasBearer||jwt?'bearer':'api_key';
  // Nao use conteudos que poderiam inserir quebras em Authorization.
  if(!value||value.length>4096||/[\r\n]/.test(value))continue;
  if(!out.some(c=>c.mode===mode&&c.value===value))out.push({mode,value});
 }
 return out;
}
function tmdbReady(env) {return tmdbCredentials(env).length>0;}
async function tmdb(env,path,params={},cacheSeconds=900) {
 const creds=tmdbCredentials(env);
 if(!creds.length)throw Error('TMDB_NOT_CONFIGURED');
 const base=new URL(ORIGIN_TMDB+path);
 const q={language:'pt-BR',...params};for(const [k,v]of Object.entries(q))base.searchParams.set(k,String(v));
 let response;
 for(let i=0;i<creds.length;i++){
  const credential=creds[i], u=new URL(base);
  const headers={Accept:'application/json'};
  if(credential.mode==='api_key')u.searchParams.set('api_key',credential.value);
  else headers.Authorization=`Bearer ${credential.value}`;
  // Respostas 401/403 nunca devem ficar em cache apos a troca de Secret.
  // O teste de autenticacao usa cacheSeconds=0 para validar a chave atual.
  const cachePolicy=cacheSeconds>0?{cf:{cacheEverything:true,cacheTtlByStatus:{'200-299':cacheSeconds,'300-599':0}}}:{};
  response=await fetch(u.toString(),{headers,...cachePolicy,signal:AbortSignal.timeout(12000)});
  // Se houver dois Secrets cadastrados, a segunda credencial pode funcionar.
  if(response.status!==401||i===creds.length-1)break;
 }
 if(response.status===401)throw Error('TMDB_AUTH_401');
 if(!response.ok)throw Error(`TMDB respondeu ${response.status}`);
 return response.json();
}
function demoSection(sec,page=1) {
 const results=DEMO.filter(x=>matchesSection(sec,x));
 return {results:page===1?results:[],page,total_pages:1,demo:true,updatedAt:new Date().toISOString()};
}
async function catalog(env,sec,page=1,force=false) {
 if(!sections[sec])throw Error('Seção inválida');
 if(!tmdbReady(env))return demoSection(sec,page);
 if(!force&&env.DB){try{const cached=await env.DB.prepare('SELECT payload,expires_at FROM catalog_cache WHERE section=? AND page=?').bind(sec,page).first();if(cached?.expires_at>Date.now())return JSON.parse(cached.payload);}catch(e){console.warn('catalog cache not ready',e?.message);}}
 const [path,opts]=sections[sec];let payload;
 try{payload=await tmdb(env,path,{...opts,page},180);}
 catch(e){
  // Retorna o cache antigo para evitar um catálogo vazio em falhas transitórias,
  // sem ocultar do frontend que os dados estão desatualizados.
  if(env.DB){try{const old=await env.DB.prepare('SELECT payload FROM catalog_cache WHERE section=? AND page=?').bind(sec,page).first();if(old?.payload)return {...JSON.parse(old.payload),stale:true,updatedAt:JSON.parse(old.payload).updatedAt};}catch{}}
  throw e;
 }
 const type=sectionMedia(sec);
 const results=(payload.results||[]).filter(x=>x.media_type!=='person'&&!x.adult&&!!(x.poster_path||x.backdrop_path)).map(x=>({...x,media_type:x.media_type||type})).filter(x=>matchesSection(sec,x));
 const data={results,page:payload.page,total_pages:payload.total_pages,demo:false,updatedAt:new Date().toISOString()};
 if(env.DB)try{await env.DB.prepare('INSERT INTO catalog_cache(section,page,payload,expires_at) VALUES (?,?,?,?) ON CONFLICT(section,page) DO UPDATE SET payload=excluded.payload,expires_at=excluded.expires_at').bind(sec,page,JSON.stringify(data),Date.now()+180000).run();}catch(e){console.warn('catalog cache write not ready',e?.message);}
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
 if(path==='/api/config'&&method==='GET')return json({tmdb:tmdbReady(env),embeds:iframeFeatureEnabled(env),videoMode:'native-plus-approved-embeds',version:APP_VERSION});
 // Uma verificacao publica que nao mostra credenciais, emails, IDs de conta ou URLs privadas.
 if(path==='/api/system-check'&&method==='GET'){
  const db=await databaseHealth(env);let catalogAuth='not-configured';
  if(tmdbReady(env)){try{await tmdb(env,'/configuration',{},0);catalogAuth='authorized';}
  catch(e){catalogAuth=e?.message==='TMDB_AUTH_401'?'unauthorized':'unavailable';}}
  let activeSources=null,activeEmbeds=null;
  if(db.schemaReady){
   try {
    const [sources,embeds]=await Promise.all([
     env.DB.prepare('SELECT COUNT(*) AS total FROM playback_sources WHERE enabled=1').first(),
     env.DB.prepare('SELECT COUNT(*) AS total FROM playback_embeds WHERE enabled=1').first()
    ]);
    activeSources=sources?.total??0;
    activeEmbeds=embeds?.total??0;
   } catch(e) { console.warn('Playback counts unavailable', e?.message); }
  }
  return json({version:APP_VERSION,database:db.database,schemaReady:db.schemaReady,missingTables:db.missing,catalogAuth,playerMode:'native-plus-approved-embeds',activeSources,activeEmbeds,externalEmbedsSupported:true,externalEmbedsEnabled:iframeFeatureEnabled(env)});
 }
 if(path==='/api/tmdb/check'&&method==='GET'){
  if(!tmdbReady(env))return json({configured:false,authorized:false,error:'Secret de catálogo não configurado.'},503);
  try{
   await tmdb(env,'/configuration',{},0);
   return json({configured:true,authorized:true});
  }catch(e){
   if(e?.message==='TMDB_AUTH_401')return json({configured:true,authorized:false,error:'O serviço de catálogo recusou as credenciais (401). Confira o tipo e o valor do Secret na Cloudflare.'},502);
   throw e;
  }
 }
 if(path==='/api/health'&&method==='GET') {
  return json({status:'ok',version:APP_VERSION,...await databaseHealth(env),tmdb:tmdbReady(env),tmdbConfigured:tmdbReady(env),time:new Date().toISOString()});
 }
 if(path==='/api/catalog'&&method==='GET'){
  const sec=url.searchParams.get('section')||'trending',page=Math.max(1,Math.min(5,Number(url.searchParams.get('page'))||1));
  return json(await catalog(env,sec,page));
 }
 if(path==='/api/discover'&&method==='GET') {
  const type=url.searchParams.get('type')==='movie'?'movie':'tv';
  const lang=(url.searchParams.get('lang')||'').toLowerCase();
  const genre=url.searchParams.get('genre')||'';
  const category=url.searchParams.get('category')||'';
  if(category&&category!=='anime')return fail('Categoria inválida.');
    if(lang&&!/^[a-z]{2}$/.test(lang))return fail('Idioma inválido.');
  if(genre&&!/^[0-9]{1,6}$/.test(genre))return fail('Gênero inválido.');
  if(!tmdbReady(env))return json({results:DEMO.filter(x=>x.media_type===type),demo:true});
  const d=await tmdb(env,`/discover/${type}`,{...(lang?{with_original_language:lang}:{}),...(category==='anime'?{with_original_language:'ja',with_genres:genre?`16,${genre}`:'16'}:{...(genre?{with_genres:genre}:{}),...(!lang?{without_genres:'16'}:{})}),sort_by:'popularity.desc',include_adult:'false',page:Math.max(1,Math.min(5,+url.searchParams.get('page')||1))},600);
  return json({results:(d.results||[]).filter(x=>x.poster_path&&(category!=='anime'||((x.genre_ids||[]).includes(16)&&x.original_language==='ja'))).map(x=>({...x,media_type:type})),demo:false});
 }
 if(path==='/api/search'&&method==='GET') {
  const q=(url.searchParams.get('q')||'').trim().slice(0,100);
  if(q.length<1)return json({results:[],demo:!tmdbReady(env)});
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
 if(path==='/api/playback'&&method==='GET') {
  const type=url.searchParams.get('type'),id=url.searchParams.get('id');
  if(!safeMedia(type,id))return fail('Título inválido.');
  const status=await databaseHealth(env);
  if(!status.schemaReady)return json({available:false,reason:'catalog-only'});
  // Números de episódios precisam ser explícitos e válidos, como no AnimeDragon.
  const rawSeason=url.searchParams.get('season')||'0',rawEpisode=url.searchParams.get('episode')||'0';
  if(!/^(0|[1-9]\d{0,2})$/.test(rawSeason)||!/^(0|[1-9]\d{0,3})$/.test(rawEpisode))return fail('Temporada ou episódio inválido.');
  const season=Number(rawSeason),episode=Number(rawEpisode);
  if(season>100||episode>2000||(type==='tv'&&(!season||!episode))||(type==='movie'&&(season||episode)))return fail('Temporada ou episódio inválido.');
  const entry=await env.DB.prepare('SELECT url,mime,label FROM playback_sources WHERE media_type=? AND media_id=? AND season=? AND episode=? AND enabled=1 LIMIT 1').bind(type,+id,season,episode).first();
  if(!entry){
   // Não inferimos permissão de exibição a partir do TMDB: fonte precisa ser
   // explicitamente cadastrada para cada filme ou episódio no D1.
   if(!iframeFeatureEnabled(env))return json({available:false,reason:'no-source-configured'});
   // Primeiro respeita a regra do episódio exato (inclusive disabled=0).
   // Para séries autorizadas, o registro (season=0,episode=0) cobre os episódios
   // sem exigir uma linha D1 para cada episódio; filmes nunca usam essa regra.
   const embed=await env.DB.prepare(`SELECT provider,mode,label,enabled,season,episode FROM playback_embeds
      WHERE media_type=? AND media_id=? AND ((season=? AND episode=?) OR (?='tv' AND season=0 AND episode=0))
      ORDER BY CASE WHEN season=? AND episode=? THEN 0 ELSE 1 END LIMIT 1`)
      .bind(type,+id,season,episode,type,season,episode).first();
   if(!embed||embed.enabled!==1||embed.provider!=='embedmovies')return json({available:false,reason:'no-source-configured'});
   const embedUrl=licensedEmbedUrl(type,+id,season,episode,embed.mode);
   if(!embedUrl)return json({available:false,reason:'invalid-embed'});
   // 'available' indica uma configuração existente, não confirmação da execução dentro do iframe.
   return json({available:true,availabilityVerified:false,mode:'iframe',url:embedUrl,label:embed.label||'Player externo',external:true,customControls:false,scope:embed.season===0&&embed.episode===0&&type==='tv'?'series':'episode'});
  }
  const permitted=(env.MEDIA_ALLOWED_HOSTS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
  let u;try{u=new URL(entry.url);}catch{return json({available:false,reason:'invalid-url'});}
  if(u.protocol!=='https:'||!permitted.includes(u.hostname.toLowerCase()))return json({available:false,reason:'source-not-allowed'});
  if(!['video/mp4','video/webm','application/vnd.apple.mpegurl'].includes(entry.mime))return json({available:false,reason:'invalid-format'});
  const auth=await session(req,env);const progress=auth?.profile_id?await env.DB.prepare('SELECT position_seconds,duration_seconds FROM playback_progress WHERE profile_id=? AND media_type=? AND media_id=? AND season=? AND episode=?').bind(auth.profile_id,type,+id,season,episode).first():null;
  return json({available:true,mode:'native',url:u.toString(),mime:entry.mime,label:entry.label||'Vídeo',position:progress?.position_seconds||0});
 }
 if(path==='/api/auth/register'&&method==='POST'){
  const databaseError=await requireSchema(env);if(databaseError)return databaseError;
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
  const databaseError=await requireSchema(env);if(databaseError)return databaseError;
  const b=await bodyJson(req),email=String(b.email||'').toLowerCase().trim();
  if(email.length>180||String(b.password||'').length>128)return fail('E-mail ou senha incorretos.',401);
  const emailHash=await sha256(email);
  const guard=await env.DB.prepare('SELECT attempts,blocked_until FROM login_guards WHERE email_hash=?').bind(emailHash).first();
  if(guard?.blocked_until>Date.now())return fail('Muitas tentativas. Aguarde 15 minutos e tente novamente.',429);
  const u=await env.DB.prepare('SELECT id,password_hash FROM users WHERE email=?').bind(email).first();
  if(!u?.password_hash||!await verifyHash(String(b.password||''),u.password_hash)){
   const attempts=(guard?.blocked_until && guard.blocked_until<Date.now()?0:(guard?.attempts||0))+1;
   await env.DB.prepare(`INSERT INTO login_guards(email_hash,attempts,blocked_until) VALUES(?,?,?)
    ON CONFLICT(email_hash) DO UPDATE SET attempts=excluded.attempts,blocked_until=excluded.blocked_until`)
    .bind(emailHash, attempts>=8?0:attempts, attempts>=8?Date.now()+15*60*1000:0).run();
   return fail('E-mail ou senha incorretos.',401);
  }
  await env.DB.prepare('DELETE FROM login_guards WHERE email_hash=?').bind(emailHash).run();
  const ps=await profiles(env,u.id);return await authResponse(env,req,u.id,ps.length===1?ps[0].id:null);
 }
 if(path==='/api/reactions'&&method==='GET'){
  const databaseError=await requireSchema(env);if(databaseError)return databaseError;
  const type=url.searchParams.get('type'),id=url.searchParams.get('id');if(!safeMedia(type,id))return fail('Título inválido.');
  if(!env.DB)return json({likes:0,dislikes:0,mine:0});
  const rows=await env.DB.prepare('SELECT vote,COUNT(*) total FROM reactions WHERE media_type=? AND media_id=? GROUP BY vote').bind(type,+id).all();
  const authed=await session(req,env);
  const mine=authed?.profile_id?await env.DB.prepare('SELECT vote FROM reactions WHERE profile_id=? AND media_type=? AND media_id=?').bind(authed.profile_id,type,+id).first():null;
  return json({likes:rows.results.find(r=>r.vote===1)?.total||0,dislikes:rows.results.find(r=>r.vote===-1)?.total||0,mine:mine?.vote||0});
 }
 if(path==='/api/comments'&&method==='GET'){
  const databaseError=await requireSchema(env);if(databaseError)return databaseError;
  const type=url.searchParams.get('type'),id=url.searchParams.get('id');if(!safeMedia(type,id))return fail('Título inválido.');
  if(!env.DB)return json({comments:[]});
  const rows=await env.DB.prepare(`SELECT c.id,c.content,c.created_at,c.profile_id,p.name,p.avatar FROM comments c
   JOIN profiles p ON p.id=c.profile_id WHERE c.media_type=? AND c.media_id=?
   ORDER BY c.created_at DESC LIMIT 80`).bind(type,+id).all();
  const auth=await session(req,env);return json({comments:rows.results.map(({profile_id,...c})=>({...c,mine:!!auth?.profile_id&&auth.profile_id===profile_id}))});
 }
 if(path.startsWith('/api/auth/')||path.startsWith('/api/profiles')||path.startsWith('/api/library')||path.startsWith('/api/watch')||path.startsWith('/api/comments')||path.startsWith('/api/reactions')){const databaseError=await requireSchema(env);if(databaseError)return databaseError;}
 const s=await session(req,env);
 if(path==='/api/auth/me'&&method==='GET') {
  if(!s)return json({user:null,profiles:[],activeProfile:null});
  const ps=await profiles(env,s.user_id);let selected=s.profile_id;if(!selected&&ps.length===1){selected=ps[0].id;const tok=fromCookie(req,'lisoflix_session');await env.DB.prepare('UPDATE sessions SET profile_id=? WHERE id_hash=?').bind(selected,await sha256(tok)).run();}return json({user:{email:s.email},profiles:ps,activeProfile:selected});
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
  const id=randomId();await env.DB.prepare('INSERT INTO profiles(id,user_id,name,avatar,is_kids,pin_hash) VALUES(?,?,?,?,?,?)').bind(id,s.user_id,name,avatar,b.isKids?1:0,null).run();
  return json({ok:true,profiles:await profiles(env,s.user_id)});
 }
 if(path==='/api/profiles/select'&&method==='POST'){
  const b=await bodyJson(req),p=await env.DB.prepare('SELECT * FROM profiles WHERE id=? AND user_id=?').bind(String(b.id||''),s.user_id).first();if(!p)return fail('Perfil não encontrado.',404);
  
  const token=fromCookie(req,'lisoflix_session');await env.DB.prepare('UPDATE sessions SET profile_id=? WHERE id_hash=?').bind(p.id,await sha256(token)).run();return json({ok:true,activeProfile:p.id});
 }
 if(path==='/api/profiles/update'&&method==='POST'){
  const b=await bodyJson(req),p=await env.DB.prepare('SELECT * FROM profiles WHERE id=? AND user_id=?').bind(String(b.id||''),s.user_id).first();if(!p)return fail('Perfil não encontrado.',404);
  
  const avatar=validatedAvatar(b.avatar??p.avatar),name=String(b.name??p.name).trim().slice(0,24);if(!name||avatar===null)return fail('Nome ou avatar inválido.');
  await env.DB.prepare('UPDATE profiles SET name=?,avatar=?,is_kids=?,pin_hash=NULL WHERE id=?').bind(name,avatar,b.isKids?1:0,p.id).run();return json({ok:true,profiles:await profiles(env,s.user_id)});
 }
 if(path==='/api/profiles/delete'&&method==='POST'){
  const b=await bodyJson(req),p=await env.DB.prepare('SELECT * FROM profiles WHERE id=? AND user_id=?').bind(String(b.id||''),s.user_id).first();if(!p)return fail('Perfil não encontrado.',404);
  
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
    ON CONFLICT(profile_id,media_type,media_id) DO UPDATE SET season=excluded.season,episode=excluded.episode,payload=excluded.payload,updated_at=datetime('now')`).bind(s.profile_id,b.type,+b.id,season,episode,cleanSnapshot(b.snapshot,b.type,b.id)).run();
  if(Number.isFinite(+b.position)&&+b.position>=0){const pos=Math.min(86400,Math.round(+b.position)),dur=Math.max(0,Math.min(86400,Math.round(+b.duration||0)));await env.DB.prepare(`INSERT INTO playback_progress(profile_id,media_type,media_id,season,episode,position_seconds,duration_seconds,updated_at) VALUES (?,?,?,?,?,?,?,datetime('now')) ON CONFLICT(profile_id,media_type,media_id,season,episode) DO UPDATE SET position_seconds=excluded.position_seconds,duration_seconds=excluded.duration_seconds,updated_at=datetime('now')`).bind(s.profile_id,b.type,+b.id,season,episode,pos,dur).run();}
  return json({ok:true});
 }
 if(path==='/api/reactions'&&method==='POST'){
   const b=await bodyJson(req);if(!safeMedia(b.type,b.id)||![1,-1,0].includes(b.vote))return fail('Avaliação inválida.');
   if(b.vote===0) await env.DB.prepare('DELETE FROM reactions WHERE profile_id=? AND media_type=? AND media_id=?').bind(s.profile_id,b.type,+b.id).run();
   else await env.DB.prepare(`INSERT INTO reactions(profile_id,media_type,media_id,vote) VALUES(?,?,?,?)
    ON CONFLICT(profile_id,media_type,media_id) DO UPDATE SET vote=excluded.vote,created_at=datetime('now')`).bind(s.profile_id,b.type,+b.id,b.vote).run();
   return json({ok:true});
 }
 if(path==='/api/comments'&&method==='POST'){
  const b=await bodyJson(req),content=String(b.content||'').trim();if(!safeMedia(b.type,b.id)||content.length<2||content.length>500)return fail('Comentário precisa ter de 2 a 500 caracteres.');
  const last=await env.DB.prepare('SELECT created_at FROM comments WHERE profile_id=? ORDER BY created_at DESC LIMIT 1').bind(s.profile_id).first();
  if(last&&Date.now()-Date.parse(last.created_at.replace(' ','T')+'Z')<12000)return fail('Aguarde alguns segundos para comentar novamente.',429);
  await env.DB.prepare('INSERT INTO comments(id,profile_id,media_type,media_id,content) VALUES(?,?,?,?,?)').bind(randomId(),s.profile_id,b.type,+b.id,content).run();return json({ok:true},201);
 }
 if((path==='/api/comments/edit'||path==='/api/comments/delete')&&method==='POST'){
  const b=await bodyJson(req),id=String(b.id||'');if(!/^[a-zA-Z0-9-]{8,80}$/.test(id))return fail('Comentário inválido.');
  const row=await env.DB.prepare('SELECT id FROM comments WHERE id=? AND profile_id=?').bind(id,s.profile_id).first();
  if(!row)return fail('Você só pode alterar seus próprios comentários.',403);
  if(path.endsWith('/delete')){await env.DB.prepare('DELETE FROM comments WHERE id=? AND profile_id=?').bind(id,s.profile_id).run();return json({ok:true});}
  const content=String(b.content||'').trim();if(content.length<2||content.length>500)return fail('Comentário precisa ter entre 2 e 500 caracteres.');
  await env.DB.prepare('UPDATE comments SET content=? WHERE id=? AND profile_id=?').bind(content,id,s.profile_id).run();return json({ok:true});
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
   if(/no such table|D1_ERROR/i.test(msg))return json({error:'Banco D1 indisponível ou incompleto. Verifique /api/system-check.',code:'DB_SCHEMA_ERROR'},503);
   return fail(msg==='TMDB_NOT_CONFIGURED'?'Configure a chave do catálogo.':msg==='TMDB_AUTH_401'?'A credencial do catálogo foi recusada (401). Verifique o Secret TMDB_API_KEY ou TMDB_BEARER_TOKEN no Worker.':msg,msg==='TMDB_AUTH_401'?502:500);
  }
 },
 async scheduled(event,env,ctx){
  if(!(await databaseHealth(env)).schemaReady)return;
  ctx.waitUntil((async()=>{
   await env.DB.prepare('DELETE FROM sessions WHERE expires_at<?').bind(new Date().toISOString()).run();
   try{await env.DB.prepare('DELETE FROM login_guards WHERE blocked_until<? AND attempts=0').bind(Date.now()-86400000).run();}catch(e){console.warn('login_guards pendente de criação',e?.message);}
   if(!tmdbReady(env))return;
   for(const sec of ['trending','upcoming','airing','anime','movies','series']){
    try{await catalog(env,sec,1,true);}catch(e){console.error('refresh',sec,e?.message);}
   }
  })());
 }
};
