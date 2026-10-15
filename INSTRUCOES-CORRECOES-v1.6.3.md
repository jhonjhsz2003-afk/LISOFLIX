# LISOFLIX v1.6.3 — player e desempenho

## Diagnóstico das duas capturas

A tela de *Profundezas* estava indisponível **antes de abrir o iframe**, porque a API de reprodução exigia uma linha em `playback_embeds`. No AnimeDragon, o formato documentado da URL é montado diretamente a partir do ID TMDB, temporada e episódio. O segundo problema era a carga simultânea de dezenas de páginas do TMDB antes de mostrar as capas.

## Mudanças

- A nova opção `ENABLE_EMBEDMOVIES_AUTOMATIC` habilita **a geração automática das URLs oficiais de iframe** em conteúdos cuja incorporação está autorizada. **Não confirma** que um vídeo esteja hospedado, disponível ou licenciado. O administrador precisa avaliar os direitos de exibição do catálogo antes de ativar em produção.
- Mantém os registros de fontes do D1, prioriza vídeo nativo válido e respeita desativações explícitas no `playback_embeds`.
- Só utiliza `https://myembed.biz/filme/ID` para filmes e `https://myembed.biz/serie/ID/TEMPORADA/EPISODIO` para séries e animes. Não baixa nem intercepta vídeos.
- O frontend carrega primeiro a página inicial de cada seção e consulta as páginas adicionais em segundo plano, com número limitado de requisições simultâneas. A busca, as contas e as seções permanecem no LISOFLIX.
- Adiciona `embedmovies.org` à lista de domínios permitidos para frames; não remove as restrições de sandbox.
- Não altera `schema.sql`, não executa migrações e não altera contas, sessões, perfis, comentários ou histórico.

## Implantar com segurança

1. Confira a conta Cloudflare correta e o `database_id` existente no `wrangler.jsonc`.
2. Faça o backup D1 (o script Cloudflare faz isso antes de publicar).
3. Selecione quais conteúdos estão autorizados e revise a variável `ENABLE_EMBEDMOVIES_AUTOMATIC`. O arquivo de exemplo deste pacote define `true`; defina `false` se você não puder autorizar a exibição de todo o catálogo.
4. Execute `10-PUBLICAR-CLOUDFLARE.ps1` e, após conferir o site, `09-ATUALIZAR-GITHUB.ps1`.
5. Confira `/api/config` com `version: 1.6.3` e `automaticEmbeds: true` quando habilitada. Confira `/api/system-check` com `schemaReady: true`.
6. Teste um filme e um episódio cujo conteúdo você tem autorização para incorporar.

## Limitações

`available: true` na API indica que **foi montada a URL do iframe**, não que a reprodução seja possível. O fornecedor pode não ter o vídeo, recusar incorporação, mudar a origem ou impor anúncios e outros controles. O LISOFLIX não contorna bloqueios, anúncios, DRM ou direitos de exibição. Não é possível ler o progresso do vídeo de um iframe de terceiro sem cooperação desse fornecedor.

Se o iframe ficar vazio, registre as mensagens de CSP/console do navegador antes de relaxar qualquer política. Não use `allow-popups` indiscriminadamente.
