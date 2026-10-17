# LISOFLIX v1.7.5 — Recuperação de reprodução e classificação correta

- Manter as três fontes na ordem EmbedMovies → SuperFlixAPI → VidSrc, inclusive para filmes e episódios.
- SuperFlix usa a rota /serie/ para séries e desenhos ocidentais; a rota /anime/ apenas para animes japoneses identificados por idioma de origem e gênero de animação. Em anime japonês continua possível tentar /serie/ manualmente.
- Adicionar ajuda discreta no topo para problemas de reprodução, com botão de próxima fonte. Nenhuma barra inferior nova e nenhuma sobreposição permanente sobre o vídeo.
- A API 404 ou desafio Cloudflare dentro de um iframe de outra origem não é detectável com confiança. Somente um evento real de erro do iframe permite mudar automaticamente, sem inferir indisponibilidade com base no tempo de carregamento.
- Manter políticas existentes: D1 e usuários preservados, nenhum bypass de Cloudflare, nenhum desbloqueio de anúncios perigoso.

# LISOFLIX v1.7.5 — Compatibilidade e fontes de reprodução

- Tres fontes preservadas: EmbedMovies, SuperFlixAPI e VidSrc.
- Publicidade via popups do SuperFlix permitida com sandbox isolado, sem permitir navegacao da aba principal.
- Alternativa oficial `/anime` para animacoes no SuperFlix; escolha manual da rota geral quando necessario.
- Politica de referer uniforme para incorporacoes, sem tokens privados.
- D1 e contas preservados.
- Falhas internas do fornecedor (404, captcha/challenge) nao sao contornadas.

# LISOFLIX v1.7.5 — Três players e recuperação de falhas

- Mantido EmbedMovies como principal, SuperFlixAPI como primeiro alternativo e VidSrc como segundo alternativo, habilitados no `wrangler.jsonc`.
- Adicionado botão **Outra fonte** ao lado do seletor, sem faixas inferiores ou tentativas automáticas enganosas.
- VidSrc sem `sandbox` apenas em URL allowlisted exata, com política de referenciador restrita; reconhecido o risco adicional de anúncios e redirecionamentos.
- SuperFlixAPI preserva isolamento; um 404 ou uma verificação do fornecedor só pode ser solucionado pelo próprio fornecedor. O usuário pode optar por outro player.
- Reforçados os testes de seleção, episódios, validação de hosts e bloqueios D1. Sem migrações.
