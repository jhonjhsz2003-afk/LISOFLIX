# LISOFLIX v1.7.0 — player alternativo Cineveok, perfis e histórico

- Mantém EmbedMovies como principal e integra Cineveok/PrimeVício como alternativa de iframe para conteúdos autorizados.
- Remove o adaptador anterior e a autorização do domínio correspondente na CSP.
- Melhora seletor de fonte no topo, perfil maior, gestão de perfis com formulário separado, histórico e marcar assistido.
- Corrige navegação de primeira interação e avatares sem perda do formulário.
- Barra de progresso apenas onde há duração real; não acessa DOM de iframes externos para detectar “Premium” e anúncios.
- Recomendação local baseada no histórico, atualização periódica do catálogo e sincronização do D1.
- Publicação com backup e sem migrações. Reprodução externa exige teste em produção e autorização de exibição.

## Histórico (resumido)

1.6.x — design de streaming, perfil sem PIN, progressividade do catálogo, filtros, comentários, integração de iframe e scripts de deploy protegidos.
1.5.x — identificação segura de Cloudflare D1 por UUID e diagnósticos de fontes.
1.4.x — cadastro e autenticação persistente, configuração segura do catálogo e reprodução licenciada.
