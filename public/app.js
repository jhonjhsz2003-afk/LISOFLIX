import {DEMO} from './demo.js';
const $=s=>document.querySelector(s);
const app=$('#app'),overlay=$('#overlay'),toastStack=$('#toast-stack');
const state={page:'inicio',config:{tmdb:false,embeds:false},sections:{},search:'',user:null,profiles:[],activeProfile:null,library:{list:[],watching:[]},detail:null,activeSeason:1,episodes:[],comments:[],reactions:{likes:0,dislikes:0,mine:0},overlay:null,authMode:'login',menuOpen:false,searchOpen:false,searchSuggestions:[],editingCommentId:null,profileMenu:false,heroIndex:0,avatars:[],chosenAvatar:'',manageProfile:null,selectedId:null,selectPinId:null,playback:null,playerEpisode:null,sectionError:'',language:'en',languageType:'tv',discover:[],genre:'',genreResults:[],isLoading:false,isDemo:true};
const V={
 play:'<path d="m8 5 12 7-12 7z"/>',search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',check:'<path d="M20 6 9 17l-5-5"/>',close:'<path d="M18 6 6 18M6 6l12 12"/>',
 info:'<circle cx="12" cy="12" r="10"/><path d="M12 11v6M12 7h.01"/>',right:'<path d="m9 18 6-6-6-6"/>',left:'<path d="m15 18-6-6 6-6"/>',
 down:'<path d="m6 9 6 6 6-6"/>',menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
 heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0l-1 1-1-1a5.5 5.5 0 1 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
 film:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>',
 star:'<path d="m12 2 3.2 6.7 7.3 1-5.3 5.2 1.3 7.1L12 18.6l-6.5 3.4 1.3-7.1L1.5 9.7l7.3-1z"/>',
 refresh:'<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5 9a8 8 0 0 1 13-2l2 2M4 15l2 2a8 8 0 0 0 13-2"/>',
 logout:'<path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5M14 8l4 4-4 4M8 12h10"/>',
 settings:'<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.2-1.6l2-1.6-2-3.5-2.5 1a7 7 0 0 0-2.6-1.5L13.3 2h-4l-.4 2.8A7 7 0 0 0 6.3 6.3l-2.5-1-2 3.5 2 1.6a7 7 0 0 0 0 3.2l-2 1.6 2 3.5 2.5-1a7 7 0 0 0 2.6 1.5l.4 2.8h4l.4-2.8a7 7 0 0 0 2.6-1.5l2.5 1 2-3.5-2-1.6A7 7 0 0 0 19 12Z"/>',
 globe:'<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2c-6 6-6 14 0 20M12 2c6 6 6 14 0 20"/>',
 shield:'<path d="M12 2 4 6v6c0 5 4 8.5 8 10 4-1.5 8-5 8-10V6z"/><path d="m9 12 2 2 4-4"/>',
 message:'<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4.3-1.2L3 20l1.4-4.7A8.5 8.5 0 1 1 21 11.5Z"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',
 volume:'<path d="M3 9v6h4l5 4V5L7 9zM16 9a5 5 0 0 1 0 6M19 6a9 9 0 0 1 0 12"/>',
 tv:'<rect x="2" y="5" width="20" height="15" rx="2"/><path d="m8 2 4 3 4-3"/>'
};
const icon=(name)=>`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${V[name]||V.info}</svg>`;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key=m=>`${m.media_type||'movie'}:${m.id}`;
const title=m=>m?.title||m?.name||m?.original_title||m?.original_name||'Sem título';
const year=m=>(m?.release_date||m?.first_air_date||'').slice(0,4)||'Novo';
const mediaType=m=>m?.media_type||(m?.first_air_date?'tv':'movie');
const img=(path,size='w780')=>/^\/[a-zA-Z0-9_-]+\.(jpg|png|webp)$/.test(path||'')?`https://image.tmdb.org/t/p/${size}${path}`:null;
const pics=(m,wide=true)=>img(wide?(m.backdrop_path||m.poster_path):(m.poster_path||m.backdrop_path),wide?'w780':'w500');
const posterFallback=(m)=>img(m?.poster_path,'w500');
function sectionMatches(sec,m){const t=mediaType(m),animated=(m.genre_ids||[]).includes(16),japanese=m.original_language==='ja';if(['anime','animenew','animefilms'].includes(sec))return animated&&japanese&&t===(['anime','animenew'].includes(sec)?'tv':'movie');if(['cartoons','cartoonnew','cartoonfilms'].includes(sec))return animated&&!japanese&&t===(['cartoons','cartoonnew'].includes(sec)?'tv':'movie');if(['series','trendingseries','airing','topseries','dorama','scifiseries','crimeseries'].includes(sec))return t==='tv'&&!animated;if(['movies','trending','upcoming','topmovies','action','scifi','romance','horror','family'].includes(sec))return t==='movie'&&!animated;return true;}
const average=m=>m?.vote_average?`${Math.round(m.vote_average*10)}% relevante`:'';
const contentKind=m=>{const anim=(m?.genres||[]).some(g=>g.id===16)||(m?.genre_ids||[]).includes(16);if(anim)return m.original_language==='ja'?'Anime':'Desenho';return mediaType(m)==='tv'?'Série':'Filme';};
const tags=m=>[average(m),year(m),contentKind(m)].filter(Boolean);
const demoTone=m=>esc(m?._tone||'');
// Snapshot compacto enviado ao D1 (nunca enviar objeto completo do detalhe).
function briefSnapshot(d){return {title:String(d?.title||'').slice(0,120),name:String(d?.name||'').slice(0,120),poster_path:d?.poster_path||null,backdrop_path:d?.backdrop_path||null,overview:String(d?.overview||'').slice(0,350),genre_ids:(d?.genre_ids||d?.genres?.map(g=>g.id)||[]).slice(0,8),release_date:d?.release_date||'',first_air_date:d?.first_air_date||'',vote_average:d?.vote_average||0};}

const headerPages=[['inicio','Início'],['filmes','Filmes'],['series','Séries'],['animes','Animes'],['desenhos','Desenhos'],['bombando','Bombando'],['minha-lista','Minha lista'],['idiomas','Idiomas']];
const pageConfig={
 inicio:{title:'Sua próxima história começa aqui',lede:'Cinema, séries e animações — cada universo no seu lugar.',sections:[
 ['trending','Filmes em alta nesta semana'],['trendingseries','Séries em alta nesta semana'],['anime','Animes do momento'],['cartoons','Desenhos para assistir'],
 ['movies','Filmes populares'],['series','Séries para maratonar'],['animefilms','Filmes de anime'],['cartoonfilms','Animações em longa-metragem'],
 ['topmovies','Top 10 · Filmes',true],['topseries','Top 10 · Séries',true],['dorama','Doramas'],['upcoming','Próximos lançamentos de filmes']]},
 filmes:{title:'Filmes para todos os momentos',lede:'Um catálogo só de filmes, sem misturar séries ou animes.',sections:[['trending','Filmes em alta'],['movies','Filmes populares'],['upcoming','Próximas estreias'],['topmovies','Top 10 · Filmes',true],['action','Ação'],['scifi','Ficção científica'],['romance','Romance'],['horror','Terror']]},
 series:{title:'Uma história chama outra',lede:'Só séries de TV, organizadas para sua próxima maratona.',sections:[['trendingseries','Séries em alta'],['airing','Novos episódios de séries'],['topseries','Top 10 · Séries',true],['series','Séries populares'],['dorama','Doramas e histórias coreanas'],['scifiseries','Ficção e fantasia'],['crimeseries','Crime e investigação']]},
 animes:{title:'Seu próximo arco começa aqui',lede:'Animes e filmes de anime, em um universo próprio.',sections:[['anime','Animes populares'],['animenew','Animes em destaque'],['animefilms','Longas de anime']]},
 desenhos:{title:'Imaginação sem limites',lede:'Desenhos e filmes de animação, sem misturar animes.',sections:[['cartoons','Desenhos e animações'],['cartoonnew','Animações populares'],['cartoonfilms','Filmes animados']]},
 bombando:{title:'O que está bombando',lede:'Rankings organizados por tipo de conteúdo.',sections:[['topmovies','Top 10 · Filmes',true],['topseries','Top 10 · Séries',true],['trending','Filmes em destaque'],['trendingseries','Séries em destaque'],['anime','Animes populares'],['cartoons','Desenhos populares']]}
};
const filmGenres=[['','Todos os gêneros'],['28','Ação'],['12','Aventura'],['35','Comédia'],['80','Crime'],['99','Documentários'],['18','Drama'],['10751','Família'],['14','Fantasia'],['36','História'],['27','Terror'],['10402','Música'],['9648','Mistério'],['10749','Romance'],['878','Ficção científica'],['53','Suspense'],['10752','Guerra'],['37','Faroeste']];
const seriesGenres=[['','Todos os gêneros'],['10759','Ação e aventura'],['35','Comédia'],['80','Crime'],['99','Documentários'],['18','Drama'],['10751','Família'],['10762','Infantil'],['9648','Mistério'],['10763','Notícias'],['10764','Reality'],['10765','Ficção e fantasia'],['10766','Novela'],['10767','Talk show'],['10768','Guerra e política']];
const animeGenres=[['','Todos os gêneros'],['10759','Ação e aventura'],['10765','Fantasia e ficção'],['35','Comédia'],['18','Drama'],['9648','Mistério'],['10762','Infantil'],['10751','Família']];
const languages=[['en','Inglês'],['pt','Português'],['ja','Japonês'],['ko','Coreano'],['es','Espanhol'],['fr','Francês'],['de','Alemão'],['it','Italiano'],['zh','Chinês'],['hi','Hindi'],['ar','Árabe'],['ru','Russo'],['tr','Turco'],['th','Tailandês']];
function toast(msg,kind='ok'){const box=document.createElement('div');box.className='toast';box.innerHTML=icon(kind==='error'?'info':'check')+`<span>${esc(msg)}</span>`;toastStack.append(box);setTimeout(()=>box.remove(),4500);}
async function api(path,opts={}){const r=await fetch(path,{credentials:'same-origin',...opts,headers:{...(opts.body?{'Content-Type':'application/json'}:{}),...opts.headers}});let data={};try{data=await r.json();}catch{}if(!r.ok)throw Error(data.error||`Erro ${r.status}`);return data;}
function post(path,data){return api(path,{method:'POST',body:JSON.stringify(data)});}
function bannerError(e){toast(e.message||'Algo deu errado. Tente novamente.', 'error');}
function avatar(p,size=''){const first=esc((p?.name||'U').slice(0,1).toUpperCase());return `<span class="profile-dot ${size}">${p?.avatar?`<img src="/avatars/${encodeURIComponent(p.avatar)}" loading="lazy" alt="">`:first}</span>`;}
function active(){return state.profiles.find(p=>p.id===state.activeProfile)||null;}
function renderHeader(){const p=active();let n=`<header class="site-head ${scrollY>30?'scrolled':''}">
 <button class="icon-button mobile-menu" data-action="mobilemenu" aria-label="Abrir menu">${icon('menu')}</button>
 ${state.page!=='inicio'?`<button class="icon-button header-back" data-action="goback" title="Voltar" aria-label="Voltar">${icon('left')}</button>`:''}<a class="logo" href="#/inicio" aria-label="LISOFLIX, início"><img class="brand-mark brand-header" src="/brand/lisoflix-wordmark.webp" width="360" height="124" alt="LISOFLIX" decoding="async"></a>
 <nav class="nav-links ${state.menuOpen?'open':''}" aria-label="Navegação principal">${headerPages.map(([k,t])=>`<button class="nav-link ${state.page===k?'active':''}" data-page="${k}">${t}</button>`).join('')}</nav>
 <div class="nav-right">
 ${state.searchOpen?`<form class="header-search" id="search-form">${icon('search')}<input aria-label="Buscar títulos" type="search" name="search" placeholder="Buscar filmes, séries e animes" value="${esc(state.search)}" autocomplete="off"><button type="button" class="icon-button tiny" data-action="searchclose" aria-label="Fechar busca">${icon('close')}</button><div id="search-suggestions" class="search-suggestions" role="listbox" aria-label="Sugestões de busca"></div></form>`:''}
 ${!state.searchOpen?`<button class="icon-button" title="Buscar" data-action="searchtoggle" aria-label="Buscar">${icon('search')}</button>`:''}
 ${p?`<button class="profile-trigger" data-action="profilemenu" aria-haspopup="true">${avatar(p)}<span class="username">${esc(p.name)}</span>${icon('down')}</button>`:`<button class="btn btn-main" style="min-height:37px;padding:0 14px" data-action="auth">Entrar</button>`}
 </div>${state.profileMenu?profileMenuMarkup():''}</header>`;return n;}
function profileMenuMarkup(){return `<div class="dropdown">${state.profiles.map(p=>`<button data-action="selectprofile" data-id="${p.id}">${avatar(p)} ${esc(p.name)} </button>`).join('')}<hr><button data-action="profiles">${icon('user')} Trocar perfil</button><button data-action="manage">${icon('settings')} Gerenciar perfis</button><button data-action="logout">${icon('logout')} Sair da conta</button></div>`;}
function renderFooter(){return `<footer><div class="footer-grid"><div><div class="logo"><img class="brand-mark brand-inline" src="/brand/lisoflix-wordmark.webp" width="360" height="124" alt="LISOFLIX"></div><p>Filmes, séries, animes e desenhos. Histórias organizadas em um só lugar.</p><details class="legal-credits"><summary>Créditos e informações legais</summary><p>Este produto utiliza a API TMDB, mas não é endossado nem certificado pelo TMDB.</p><p><a href="https://www.themoviedb.org/about/logos-attribution" target="_blank" rel="noopener noreferrer">Informações de atribuição TMDB</a>. Metadados, imagens e direitos de exibição pertencem aos respectivos titulares. A disponibilidade de reprodução depende dos fornecedores autorizados.</p></details></div><div class="footer-links"><button data-page="idiomas">Idiomas</button><button data-page="minha-lista">Minha lista</button><button data-action="${state.user?'profiles':'auth'}">Minha conta</button></div></div><div class="footer-bottom">© ${new Date().getFullYear()} LISOFLIX · <a href="/api/system-check" target="_blank" rel="noopener noreferrer" title="Verificar os sistemas do site">Diagnóstico</a> · v${esc(state.config.version||'')}</div></footer>`;}
function bgTile(m){const url=pics(m);return url?`<img class="tile-img" loading="lazy" alt="" src="${url}" data-poster="${posterFallback(m)||''}"><span class="tile-fallback" hidden>${esc(title(m))}</span>`:`<span class="tile-fallback">${esc(title(m))}</span>`;}
function historyEntry(m){return state.library.watching.find(x=>key(x)===key(m));}
function watchPercent(m){const h=historyEntry(m);if(!h)return null;if(h.watched)return 100;return h.duration>0?Math.max(0,Math.min(99,Math.round(100*h.position/h.duration))):null;}
function watchStatus(m){const h=historyEntry(m),pct=watchPercent(m);if(!h)return '';
 return `${h.watched?`<span class="watched-pill">${icon('check')} Assistido</span>`:''}${pct!==null?`<span class="watch-progress" role="progressbar" aria-label="Progresso de ${esc(title(m))}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span style="width:${pct}%"></span></span>`:''}`;
}
function tile(m,{rank=null,chip=null}={}){const type=mediaType(m);return `<button class="tile" data-tone="${demoTone(m)}" data-action="detail" data-id="${m.id}" data-type="${type}" title="${esc(title(m))}">${rank?`<span class="rank-number" aria-hidden="true">${rank}</span>`:''}${bgTile(m)}<span class="play-overlay">${icon('play')}</span><span class="tile-title">${esc(title(m))}</span>${chip?`<span class="corner-chip">${esc(chip)}</span>`:''}${watchStatus(m)}</button>`;}
function loadingTiles(){return Array.from({length:6},()=>`<span class="tile"></span>`).join('');}
function heroSlides(){
 const order=['trending','trendingseries','airing','anime','movies','series'];
 const lists=order.map(sec=>(state.sections[sec]?.results||[]).filter(x=>x.backdrop_path));
 const seen=new Set(),mixed=[];
 for(let round=0;round<4;round++)for(let group=0;group<lists.length;group++){
  const m=lists[group][round];if(m&&!seen.has(key(m))){mixed.push(m);seen.add(key(m));}
 }
 return mixed.slice(0,10).length?mixed.slice(0,10):DEMO.filter(x=>x.backdrop_path).slice(0,5);
}
function heroItem(){const slides=heroSlides();return slides[state.heroIndex%Math.max(1,slides.length)]||DEMO[0];}
function renderHero(){const m=heroItem(),url=img(m.backdrop_path||m.poster_path,'original');const opts=state.sections.trending?.results||DEMO;return `<section class="hero"><div class="hero-art" style="${url?`background-image:url('${url}')`:''}"></div><div class="hero-inner"><span class="hero-flag">LISOFLIX apresenta</span><h1>${esc(title(m))}</h1><div class="hero-tags"><span class="score">✦ ${esc(average(m)||'Em destaque')}</span><span>•</span><span>${esc(year(m))}</span><span>•</span><span>${esc(contentKind(m))}</span></div><p>${esc(m.overview||'Descubra uma nova história para chamar de sua.')}</p><div class="hero-actions"><button class="btn btn-white" data-action="detail" data-type="${mediaType(m)}" data-id="${m.id}">${icon('play')} Explorar título</button><button class="btn btn-glass" data-action="detail" data-type="${mediaType(m)}" data-id="${m.id}">${icon('info')} Mais informações</button></div><div class="statusline"><span class="live-dot"></span>${state.isDemo?'Modo demonstração. Adicione sua chave TMDB.':'Novidades renovadas automaticamente'}</div></div><div class="hero-brand" aria-hidden="true"><img src="/brand/lisoflix-emblem.webp" width="180" height="180" alt=""></div><div class="hero-bottom"><div class="hero-index">${Array.from({length:Math.max(1,heroSlides().length)},(_,i)=>`<button aria-label="Destaque ${i+1}" class="${state.heroIndex===i?'selected':''}" data-action="hero" data-index="${i}"></button>`).join('')}</div></div></section>`;}
function rail(sec,label,isTop=false,itemsOverride){
 const list=(itemsOverride||state.sections[sec]?.results||[]).filter(Boolean);let seen=new Set();
 const items=list.filter(x=>{if(!x.id||(sec!=='watching'&&sec!=='history'&&sec!=='saved'&&!sectionMatches(sec,x))||seen.has(key(x)))return false;seen.add(key(x));return true;}).slice(0,isTop?10:48);
 return `<section class="section" id="section-${sec}-${label.replace(/\W/g,'').slice(0,10)}"><div class="section-header"><div class="section-headline"><h2>${esc(label)}</h2></div></div>
 <div class="rails ${isTop?'top-rail':''}"><div class="rail-scroll">${items.length?items.map((m,i)=>tile(m,{rank:isTop?i+1:null,chip:sec==='upcoming'?'EM BREVE':null})).join(''):state.isLoading?loadingTiles():`<div class="empty" style="width:100%">Nenhum título disponível nesta categoria por enquanto.</div>`}</div>
 ${items.length>3?`<div class="rail-arrows rail-arrows-overlay"><button class="arrow arrow-prev" data-action="rail" data-dir="-1" aria-label="Voltar capas">${icon('left')}</button><button class="arrow arrow-next" data-action="rail" data-dir="1" aria-label="Avançar capas">${icon('right')}</button></div>`:''}</div></section>`;
}
function personalizedRail(){
 if(!state.activeProfile||!state.library.watching.length)return '';
 const recent=state.library.watching.find(m=>(m.genre_ids||[]).length>0);
 if(!recent)return '';
 const genres=new Set(recent.genre_ids||[]),watched=new Set(state.library.watching.map(key));
 const kind=contentKind(recent);
 const candidates=Object.values(state.sections).flatMap(x=>x.results||[]).filter(m=>m?.id&&!watched.has(key(m))&&contentKind(m)===kind);
 const seen=new Set();const recommended=candidates.map(m=>({m,score:(m.genre_ids||[]).filter(g=>genres.has(g)).length})).filter(x=>x.score>0&&!seen.has(key(x.m))&&seen.add(key(x.m))).sort((a,b)=>b.score-a.score).slice(0,20).map(x=>x.m);
 return recommended.length>=3?rail('personal',`Mais histórias como ${title(recent)}`,false,recommended):'';
}
function renderHome(){const cfg=pageConfig[state.page]||pageConfig.inicio;const used=new Set();const sections=cfg.sections.map(([sec,label,top])=>{const pool=state.sections[sec]?.results||[];if(state.isDemo||!pool.length)return rail(sec,label,top);const fresh=pool.filter(x=>!used.has(key(x)));const chosen=fresh.slice(0,top?10:40);if(!chosen.length)return rail(sec,label,top);for(const m of chosen)used.add(key(m));return rail(sec,label,top,chosen);}).join('');if(state.page==='inicio')return `${renderHero()}<div class="container home-content">${state.library.watching.some(x=>!x.watched)?rail('watching','Continuar assistindo',false,state.library.watching.filter(x=>!x.watched)):''}${state.library.watching.some(x=>x.watched)?rail('history','Já assistidos ✓',false,state.library.watching.filter(x=>x.watched)):''}${state.library.list.length?rail('saved','Minha lista',false,state.library.list):''}${personalizedRail()}${state.sectionError?`<div class="catalog-alert">${icon('info')} Não foi possível atualizar algumas categorias: ${esc(state.sectionError)}. <a href="/api/tmdb/check" target="_blank" rel="noopener">Verificar conexão</a></div>`:''}${sections}</div>`;
const genrePage=['filmes','series','animes'].includes(state.page);
 const options=state.page==='filmes'?filmGenres:state.page==='animes'?animeGenres:seriesGenres;
 const genreControl=genrePage?`<div class="genre-bar"><label for="genre-select">${state.page==='animes'?'Gêneros de anime':'Explorar por gênero'}</label><select id="genre-select" aria-label="Filtrar por gênero">${options.map(([value,name])=>`<option value="${value}" ${state.genre===value?'selected':''}>${name}</option>`).join('')}</select></div>`:'';
 const genreContent=genrePage&&state.genre?`<section class="genre-results"><h2>${esc(options.find(([k])=>k===state.genre)?.[1]||'Gênero selecionado')}</h2><div class="catalog-grid">${state.isLoading?loadingTiles():state.genreResults.length?state.genreResults.map(tileItem=>tile(tileItem)).join(''):'<p>Nenhum título encontrado nesse gênero.</p>'}</div></section>`:'';
 return `<div class="page-top container"><div class="eyebrow">O seu próximo play está aqui</div><h1 class="page-title">${esc(cfg.title)}</h1><p class="page-lede">${esc(cfg.lede)}</p></div><div class="container content-page">${genreControl}${genreContent}${state.sectionError?`<div class="catalog-alert">${icon('info')} Algumas categorias não carregaram: ${esc(state.sectionError)}. <a href="/api/tmdb/check" target="_blank" rel="noopener">Diagnóstico</a></div>`:''}${state.genre&&genrePage?'':sections}</div>`;}
function emptyPage(emoji,titleStr,desc,action='auth',cta='Entrar na conta'){return `<div class="empty"><div class="big-emoji">${emoji}</div><h3>${esc(titleStr)}</h3><p>${esc(desc)}</p><button class="btn btn-main" data-action="${action}">${esc(cta)}</button></div>`;}
function renderLibrary(){const lib=state.library;return `<div class="page-top container"><div class="eyebrow">Do seu jeito</div><h1 class="page-title">Minha LISOFLIX</h1><p class="page-lede">Suas escolhas e o último título que você abriu, guardados por perfil.</p></div><div class="container content-page">${!state.activeProfile?emptyPage('✦','Seu espaço pessoal está esperando','Entre na sua conta e escolha um perfil para salvar seus favoritos.'): `${lib.watching.some(x=>!x.watched)?rail('history','Continuar assistindo',false,lib.watching.filter(x=>!x.watched)):''}${lib.watching.some(x=>x.watched)?rail('history','Já assistidos ✓',false,lib.watching.filter(x=>x.watched)):''}${lib.list.length?rail('saved','Minha lista',false,lib.list):''}${!lib.list.length&&!lib.watching.length?emptyPage('♡','Sua lista ainda está vazia','Explore o catálogo e toque no + para salvar seus favoritos.','goto','Explorar catálogo'):''}<div class="statusline">${icon('info')} O progresso exato é salvo apenas por fontes que enviam informações verificadas de reprodução. Em players externos sem integração de eventos, é possível marcar títulos manualmente como assistidos.</div>`}</div>`;}
function renderLanguages(){return `<div class="page-top container"><div class="eyebrow">Histórias pelo mundo</div><h1 class="page-title">Explore por idiomas</h1><p class="page-lede">Encontre títulos por idioma original. A disponibilidade de dublagem e legendas depende dos serviços de reprodução.</p></div><div class="container content-page"><div class="filters"><label for="langsel">Idioma original</label><select id="langsel">${languages.map(([code,n])=>`<option value="${code}" ${state.language===code?'selected':''}>${n}</option>`).join('')}</select><label for="mediasel">Tipo</label><select id="mediasel"><option value="tv" ${state.languageType==='tv'?'selected':''}>Séries</option><option value="movie" ${state.languageType==='movie'?'selected':''}>Filmes</option></select></div><div class="catalog-grid">${state.discover.length?state.discover.map(x=>tile(x)).join(''):(state.isLoading?loadingTiles():emptyPage('◌','Sem resultados','Tente selecionar outro idioma.','goto','Voltar ao início'))}</div></div>`;}
function renderSearch(){const results=state.searchResults||[];return `<div class="page-top container"><div class="eyebrow">Busca rápida</div><h1 class="page-title">${state.search?'Resultados para “'+esc(state.search)+'”':'Buscar títulos'}</h1><p class="page-lede">Procure filmes, séries, animes e desenhos de todos os gêneros.</p></div><div class="container content-page"><div class="catalog-grid">${results.length?results.map(x=>tile(x)).join(''):state.isLoading?loadingTiles():emptyPage('⌕','Nenhum resultado ainda','Pesquise por um nome diferente.','searchtoggle','Buscar novamente')}</div></div>`;}
function render(){app.innerHTML=`${renderHeader()}<main>${state.page==='minha-lista'?renderLibrary():state.page==='idiomas'?renderLanguages():state.page==='busca'?renderSearch():renderHome()}</main>${renderFooter()}`;if(state.overlay!=='play'||!overlay.querySelector('.player-shell'))renderOverlay();document.body.classList.toggle('modal-open',!!state.overlay);}
function updateHeader(){const header=$('.site-head');if(header){header.classList.toggle('scrolled',scrollY>30);}}
// Carrega a primeira página de cada categoria sem esperar dezenas de requisições.
// As páginas adicionais são buscadas em segundo plano, com concorrência limitada.
let sectionsGeneration=0;
async function limitedPool(items,limit,task){
 let next=0;
 await Promise.all(Array.from({length:Math.min(items.length,limit)},async()=>{
  while(next<items.length){const item=items[next++];await task(item);}
 }));
}
function mergeCatalogSection(sec,data,append=false){
 const prior=append?(state.sections[sec]?.results||[]):[];
 const seen=new Set();const results=[...prior,...(data.results||[])].filter(m=>{
  if(!sectionMatches(sec,m)||seen.has(key(m)))return false;
  seen.add(key(m));return true;
 });
 state.sections[sec]={...state.sections[sec],...data,results:results.slice(0,65),failed:false};
}
function renderCatalogWithoutScrollJump(page){
 if(state.page!==page||state.overlay)return;
 const y=window.scrollY;
 const positions=new Map([...document.querySelectorAll('.section[id]')].map(el=>[el.id,el.querySelector('.rail-scroll')?.scrollLeft||0]));
 render();
 for(const [id,left] of positions){const rail=document.getElementById(id)?.querySelector('.rail-scroll');if(rail)rail.scrollLeft=left;}
 if(Math.abs(window.scrollY-y)>3)window.scrollTo(0,y);
}
async function loadSections(page=state.page){
 const generation=++sectionsGeneration,desired=pageConfig[page]?.sections||pageConfig.inicio.sections;
 const names=[...new Set(desired.map(x=>x[0]))];
 state.sectionError='';state.isLoading=true;render();
 // Renderiza resultados da primeira página conforme chegam (primeiro os acima da dobra).
 await limitedPool(names,5,async sec=>{
  if(state.sections[sec]?.results?.length&&!state.sections[sec].failed)return;
  try{
   const data=await api(`/api/catalog?section=${encodeURIComponent(sec)}&page=1`,{signal:AbortSignal.timeout(10000)});
   mergeCatalogSection(sec,data);
   state.isDemo=state.isDemo&&!!data.demo;
  }catch(e){
   state.sections[sec]={results:state.config.tmdb?[]:DEMO.filter(x=>sectionMatches(sec,x)),failed:true};
   if(!state.sectionError)state.sectionError='Algumas categorias estão temporariamente indisponíveis';
  }
  if(generation===sectionsGeneration)renderCatalogWithoutScrollJump(page);
 });
 if(generation!==sectionsGeneration)return;
 state.isLoading=false;renderCatalogWithoutScrollJump(page);
 // Resultados adicionais não atrasam a primeira tela nem bloqueiam a navegação.
 const more=names.flatMap(sec=>{
  if(state.sections[sec]?.failed)return [];
  const count=['anime','animenew','animefilms','cartoons','cartoonnew','cartoonfilms','series','trendingseries','airing','dorama'].includes(sec)?3:2;
  return Array.from({length:count-1},(_,i)=>[sec,i+2]);
 });
 void limitedPool(more,3,async([sec,pageNum])=>{
  if(generation!==sectionsGeneration)return;
  try{
   const data=await api(`/api/catalog?section=${encodeURIComponent(sec)}&page=${pageNum}`,{signal:AbortSignal.timeout(12000)});
   if(generation!==sectionsGeneration)return;
   mergeCatalogSection(sec,data,true);
   // Atualiza a grade sem zerar a posição dos carrosséis.
   renderCatalogWithoutScrollJump(page);
  }catch(e){console.warn('Página adicional indisponível:',sec,pageNum);}
 });
}
async function navigate(page,{push=true}={}){
 if(!headerPages.some(([k])=>k===page)&&page!=='busca')page='inicio';
 const previous=state.page;state.page=page;state.menuOpen=false;state.profileMenu=false;state.heroIndex=0;state.genre='';state.genreResults=[];state.overlay=null;
 if(push&&location.hash!==`#/${page}`)history.pushState({lf:true,page},'',`#/${page}`);
 if(previous!==page)scrollTo({top:0,behavior:'instant'});
 render();if(page==='minha-lista'){await refreshLibrary();render();}else if(page==='idiomas')await loadDiscover();else if(page==='busca')await runSearch();else await loadSections(page);
}
async function loadDiscover(){state.isLoading=true;render();const type=state.languageType,lang=state.language;
 try{const pages=await Promise.all([1,2,3,4,5].map(p=>api(`/api/discover?type=${type}&lang=${lang}&page=${p}`).catch(()=>null)));
  if(type!==state.languageType||lang!==state.language)return;
  if(!pages.some(Boolean))throw Error('Não foi possível atualizar esse idioma agora.');
  const seen=new Set();state.discover=pages.filter(Boolean).flatMap(d=>d.results||[]).filter(m=>{if(seen.has(key(m)))return false;seen.add(key(m));return true;});
 }catch(e){state.discover=[];bannerError(e);}state.isLoading=false;render();}
let searchSeq=0,searchTimer=null;
async function runSearch({preview=false}={}){
 const q=state.search.trim(),mine=++searchSeq;
 if(q.length<1){state.searchResults=[];state.searchSuggestions=[];if(preview)paintSearchSuggestions();else if(state.page==='busca')render();return;}
 if(!preview){state.isLoading=true;render();}
 try{
  const d=await api(`/api/search?q=${encodeURIComponent(q)}`);
  if(mine!==searchSeq||state.search.trim()!==q)return;
  state.searchResults=d.results||[];state.searchSuggestions=state.searchResults.slice(0,7);
 }catch(e){if(mine!==searchSeq)return;state.searchResults=[];state.searchSuggestions=[];}
 if(preview)paintSearchSuggestions();else{state.isLoading=false;if(state.page==='busca')render();}
}
function paintSearchSuggestions(){
 const node=document.querySelector('#search-suggestions');if(!node)return;
 const items=state.searchSuggestions||[];
 node.innerHTML=state.search.trim().length<1?'':items.length?items.map(m=>`<button type="button" role="option" data-action="detail" data-id="${m.id}" data-type="${mediaType(m)}">${posterFallback(m)?`<img src="${posterFallback(m)}" alt="" loading="lazy">`:''}<span>${esc(title(m))}<small>${esc(year(m))} · ${esc(contentKind(m))}</small></span></button>`).join(''):'<p>Nenhum título encontrado.</p>';
 node.hidden=state.search.trim().length<1;
}
async function loadGenre(){
 if(!state.genre||!['filmes','series','animes'].includes(state.page)){state.genreResults=[];return;}
 const page=state.page,genre=state.genre;state.genreResults=[];state.isLoading=true;render();
 const type=page==='filmes'?'movie':'tv',category=page==='animes'?'&category=anime':'';
 const animeMovieGenres={'10759':'28','10765':'14','10762':'10751'};
 const primaryPages=[1,2,3,4].map(p=>api(`/api/discover?type=${type}&genre=${genre}${category}&page=${p}`));
 const moviePages=page==='animes'?[1,2].map(p=>api(`/api/discover?type=movie&genre=${animeMovieGenres[genre]||genre}&category=anime&page=${p}`)):[];
 try{const pages=await Promise.all([...primaryPages,...moviePages].map(p=>p.catch(()=>null)));
 if(page!==state.page||genre!==state.genre)return;
 if(!pages.some(Boolean))throw Error('Não foi possível consultar esse gênero agora.');
 const seen=new Set();state.genreResults=pages.filter(Boolean).flatMap(x=>x.results||[]).filter(m=>{if(seen.has(key(m))||(page==='animes'&&contentKind(m)!=='Anime'))return false;seen.add(key(m));return true;});
 }catch(e){state.genreResults=[];bannerError(e);}
 state.isLoading=false;render();
}
async function refreshMe(){try{const d=await api('/api/auth/me');state.user=d.user;state.profiles=d.profiles||[];state.activeProfile=d.activeProfile;}catch{state.user=null;state.profiles=[];state.activeProfile=null;}}
async function refreshLibrary(){if(!state.activeProfile){state.library={list:[],watching:[]};return;}try{state.library=await api('/api/library');}catch(e){state.library={list:[],watching:[]};}}
let detailRequestId=0;
async function openDetail(type,id,{push=true,show='detail'}={}){
 if(!['movie','tv'].includes(type)||!Number.isSafeInteger(+id)||+id<=0)return;
 const mine=++detailRequestId;
 if(push)history.pushState({lf:true,overlay:show},'',`#/${state.page}/${show==='detail'?'titulo':show}/${type}/${+id}`);
 state.overlay='detail';state.detail=null;state.episodes=[];state.comments=[];state.editingCommentId=null;state.reactions={likes:0,dislikes:0,mine:0};state.activeSeason=1;renderOverlay();
 try{const d=await api(`/api/detail?type=${encodeURIComponent(type)}&id=${+id}`);if(mine!==detailRequestId)return;
 state.detail={...d,media_type:type};state.activeSeason=(d.seasons||[]).find(s=>s.season_number===1)?.season_number??d.seasons?.find(s=>s.season_number>0)?.season_number??0;
 state.overlay=show==='detail'?'detail':show;renderOverlay();if(type==='tv')loadSeason(state.activeSeason);loadComments();loadReactions();
 }catch(e){if(mine!==detailRequestId)return;state.overlay=null;renderOverlay();bannerError(e);}
}
async function loadSeason(s){const forId=state.detail?.id;state.activeSeason=s;state.episodes=[];renderOverlay();try{const d=await api(`/api/season?id=${forId}&season=${s}`);if(state.detail?.id!==forId)return;state.episodes=d.episodes||[];}catch(e){state.episodes=[];}if(state.overlay==='detail')renderOverlay();}
async function loadComments(){const detail=state.detail;if(!detail)return;try{const d=await api(`/api/comments?type=${mediaType(detail)}&id=${detail.id}`);if(detail.id!==state.detail?.id)return;state.comments=d.comments||[];const node=$('#comments-list');if(node&&!state.editingCommentId)node.innerHTML=commentsMarkup();}catch{}}
async function loadReactions(){
 const detail=state.detail;if(!detail)return;
 try {const data=await api(`/api/reactions?type=${mediaType(detail)}&id=${detail.id}`);
 if(state.detail?.id!==detail.id)return;state.reactions=data;
 const node=$('#reactions-live');if(node)node.innerHTML=reactionsMarkup();
 }catch{}
}
function reactionsMarkup(){const r=state.reactions||{likes:0,dislikes:0,mine:0};return `<div class="react-controls" role="group" aria-label="Avaliar título">
 <button type="button" class="react-button ${r.mine===1?'selected':''}" data-action="vote" data-vote="1" aria-pressed="${r.mine===1}">👍 Curtir <b>${r.likes||0}</b></button>
 <button type="button" class="react-button ${r.mine===-1?'selected':''}" data-action="vote" data-vote="-1" aria-pressed="${r.mine===-1}">👎 Não curti <b>${r.dislikes||0}</b></button>
 </div>`;}
function commentsMarkup(){if(!state.comments.length)return '<p class="small-meta">Que tal ser a primeira pessoa a comentar?</p>';return state.comments.map(c=>`<div class="comment">${avatar({name:c.name,avatar:c.avatar})}<div class="comment-body"><div class="comment-title">${esc(c.name)} <time>${esc((c.created_at||'').slice(0,16))}</time></div>${c.mine&&state.editingCommentId===c.id?`<div class="comment-edit"><textarea id="comment-edit-input" maxlength="500" rows="3" aria-label="Editar comentário">${esc(c.content)}</textarea><div class="comment-actions"><button data-action="savecomment" data-id="${esc(c.id)}">Salvar alterações</button><button data-action="cancelcomment">Cancelar</button></div></div>`:`<p>${esc(c.content)}</p>${c.mine?`<div class="comment-actions"><button data-action="editcomment" data-id="${esc(c.id)}">Editar</button><button data-action="deletecomment" data-id="${esc(c.id)}">Excluir</button></div>`:''}`}</div></div>`).join('');}
function isSaved(m){return state.library.list.some(x=>key(x)===key(m));}
function detailsRecommendations(d){const candidates=[...(d.recommendations?.results||[]),...(d.similar?.results||[])];const kind=contentKind(d);const seen=new Set();let found=candidates.map(x=>({...x,media_type:mediaType(d)})).filter(x=>{if(x.id===d.id||seen.has(x.id)||contentKind(x)!==kind)return false;seen.add(x.id);return true;});if(found.length<4){const pools=Object.values(state.sections).flatMap(v=>v.results||[]);found.push(...pools.filter(x=>{if(x.id===d.id||seen.has(x.id)||contentKind(x)!==kind)return false;seen.add(x.id);return true;}).slice(0,12-found.length));}return found.slice(0,12);}
function dVideo(d){const list=d.videos?.results||[];return list.find(x=>x.site==='YouTube'&&x.type==='Trailer'&&/^[A-Za-z0-9_-]{11}$/.test(x.key))||list.find(x=>x.site==='YouTube'&&/^[A-Za-z0-9_-]{11}$/.test(x.key));}
function detailsModal(){const d=state.detail;if(!d)return `<div class="veil soft" data-backdrop="1"><div class="overlay-card" style="height:520px;display:grid;place-items:center">Carregando detalhes...<button class="close-round" data-action="close">${icon('close')}</button></div></div>`;const bg=pics(d),seasons=d.seasons||[],media=mediaType(d);const recom=detailsRecommendations(d);const epi=state.episodes;const info=d.credits?.cast?.slice(0,4).map(p=>p.name).join(', ')||'Consulte o catálogo';return `<div class="veil soft" data-backdrop="1"><article class="overlay-card detail-card" role="dialog" aria-label="Detalhes de ${esc(title(d))}" aria-modal="true"><button class="close-round" data-action="close" aria-label="Fechar">${icon('close')}</button><div class="modal-hero">${bg?`<img src="${bg}" alt="">`:''}<div class="modal-hero-content"><div class="hero-flag">Uma descoberta LISOFLIX</div><h2>${esc(title(d))}</h2><div class="hero-actions"><button class="btn btn-white" data-action="play" data-id="${d.id}" data-type="${media}">${icon('play')} Assistir</button><button class="btn btn-glass" title="${isSaved(d)?'Remover da lista':'Adicionar à minha lista'}" data-action="favorite">${icon(isSaved(d)?'check':'plus')} ${isSaved(d)?'Salvo':'Minha lista'}</button>${state.activeProfile?`<button class="btn btn-glass" data-action="markwatched">${icon('check')} ${historyEntry(d)?.watched?'Desmarcar assistido':'Marcar assistido'}</button>`:''}${dVideo(d)?`<button class="btn btn-glass" data-action="trailer">${icon('film')} Trailer</button>`:''}</div><div id="reactions-live">${reactionsMarkup()}</div></div></div><div class="modal-info"><div class="meta-split"><div><div class="meta-tags"><span style="color:var(--aqua);font-weight:800">${esc(average(d))}</span><span>${esc(year(d))}</span><span>${media==='tv'?`${seasons.filter(x=>x.season_number>0).length} temporada(s)`:'Filme'}</span><span class="age-badge">Consulte a classificação</span></div><p class="modal-overview">${esc(d.overview||'Sinopse indisponível por enquanto.')}</p></div><div class="small-meta"><div><span class="muted">Elenco:</span> <b>${esc(info)}</b></div><div><span class="muted">Gêneros:</span> <b>${esc((d.genres||[]).map(x=>x.name).join(', ')||'Variados')}</b></div><div><span class="muted">Áudio:</span> <b>depende do player</b></div><div><span class="muted">Informações:</span> <b>Catálogo de entretenimento</b></div></div></div>
${media==='tv'?`<section class="detail-section"><div class="episode-toolbar"><h3>Episódios</h3><select id="season-selector" aria-label="Selecionar temporada">${seasons.filter(x=>x.season_number>=0).map(x=>`<option value="${x.season_number}" ${state.activeSeason===x.season_number?'selected':''}>${esc(x.name||`Temporada ${x.season_number}`)} (${x.episode_count||0})</option>`).join('')}</select></div><div>${epi.length?epi.slice(0,state.showAllEpisodes?epi.length:10).map(e=>`<button class="episode" data-action="episode" data-season="${state.activeSeason}" data-ep="${e.episode_number}"><span class="epi-num">${e.episode_number}</span>${img(e.still_path)?`<img class="epi-thumb" src="${img(e.still_path,'w300')}" loading="lazy" alt="">`:`<div class="epi-thumb" style="display:grid;place-items:center;color:#8c91a0">${icon('play')}</div>`}<span><h4>${esc(e.name||`Episódio ${e.episode_number}`)}</h4><p>${esc(e.overview||'Descubra o que acontece nesse episódio.')}</p></span><span class="duration">${e.runtime||'--'}min</span></button>`).join(''):`<div class="episode-empty">${state.isDemo?'A prévia não inclui episódios. Configure o TMDB para carregar as temporadas reais.':'Carregando episódios ou detalhes ainda indisponíveis.'}</div>`}</div>${epi.length>10?`<button class="btn btn-dark" data-action="moreeps">${state.showAllEpisodes?'Mostrar menos':'Ver todos os episódios'} ${icon('down')}</button>`:''}</section>`:''}
${media==='movie'&&d.belongs_to_collection?`<section class="detail-section" id="collection-slot"><h3>Esta história faz parte de uma coleção</h3><p class="small-meta">Carregando coleção...</p></section>`:''}
${recom.length?`<section class="detail-section"><h3>Títulos semelhantes a ${esc(title(d))}</h3><div class="related-grid">${recom.map(m=>`<button class="related-card" data-action="detail" data-type="${mediaType(m)}" data-id="${m.id}">${pics(m)?`<img class="pic" loading="lazy" src="${pics(m)}" alt="">`:`<div class="pic"></div>`}<div class="rel-body"><b>${esc(title(m))}</b><p>${esc(m.overview||'Descubra mais.')}</p></div></button>`).join('')}</div></section>`:''}
<section class="detail-section"><h3>${icon('message')} Comentários da comunidade</h3>${state.activeProfile?`<form id="comment-form" class="comment-form"><input class="field" name="comment" minlength="2" maxlength="500" required placeholder="O que achou dessa história?" aria-label="Seu comentário"><button class="btn btn-main" type="submit">Enviar</button></form>`:'<p class="small-meta">Entre e escolha um perfil para comentar.</p>'}<div id="comments-list">${commentsMarkup()}</div></section></div></article></div>`;}
function authModal(){return `<div class="veil soft" data-backdrop="1"><div class="overlay-card auth-card" role="dialog" aria-label="Entrar ou criar conta"><button class="close-round" data-action="close">${icon('close')}</button><div class="logo"><img class="brand-mark brand-inline" src="/brand/lisoflix-wordmark.webp" width="360" height="124" alt="LISOFLIX" decoding="async"></div><h2>${state.authMode==='register'?'Crie sua conta':'Que bom te ver de novo.'}</h2><p>${state.authMode==='register'?'Seu universo de histórias começa com um e-mail e uma senha.':'Entre para manter seus perfis, favoritos e conversas em um só lugar.'}</p><div class="form-error" id="form-error"></div><form class="auth-form" id="auth-form">${state.authMode==='register'?`<label>Nome do primeiro perfil<input class="field" name="name" required maxlength="24" placeholder="Como devemos te chamar?" autocomplete="nickname"></label>`:''}<label>E-mail<input class="field" name="email" type="email" placeholder="seunome@email.com" autocomplete="email" required></label><label>Senha<input class="field" name="password" type="password" placeholder="${state.authMode==='register'?'Mínimo de 10 caracteres':'Sua senha'}" autocomplete="${state.authMode==='register'?'new-password':'current-password'}" minlength="${state.authMode==='register'?'10':'1'}" required></label><button class="btn btn-main" type="submit">${state.authMode==='register'?'Criar conta':'Entrar'}</button></form><button class="auth-toggle" data-action="authswitch">${state.authMode==='register'?'Já tenho uma conta. Entrar.':'Ainda não tenho conta. Criar agora.'}</button><p class="micro">Seus dados ficam no Cloudflare D1. Não compartilhe sua senha.</p></div></div>`;}
function profilesModal(){return `<div class="veil soft" data-backdrop="1"><div class="profiles-screen"><button class="close-round" data-action="close">${icon('close')}</button><img class="profiles-brand-emblem" src="/brand/lisoflix-emblem.webp" width="96" height="96" alt=""><div class="hero-flag">Seu espaço, suas histórias</div><h2>Quem vai dar o play?</h2><p>Escolha um perfil para entrar na LISOFLIX.</p><div class="profile-cards">${state.profiles.map(p=>`<button class="profile-card" data-action="selectprofile" data-id="${p.id}"><div class="avatar">${p.avatar?`<img loading="lazy" src="/avatars/${encodeURIComponent(p.avatar)}" alt="">`:esc(p.name.slice(0,1).toUpperCase())}</div><b>${esc(p.name)} </b></button>`).join('')}${state.profiles.length<5?`<button class="profile-card" data-action="manage"><div class="avatar" style="background:#232631;color:#b5bdcf">${icon('plus')}</div><b>Adicionar</b></button>`:''}</div><button class="btn btn-outline" data-action="manage">${icon('settings')} Gerenciar perfis</button></div></div>`;}
function manageModal(){const p=state.manageProfile,editing=state.profileFormOpen;
 return `<div class="veil soft" data-backdrop="1"><div class="overlay-card auth-card profile-manager" role="dialog" aria-label="Gerenciar perfis"><button class="close-round" data-action="close" aria-label="Fechar">${icon('close')}</button><div class="logo"><img class="brand-mark brand-inline" src="/brand/lisoflix-wordmark.webp" width="360" height="124" alt="LISOFLIX"></div><h2>${editing?(p?'Editar perfil':'Novo perfil'):'Gerenciar perfis'}</h2><p>${editing?'Altere somente o que deseja. Sem senha ou PIN de perfil.':'Selecione um perfil para editar ou crie outro, se precisar. O primeiro perfil já é criado junto com a conta.'}</p>
 ${!editing?`<div class="profile-manage-list">${state.profiles.map(x=>`<button class="profile-card" data-action="editprofile" data-id="${esc(x.id)}"><div class="avatar">${x.avatar?`<img src="/avatars/${encodeURIComponent(x.avatar)}" alt="">`:esc(x.name.slice(0,1).toUpperCase())}</div><b>${esc(x.name)}</b><span>Editar perfil</span></button>`).join('')}</div><div class="profile-manager-actions">${state.profiles.length<5?`<button type="button" class="btn btn-main" data-action="newprofile">${icon('plus')} Adicionar perfil</button>`:''}<button type="button" class="btn btn-outline" data-action="profiles">Voltar à seleção</button></div>`:
 `<form class="profile-form" id="profile-form"><label>Nome do perfil<input name="name" class="field" required maxlength="24" value="${esc(p?.name||'')}" placeholder="Como prefere ser chamado?"></label><span class="small-meta">Avatares disponíveis na pasta /public/avatars (PNG, JPG, GIF, WebP).</span><div class="avatar-gallery"><button class="avatar-choice avatar-default ${!state.chosenAvatar?'selected':''}" type="button" data-action="avatar" data-avatar="">✦</button>${state.avatars.map(a=>`<button class="avatar-choice ${state.chosenAvatar===a?'selected':''}" type="button" data-action="avatar" data-avatar="${esc(a)}"><img loading="lazy" src="/avatars/${encodeURIComponent(a)}" alt=""></button>`).join('')}</div><label class="kids-profile-label"><input name="isKids" type="checkbox" ${p?.isKids?'checked':''}> Identificar como infantil (a filtragem por idade ainda não está habilitada)</label><div class="profile-manager-actions"><button class="btn btn-main" type="submit">${p?'Salvar perfil':'Criar perfil'}</button><button class="btn btn-outline" type="button" data-action="manage">Cancelar</button></div>${p&&state.profiles.length>1?`<button class="btn btn-dark profile-delete" type="button" data-action="deleteprofile" data-id="${esc(p.id)}">Excluir este perfil</button>`:''}</form>`}</div></div>`;
}
let lastProgressSave=0;
async function savePlayerProgress(pos,duration){
 const d=state.detail;if(!d||!state.activeProfile||!state.playback?.available)return;
 const ep=state.playerEpisode;
 try {await post('/api/watch',{type:mediaType(d),id:d.id,season:ep?.season||0,episode:ep?.episode||0,position:pos,duration,snapshot:briefSnapshot(d)});}
 catch(e){console.warn('Não foi possível guardar progresso:',e.message);}
}
function clock(t){if(!Number.isFinite(t))return '0:00';t=Math.max(0,Math.floor(t));return `${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`;}
function attachNativePlayer(resumeAt=0){
 const video=$('#native-player');if(!video)return;
 video.addEventListener('loadedmetadata',()=>{if(resumeAt>3&&resumeAt<video.duration-5){video.currentTime=resumeAt;}syncVideoControls(video);});
 video.addEventListener('timeupdate',()=>{syncVideoControls(video);if(video.currentTime-lastProgressSave>15){lastProgressSave=video.currentTime;savePlayerProgress(video.currentTime,video.duration);}});
 video.addEventListener('pause',()=>savePlayerProgress(video.currentTime,video.duration));
 video.addEventListener('ended',()=>{savePlayerProgress(video.duration,video.duration);if(state.activeProfile&&state.detail&&mediaType(state.detail)==='movie'){void post('/api/watch/mark',{type:'movie',id:state.detail.id,watched:true,snapshot:briefSnapshot(state.detail)}).then(()=>refreshLibrary()).catch(()=>{});}});
 video.addEventListener('error',()=>{const status=$('#video-status');if(status)status.textContent='Este vídeo não pôde ser carregado. Confirme a URL, o formato e as permissões da origem.';});
 video.addEventListener('play',()=>syncVideoControls(video));
}
function syncVideoControls(video){const seek=$('#video-seek'),clockEl=$('#video-clock'),btn=document.querySelector('[data-action="pauseplay"]');if(seek&&video.duration)seek.value=String(video.currentTime/video.duration*100);if(clockEl)clockEl.textContent=`${clock(video.currentTime)} / ${clock(video.duration)}`;if(btn)btn.innerHTML=video.paused?icon('play'):'❚❚';}
// Validar a URL completa contra formatos documentados. Nunca confiar em domínio injetado pelo catálogo.
function validEmbedOption(p){if(!p||typeof p.url!=='string')return false;
 let url;try{url=new URL(p.url);}catch{return false;}
 if(url.protocol!=='https:'||url.search||url.hash||url.port||url.username||url.password)return false;
 if(p.provider==='embedmovies')return url.hostname==='myembed.biz'&&/^\/(filme\/[1-9]\d*|serie\/[1-9]\d*\/[1-9]\d*\/[1-9]\d*)$/.test(url.pathname);
 if(p.provider==='vidsrc')return url.hostname==='vidsrc.mov'&&/^\/embed\/(movie\/[1-9]\d*|tv\/[1-9]\d*\/[1-9]\d*\/[1-9]\d*)$/.test(url.pathname);
 if(p.provider==='superflix')return url.hostname==='superflixapi.fun'&&/^\/(filme\/[1-9]\d*|serie\/[1-9]\d*\/[1-9]\d*\/[1-9]\d*)$/.test(url.pathname);
 return false;
}
// O player incorpora conteúdo de terceiros. Nunca inspecionar ou alterar o DOM externo.
function embedSandboxAttr(p){return validEmbedOption(p)?' sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"':'';}
function playerModal(){
 const d=state.detail;if(!d)return '';
 const ep=state.playerEpisode, epName=ep?` · T${ep.season}E${ep.episode}`:'';
 const source=state.playback;
 const options=source?.mode==='iframe'&&source?.available
  ?(Array.isArray(source.players)&&source.players.length?source.players:[{provider:'embedmovies',label:source.label||'Player principal',url:source.url}])
    .filter(validEmbedOption)
  :[];
 const chosenIndex=Math.max(0,Math.min(options.length-1,Number(state.playerOptionIndex)||0));
 const activeEmbed=options[chosenIndex];

 const playbackReason=source?.error?`Falha ao consultar o player: ${esc(source.error)}.`:
 source?.reason==='no-source-configured'?'Ainda não há uma fonte autorizada para este título.':
 source?.reason==='source-not-allowed'?'O domínio do vídeo precisa constar em MEDIA_ALLOWED_HOSTS na configuração segura do Worker.':
 source?.reason==='catalog-only'?'O banco D1 está incompleto ou não está ligado ao Worker.':
 source?.reason==='invalid-format'?'O formato do vídeo cadastrado não é aceito pelo player nativo.':
 source?.reason==='invalid-url'?'A URL cadastrada para reprodução é inválida.':
 source?.reason==='invalid-embed'?'Os dados do episódio ou do player externo estão inválidos.':
 'Não foi possível encontrar uma fonte de vídeo válida para este título.';
 return `<div class="veil player-veil"><div class="player-shell">
 <div class="player-toolbar"><button class="return" data-action="backdetail" aria-label="Voltar aos detalhes">${icon('left')}</button><h2>${esc(title(d))}${epName}</h2>${source?.available&&source.mode==='iframe'&&activeEmbed?`<div class="player-tools"><label class="player-select-label">Fonte de vídeo <select id="player-provider-select" aria-label="Escolher fonte de vídeo">${options.map((p,i)=>`<option value="${i}" ${chosenIndex===i?'selected':''}>${i===0?'Principal':`Alternativa ${i}`} · ${esc(p.label||p.provider)}</option>`).join('')}</select></label><button type="button" class="player-tool player-tool-icon" data-action="retryembed" title="Recarregar esta fonte" aria-label="Recarregar esta fonte">${icon('refresh')}</button></div>`:''}<span class="player-brand"><img src="/brand/lisoflix-emblem.webp" width="34" height="34" alt=""> LISOFLIX</span></div>
 <div class="player-viewport branded-video">
 ${!source||source.loading?`<div class="player-message">${icon('refresh')}<h3>Buscando uma fonte de vídeo disponível…</h3><p>Aguarde enquanto verificamos a disponibilidade deste título.</p></div>`:
 source.available&&source.mode==='iframe'&&activeEmbed?`<div class="embed-video-wrap"><iframe class="embed-video-frame" src="${esc(activeEmbed.url)}" title="Player ${chosenIndex+1} de ${esc(title(d))}" allow="autoplay; encrypted-media; fullscreen; picture-in-picture"${embedSandboxAttr(activeEmbed)} referrerpolicy="strict-origin-when-cross-origin" allowfullscreen loading="eager" fetchpriority="high"></iframe></div>`:
 source.available&&source.mode==='native'?`<div class="native-video-wrap"><video id="native-player" playsinline preload="metadata" poster="${esc(pics(d)||'')}"><source src="${esc(source.url)}" type="${esc(source.mime)}">Seu navegador não consegue reproduzir este formato.</video><div class="native-controls"><button class="native-control" data-action="pauseplay" aria-label="Reproduzir ou pausar">${icon('play')}</button><span id="video-clock">0:00 / 0:00</span><input id="video-seek" type="range" value="0" min="0" max="100" step=".1" aria-label="Progresso do vídeo"><button class="native-control" data-action="mutetoggle" aria-label="Silenciar">${icon('volume')}</button><input id="video-volume" type="range" min="0" max="1" value="1" step=".05" aria-label="Volume"><button class="native-control" data-action="fullscreen" aria-label="Tela cheia">⛶</button></div><p class="video-status" id="video-status" aria-live="polite"></p></div>`:
 `<div class="player-message"><img class="unavailable-emblem" src="/brand/lisoflix-emblem.webp" alt=""/><h3>Reprodução indisponível para este título</h3><p>${playbackReason} O catálogo fornece informações e capas, mas não arquivos de reprodução. Você ainda pode assistir ao trailer, quando disponível.</p><div class="player-buttons"><button class="btn btn-main" data-action="backdetail">Voltar aos detalhes</button>${dVideo(d)?`<button class="btn btn-glass" data-action="trailer">${icon('film')} Ver trailer</button>`:''}</div></div>`}
 </div></div></div>`;
}

function trailerModal(){const d=state.detail,k=dVideo(d)?.key;if(!k)return '' ;return `<div class="veil player-veil"><div class="player-shell"><div class="player-toolbar"><button class="return" data-action="backdetail">${icon('left')}</button><h2>Trailer · ${esc(title(d))}</h2></div><div class="player-viewport"><iframe class="trailer-box" title="Trailer de ${esc(title(d))}" src="https://www.youtube-nocookie.com/embed/${k}?autoplay=1" sandbox="allow-scripts allow-same-origin allow-presentation" allow="autoplay; fullscreen" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div></div></div>`;}
function renderOverlay(){if(!state.overlay){overlay.innerHTML='';document.body.classList.remove('modal-open');return;}const el=$('.veil');const position=el?.scrollTop||0;overlay.innerHTML=state.overlay==='detail'?detailsModal():state.overlay==='auth'?authModal():state.overlay==='profiles'?profilesModal():state.overlay==='manage'?manageModal():state.overlay==='play'?playerModal():state.overlay==='trailer'?trailerModal():'';if(state.overlay==='detail'&&position)overlay.querySelector('.veil').scrollTop=position;document.body.classList.add('modal-open');if(state.overlay==='detail'&&state.detail?.belongs_to_collection)loadCollection(state.detail);}
async function loadCollection(d){const slot=$('#collection-slot');if(!slot||slot.dataset.loaded)return;slot.dataset.loaded='1';try{const coll=await api(`/api/collection?id=${d.belongs_to_collection.id}`);const parts=(coll.parts||[]).filter(x=>x.id!==d.id);if(slot.isConnected)slot.innerHTML=`<h3>${esc(d.belongs_to_collection.name||'Coleção')}</h3><div class="related-grid">${parts.map(x=>`<button class="related-card" data-action="detail" data-type="movie" data-id="${x.id}">${pics(x)?`<img class="pic" src="${pics(x)}" loading="lazy" alt="">`:''}<div class="rel-body"><b>${esc(title(x))}</b><p>${esc((x.overview||'').slice(0,150))}</p></div></button>`).join('')||'<p class="muted">Coleção sem outros títulos.</p>'}</div>`;}catch{if(slot.isConnected)slot.remove();}}
function close(){
 if(/\/(titulo|assistir|trailer)\//.test(location.hash)){if(history.state?.lf)history.back();else{history.replaceState(null,'',`#/${state.page}`);state.overlay=null;renderOverlay();}return;}
 state.overlay=null;renderOverlay();
}
async function selectProfile(id,pin=''){const p=state.profiles.find(x=>x.id===id);if(!p)return; try{await post('/api/profiles/select',{id});state.activeProfile=id;state.profileMenu=false;state.overlay=null;await refreshLibrary();render();if(state.detail)loadReactions();toast(`Olá, ${p.name}!`);}catch(e){bannerError(e);}}
function requireProfile(){if(!state.user){state.overlay='auth';state.authMode='login';renderOverlay();return false;}if(!state.activeProfile){state.overlay='profiles';renderOverlay();return false;}return true;}
async function toggleFavorite(){if(!requireProfile())return;try{const d=state.detail;const result=await post('/api/library/toggle',{type:mediaType(d),id:d.id,snapshot:briefSnapshot(d)});await refreshLibrary();renderOverlay();toast(result.saved?'Adicionado à sua lista.':'Removido da sua lista.');}catch(e){bannerError(e);}}
async function startPlay(episode=null,{push=true}={}){
 if(!state.detail)return;const d=state.detail;
 // O botão 'Assistir' de séries abre o primeiro episódio da temporada selecionada.
 // Se a temporada ainda não carregou, aguarda uma consulta para obter o número real.
 if(mediaType(d)==='tv'&&!episode){
   const s=state.activeSeason>0?state.activeSeason:(d.seasons||[]).find(x=>x.season_number>0)?.season_number;
   if(!s){toast('Esta série ainda não tem temporada disponível.','error');return;}
   let episodes=state.episodes;
   if(!episodes.length){try{const seasonData=await api(`/api/season?id=${d.id}&season=${s}`);if(state.detail?.id!==d.id)return;episodes=seasonData.episodes||[];state.episodes=episodes;}catch{toast('Não foi possível carregar os episódios agora.','error');return;}}
   const first=episodes.find(x=>Number.isInteger(+x.episode_number)&&+x.episode_number>0);
   if(!first){toast('Esta temporada ainda não tem episódios disponíveis.','error');return;}
   episode={season:s,episode:+first.episode_number};
 }
 state.playerEpisode=episode;
 if(push)history.pushState({lf:true,overlay:'play'},'',`#/${state.page}/assistir/${mediaType(d)}/${d.id}/${episode?.season||0}/${episode?.episode||0}`);
 state.overlay='play';state.playback={loading:true};state.playerOptionIndex=0;lastProgressSave=0;renderOverlay();
 try {const playback=await api(`/api/playback?type=${mediaType(d)}&id=${d.id}&season=${episode?.season||0}&episode=${episode?.episode||0}`);if(state.detail?.id!==d.id||state.overlay!=='play')return;state.playback=playback;renderOverlay();if(playback.available){void post('/api/watch',{type:mediaType(d),id:d.id,season:episode?.season||0,episode:episode?.episode||0,snapshot:briefSnapshot(d)}).then(()=>refreshLibrary()).catch(()=>{});}if(playback.available&&playback.mode!=='iframe'){attachNativePlayer(playback.position||0);}}
 catch(e){state.playback={available:false,error:e.message};if(state.overlay==='play')renderOverlay();}
}
async function manage(){state.overlay='manage';state.manageProfile=null;state.profileFormOpen=false;state.chosenAvatar='';try{const m=await fetch('/avatars/manifest.json').then(r=>r.json());state.avatars=(m.avatars||[]).filter(a=>/^[a-zA-Z0-9_-]+\.(gif|png|jpe?g|webp)$/i.test(a)).slice(0,100);}catch{state.avatars=[];}renderOverlay();}
async function submitAuth(form){const data=Object.fromEntries(new FormData(form));const btn=form.querySelector('[type=submit]');btn.disabled=true;try{const res=await post(`/api/auth/${state.authMode==='register'?'register':'login'}`,data);state.user=res.user;state.profiles=res.profiles||[];state.activeProfile=res.activeProfile||null;state.overlay=state.activeProfile?null:'profiles';await refreshLibrary();render();toast('Conta conectada com sucesso.');}catch(e){const err=$('#form-error');if(err){err.textContent=e.message;err.style.display='block';}else bannerError(e);}finally{btn.disabled=false;}}
async function submitProfile(form){const fd=new FormData(form),p=state.manageProfile;const data={name:String(fd.get('name')||''),avatar:state.chosenAvatar,isKids:fd.has('isKids')};if(p){Object.assign(data,{id:p.id});}else{}try{await post(p?'/api/profiles/update':'/api/profiles',data);await refreshMe();state.manageProfile=null;state.profileFormOpen=false;state.chosenAvatar='';renderOverlay();toast(p?'Perfil atualizado.':'Perfil criado.');}catch(e){bannerError(e);}}
async function action(a,el){switch(a){
 case 'mobilemenu':state.menuOpen=!state.menuOpen;render();break;
 case 'searchtoggle':state.searchOpen=!state.searchOpen;state.profileMenu=false;render();state.searchOpen&&$('.header-search input')?.focus();break;
 case 'searchclose':state.searchOpen=false;render();break;
 case 'profilemenu':state.profileMenu=!state.profileMenu;render();break;
 case 'detail':{const id=+el.dataset.id,type=el.dataset.type;await openDetail(type,id);break;}
 case 'close':close();break;
 case 'hero':state.heroIndex=+el.dataset.index;render();break;
 case 'rail':{const rail=el.closest('.section')?.querySelector('.rail-scroll');rail?.scrollBy({left:+el.dataset.dir*rail.clientWidth*.72,behavior:'smooth'});break;}
 case 'goto':await navigate('inicio');break;
 case 'goback':if(history.state?.lf&&history.length>1)history.back();else await navigate('inicio');break;
 case 'auth':state.authMode='login';state.overlay='auth';renderOverlay();break;
 case 'authswitch':state.authMode=state.authMode==='login'?'register':'login';renderOverlay();break;
 case 'favorite':await toggleFavorite();break;
 case 'markwatched':{if(!requireProfile()||!state.detail)break;const d=state.detail;const mark=!historyEntry(d)?.watched;try{await post('/api/watch/mark',{type:mediaType(d),id:d.id,watched:mark,snapshot:briefSnapshot(d)});await refreshLibrary();renderOverlay();toast(mark?'Marcado como assistido.':'Removido dos assistidos.');}catch(e){bannerError(e);}break;}
 case 'editcomment':{const c=state.comments.find(x=>x.id===el.dataset.id&&x.mine);if(!c)break;state.editingCommentId=c.id;const node=$('#comments-list');if(node)node.innerHTML=commentsMarkup();$('#comment-edit-input')?.focus();break;}
 case 'cancelcomment':state.editingCommentId=null;{const node=$('#comments-list');if(node)node.innerHTML=commentsMarkup();}break;
 case 'savecomment':{const c=state.comments.find(x=>x.id===el.dataset.id&&x.mine);if(!c)break;const value=$('#comment-edit-input')?.value?.trim()||'';if(value.length<2||value.length>500){toast('O comentário deve ter de 2 a 500 caracteres.','error');break;}try{await post('/api/comments/edit',{id:c.id,content:value});state.editingCommentId=null;await loadComments();toast('Comentário atualizado.');}catch(e){bannerError(e);}break;}
 case 'deletecomment':{const c=state.comments.find(x=>x.id===el.dataset.id&&x.mine);if(!c||!confirm('Excluir seu comentário?'))break;try{await post('/api/comments/delete',{id:c.id});await loadComments();toast('Comentário excluído.');}catch(e){bannerError(e);}break;}
 case 'vote':{if(!requireProfile())break;const d=state.detail;if(!d)break;const voted=+el.dataset.vote;const vote=state.reactions.mine===voted?0:voted;try{await post('/api/reactions',{type:mediaType(d),id:d.id,vote});await loadReactions();toast(vote===0?'Avaliação removida.':'Avaliação registrada!');}catch(e){bannerError(e);}break;}
 case 'play':await startPlay();break;
 case 'episode':await startPlay({season:+el.dataset.season,episode:+el.dataset.ep});break;
 case 'backdetail':if(location.hash.includes('/assistir/')||location.hash.includes('/trailer/')){history.back();}else{state.overlay='detail';renderOverlay();}break;
 case 'trailer':if(state.detail){history.pushState({lf:true,overlay:'trailer'},'',`#/${state.page}/trailer/${mediaType(state.detail)}/${state.detail.id}`);}state.overlay='trailer';renderOverlay();break;
 case 'moreeps':state.showAllEpisodes=!state.showAllEpisodes;renderOverlay();break;
 case 'profiles':if(!state.user){state.overlay='auth';state.authMode='login';}else{state.overlay='profiles';state.profileMenu=false;}renderOverlay();break;
 case 'selectprofile':await selectProfile(el.dataset.id);break;
 case 'manage':await manage();break;
 case 'editprofile':state.manageProfile=state.profiles.find(x=>x.id===el.dataset.id);state.profileFormOpen=!!state.manageProfile;state.chosenAvatar=state.manageProfile?.avatar||'';renderOverlay();break;
 case 'newprofile':state.manageProfile=null;state.profileFormOpen=true;state.chosenAvatar='';renderOverlay();break;
 case 'avatar':state.chosenAvatar=el.dataset.avatar||'';document.querySelectorAll('.avatar-choice').forEach(b=>b.classList.toggle('selected',b.dataset.avatar===state.chosenAvatar));break;
 case 'deleteprofile':{const p=state.manageProfile;if(!p||!confirm(`Excluir o perfil "${p.name}" e sua lista?`))break;try{await post('/api/profiles/delete',{id:p.id});await refreshMe();state.overlay='profiles';renderOverlay();toast('Perfil excluído.');}catch(e){bannerError(e);}break;}
 case 'switchplayer':{const ps=state.playback?.players;if(Array.isArray(ps)&&ps.length>1){state.playerOptionIndex=((Number(state.playerOptionIndex)||0)+1)%ps.length;renderOverlay();toast('Fonte de vídeo alterada.');}break;}
 case 'retryembed':{const frame=$('.embed-video-frame');if(frame?.src){frame.src=frame.src;toast('Tentando carregar o player novamente.');}break;}
 case 'pauseplay':{const v=$('#native-player');if(v){if(v.paused)v.play().catch(()=>{});else v.pause();}break;}
 case 'mutetoggle':{const v=$('#native-player');if(v){v.muted=!v.muted;syncVideoControls(v);}break;}
 case 'fullscreen':{const v=$('.native-video-wrap');if(v?.requestFullscreen)v.requestFullscreen().catch(()=>{});break;}
 case 'logout':try{await post('/api/auth/logout',{});}catch{}state.user=null;state.profiles=[];state.activeProfile=null;state.library={list:[],watching:[]};state.profileMenu=false;state.overlay=null;render();toast('Você saiu da conta.');break;
 } }
// Delegação central: mídias e carrosséis continuam interativos após renders.
document.addEventListener('error',e=>{if(e.target.matches?.('.embed-video-frame')&&state.overlay==='play'){
 // Somente falhas de rede que o próprio navegador notificar. Nunca inferir anúncios/Premium do iframe.
 const options=state.playback?.players||[];
 if(state.playerOptionIndex===0&&options.length>1&&validEmbedOption(options[1])){state.playerOptionIndex=1;renderOverlay();toast('A primeira fonte falhou ao carregar. Abrindo a alternativa.','error');}
 return;
 }if(e.target.matches?.('.tile-img')){if(!e.target.dataset.triedPoster&&e.target.dataset.poster&&e.target.src!==e.target.dataset.poster){e.target.dataset.triedPoster='1';e.target.src=e.target.dataset.poster;return;}e.target.style.display='none';const fallback=e.target.nextElementSibling;if(fallback)fallback.hidden=false;}if(e.target.matches?.('.modal-hero > img'))e.target.style.display='none';},true);
document.addEventListener('click',async e=>{const el=e.target.closest('[data-action],[data-page]');if(el){e.preventDefault();if(el.dataset.page){await navigate(el.dataset.page);return;}await action(el.dataset.action,el);return;}if(e.target.matches('[data-backdrop]'))close();else if(state.profileMenu&&!e.target.closest('.dropdown,.profile-trigger')){state.profileMenu=false;render();}});
document.addEventListener('submit',async e=>{const form=e.target;if(form.id==='auth-form'){e.preventDefault();await submitAuth(form);}if(form.id==='profile-form'){e.preventDefault();await submitProfile(form);}if(form.id==='comment-form'){e.preventDefault();if(!requireProfile())return;const input=form.querySelector('input'),value=input.value.trim();if(!value)return;try{await post('/api/comments',{type:mediaType(state.detail),id:state.detail.id,content:value});input.value='';await loadComments();toast('Comentário publicado.');}catch(err){bannerError(err);}}if(form.id==='search-form'){e.preventDefault();state.search=new FormData(form).get('search')||'';state.searchOpen=false;state.searchSuggestions=[];await navigate('busca');}});
document.addEventListener('input',e=>{if(e.target.closest('#search-form')&&e.target.name==='search'){state.search=e.target.value;clearTimeout(searchTimer);searchTimer=setTimeout(()=>runSearch({preview:true}),280);return;}const v=$('#native-player');if(!v)return;if(e.target.id==='video-seek'&&Number.isFinite(v.duration))v.currentTime=v.duration*(Number(e.target.value)/100);if(e.target.id==='video-volume'){v.volume=Number(e.target.value);v.muted=false;}});
document.addEventListener('change',async e=>{if(e.target.id==='player-provider-select'){const i=Number(e.target.value);if(Number.isSafeInteger(i)&&i>=0&&i<(state.playback?.players?.length||0)){state.playerOptionIndex=i;renderOverlay();}return;}if(e.target.id==='season-selector'){state.showAllEpisodes=false;await loadSeason(+e.target.value);}if(e.target.id==='genre-select'){state.genre=e.target.value;await loadGenre();}if(e.target.id==='langsel'||e.target.id==='mediasel'){state.language=$('#langsel').value;state.languageType=$('#mediasel').value;await loadDiscover();}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.overlay)close();if(e.key==='/'&&!state.overlay&&!state.searchOpen){e.preventDefault();state.searchOpen=true;render();$('.header-search input')?.focus();}});
window.addEventListener('scroll',updateHeader,{passive:true});
let routeSync=0;
async function syncFromAddress(){
 const mine=++routeSync,parts=(location.hash||'#/inicio').replace(/^#\//,'').split('/');const page=(headerPages.some(([p])=>p===parts[0])||parts[0]==='busca')?parts[0]:'inicio';
 if(state.page!==page){await navigate(page,{push:false});if(mine!==routeSync)return;}
 const verb=parts[1],type=parts[2],id=+parts[3];
 if(!['titulo','assistir','trailer'].includes(verb)){if(state.overlay==='detail'||state.overlay==='play'||state.overlay==='trailer'){state.overlay=null;renderOverlay();}return;}
 if(!['movie','tv'].includes(type)||!Number.isSafeInteger(id)||id<1){state.overlay=null;renderOverlay();return;}
 if(!state.detail||state.detail.id!==id||mediaType(state.detail)!==type){await openDetail(type,id,{push:false,show:verb==='titulo'?'detail':'detail'});if(mine!==routeSync)return;}
 if(verb==='assistir'){const season=+parts[4]||0,episode=+parts[5]||0;if(state.overlay==='play'&&state.playback&&!state.playback.loading&&state.playerEpisode?.season===season&&state.playerEpisode?.episode===episode)return;await startPlay(season||episode?{season,episode}:null,{push:false});}
 else {state.overlay=verb==='trailer'?'trailer':'detail';renderOverlay();}
}
window.addEventListener('popstate',syncFromAddress);
window.addEventListener('hashchange',syncFromAddress);
setInterval(()=>{if(state.overlay==='detail'&&!document.hidden){loadComments();loadReactions();}},5000);
async function refreshVisibleCatalog(){
 if(document.hidden||state.overlay)return;
 const page=state.page, cfg=pageConfig[page];if(!cfg)return;
 const names=[...new Set(cfg.sections.map(x=>x[0]))];
 const results=await Promise.all(names.map(async sec=>{try{return [sec,await api(`/api/catalog?section=${encodeURIComponent(sec)}`)];}catch{return null;}}));
 if(state.page!==page)return;
 let changed=false;
 for(const item of results){if(!item)continue;const [sec,data]=item;const old=state.sections[sec]?.results||[];
  const merged=[...(data.results||[])],seen=new Set(merged.map(key));
  for(const m of old){if(!seen.has(key(m))){merged.push(m);seen.add(key(m));}}
  if(JSON.stringify(old.map(key))!==JSON.stringify(merged.map(key)))changed=true;
  state.sections[sec]={...data,results:merged.slice(0,60)};
 }
 if(!changed)return;
 const positions=new Map([...document.querySelectorAll('.section[id]')].map(el=>[el.id,el.querySelector('.rail-scroll')?.scrollLeft||0]));
 render();for(const [id,pos] of positions){const el=document.getElementById(id);if(el?.querySelector('.rail-scroll'))el.querySelector('.rail-scroll').scrollLeft=pos;}
}
setInterval(refreshVisibleCatalog,120000);
setInterval(()=>{if(!document.hidden&&state.activeProfile)void refreshLibrary().then(()=>{if(!state.overlay)renderCatalogWithoutScrollJump(state.page);});},30000);
// Destaques mudam apenas a imagem e o texto do hero; os carrosséis não perdem sua posição.
setInterval(()=>{
 if(document.hidden||state.overlay||state.page!=='inicio'||heroSlides().length<2)return;
 state.heroIndex=(state.heroIndex+1)%heroSlides().length;
 const old=document.querySelector('.hero');if(!old)return;
 const shell=document.createElement('div');shell.innerHTML=renderHero();old.replaceWith(shell.firstElementChild);
},14000);
async function init(){
 // Configuração e sessão são independentes. Não bloquear catálogo na Minha Lista.
 await Promise.all([
  api('/api/config').then(c=>{state.config=c;}).catch(()=>{state.config={tmdb:false,embeds:false};}),
  refreshMe()
 ]);
 state.isDemo=!state.config.tmdb;
 const route=(location.hash||'#/inicio').replace(/^#\//,'').split('/')[0];
 state.page=(headerPages.some(x=>x[0]===route)||route==='busca')?route:'inicio';
 const libraryReady=refreshLibrary().then(()=>{
  // O painel pode começar a carregar antes das listas do usuário.
  if(!state.overlay){if(pageConfig[state.page])renderCatalogWithoutScrollJump(state.page);else render();}
 });
 if(state.page==='minha-lista')render();
 else if(state.page==='idiomas')void loadDiscover();
 else if(state.page==='busca')void runSearch();
 else void loadSections(state.page);
 if(state.user&&!state.activeProfile){state.overlay='profiles';renderOverlay();}
 if((location.hash||'').split('/').length>2)await syncFromAddress();
 await libraryReady;
}

init();
