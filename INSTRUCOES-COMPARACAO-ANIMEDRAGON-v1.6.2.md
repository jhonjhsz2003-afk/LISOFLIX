# LISOFLIX 1.6.2: melhorias observadas no AnimeDragon

Foi analisado o ZIP Anime_Dragon-main(5)(1).zip recebido na conversa.

- `server/embedmovies.js` do AnimeDragon monta a URL de episódio a partir do TMDB e da temporada/episódio, sem baixar MP4/M3U8.
- `web/js/player.js` usa iframe responsivo, `loading=eager`, `fetchpriority=high`, `sandbox` restritivo, `referrerPolicy` e `allowfullscreen`.
- O LISOFLIX agora utiliza o mesmo comportamento de episódio direto para uma série **explicitamente autorizada**: basta um registro `playback_embeds` com `media_type=tv, media_id=ID, season=0, episode=0`. Um registro específico desabilitado bloqueia aquele episódio.
- Filmes e episódios individuais continuam com cadastro explícito. Sem autorização não existem fontes automáticas indiscriminadas.
- O botão Assistir em séries abre o primeiro episódio real da temporada selecionada, nunca temporada 0/episódio 0.
- O iframe foi configurado para prioridade alta e permissões mínimas para formulários internos do fornecedor, sem pop-ups e sem redirecionar a página superior.

## Limitações importantes

Uma URL válida e um iframe carregado **não confirmam** que o vídeo toca. O EmbedMovies depende de terceiros, pode negar acesso ou bloquear iframes, e não comprova direitos de exibição. O proprietário do conteúdo e do site deve assegurar as permissões necessárias. Nada aqui contorna bloqueio de `frame-ancestors`, CSP do fornecedor, DRM ou anúncios internos.

## Como ativar uma série autorizada

Execute `11-GERENCIAR-FONTES.ps1`, confirme a conta pelo UUID, escolha 3, tipo `tv`, ID TMDB, responda `SIM` à pergunta sobre autorização da série inteira e confirme permissão de exibição. O gerenciador fará backup antes da alteração. Não é necessária migração no D1 para habilitar essa regra.

Atualize primeiro a Cloudflare, depois o GitHub para evitar que um deploy automático substitua o Worker mais novo.
