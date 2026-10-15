# LISOFLIX v1.6.1 — atualização de catálogo e player

**Base:** LISOFLIX v1.6.0, com banco D1 já preparado.

## Mudanças

- Capas panorâmicas maiores no filtro de gênero, em Explore por idiomas e nas buscas.
- Animes possuem filtro próprio por gênero, incluindo séries e longas, mantendo o catálogo japonês separado.
- Filmes e séries comuns não puxam animes/desenhos ao filtrar gêneros.
- O EmbedMovies usa somente o iframe oficial `myembed.biz` para títulos e episódios autorizados e previamente cadastrados no D1. Os controles são do provedor; recarregar o iframe não contorna CSP nem garante reprodução.
- Nenhuma mudança de esquema D1 é necessária nesta versão.

## Publicação Windows

1. Extraia o ZIP e mantenha o arquivo `wrangler.jsonc` com o UUID do banco correto.
2. Na pasta `LISOFLIX`, rode: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\10-PUBLICAR-CLOUDFLARE.ps1`
3. Confirme a conta, verifique o backup, acompanhe os testes e o deploy.
4. Para atualizar o GitHub sem force-push: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\09-ATUALIZAR-GITHUB.ps1`
5. Se GitHub publicar automaticamente, confira que a versão de `/api/config` continue 1.6.1.

**Cuidado:** Nunca execute o script de migração 1.6.0 de novo para atualizar apenas CSS e JS. Não altere os registros dos usuários nem os Secrets existentes. O script 1.6.1 não altera tabelas.

## Sobre o player

- Abra `/api/system-check` para verificar fontes cadastradas, mas `activeEmbeds > 0` não prova que um vídeo funciona.
- Consulte `/api/playback?type=movie&id=ID` ou `?type=tv&id=ID&season=1&episode=1` para verificar um título autorizado.
- O fornecedor pode bloquear iframe/stream, redirecionar ou remover conteúdo. O LISOFLIX não consegue controlar vídeos dentro de um iframe externo e não deve ignorar as restrições de segurança.
- A API TMDB fornece metadados; nenhuma listagem TMDB concede direitos de exibição.
