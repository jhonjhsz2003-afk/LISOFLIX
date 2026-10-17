# LISOFLIX 1.7.1 — opções de reprodução

Esta versão foi preparada a partir do projeto LISOFLIX 1.7.0 enviado nesta conversa. Não executa migrações e preserva o banco Cloudflare D1 (usuários, perfis, comentários, histórico e listas).

## Fontes de vídeo

- **Principal — EmbedMovies:** permanece inalterado. A disponibilidade e a autorização de exibição são responsabilidade da origem.
- **Alternativa 1 — VidSrc:** URLs de iframe confirmadas na documentação publicada em `https://vidsrc.mov/#api`:
  - Filme: `https://vidsrc.mov/embed/movie/{TMDB_ID}`
  - Série: `https://vidsrc.mov/embed/tv/{TMDB_ID}/{TEMPORADA}/{EPISODIO}`
  - A documentação do próprio VidSrc afirma que **animes ainda não são suportados**. O botão poderá gerar URL, mas isso **não** confirma a existência de um vídeo para animes.
- **Alternativa 2 — SuperFlix (experimental):** o site `https://superflixapi.fun/doc` retornou 403 nas verificações. Há documentação com rotas `/filme/{id}` e `/serie/{id}/{temporada}/{episodio}` em outro domínio da mesma marca, mas não é possível garantir que o domínio `.fun` use exatamente essas rotas. Por isso, a alternativa está implementada mas **DESATIVADA POR PADRÃO**.

### Configuração no `wrangler.jsonc` ou nas variáveis do Worker

```json
"ENABLE_EXTERNAL_EMBEDS": "true",
"ENABLE_EMBEDMOVIES_AUTOMATIC": "true",
"ENABLE_VIDSRC_FALLBACK": "true",
"ENABLE_SUPERFLIX_FALLBACK": "false"
```

Só mude `ENABLE_SUPERFLIX_FALLBACK` para `true` após confirmar os endpoints do seu domínio, o funcionamento do iframe e a autorização para exibir o conteúdo. A mudança publica um player experimental; não é garantia de disponibilidade.

### Observações importantes

As opções no seletor superior são **manuais**. Um iframe carregar não significa que o vídeo esteja disponível, portanto o LISOFLIX não faz troca automática apenas pelo `load`. Anúncios, qualidade, legendas e conteúdo reproduzido ficam sob controle de cada fornecedor; não se tenta eliminar anúncios nem contornar CSP ou bloqueios de incorporação.

O player não converte URLs de terceiros em links MP4/HLS. O TMDB é apenas catálogo e **não licencia conteúdo**. Utilize as fontes somente quando houver autorização de incorporação e exibição.

## Como instalar

1. Extraia o ZIP em pasta separada, mantendo o UUID correto do D1 em `wrangler.jsonc`.
2. No PowerShell, dentro da pasta `LISOFLIX`, execute `powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\10-PUBLICAR-CLOUDFLARE.ps1"`. O script verifica a conta, exporta backup do D1 e faz o deploy, **sem executar `schema.sql`**.
3. Depois, se desejar publicar o projeto no GitHub, execute `powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\09-ATUALIZAR-GITHUB.ps1"`.
4. Confira `/api/config` (versão `1.7.1`; `fallbackPlayers: ["vidsrc"]`) e teste um filme e um episódio para cada fonte habilitada no navegador. Os testes de código não comprovam reprodução nos servidores externos.

**Não coloque tokens secretos nem senhas no GitHub.** A chave TMDB continua sendo secret da Cloudflare.
