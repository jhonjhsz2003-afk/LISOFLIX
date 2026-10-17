# LISOFLIX v1.7.1 — VidSrc e SuperFlix opcional

- Removido PrimeVício/Cineveok do backend, frontend, configuração e CSP.
- EmbedMovies mantido como fonte principal.
- Integrado VidSrc como alternativa de iframe por TMDB para filmes e episódios (opt-in habilitado no arquivo de configuração).
- Preparado SuperFlixAPI `.fun` como opção experimental desativada até confirmação de endpoints e autorização.
- Atualizados seletores de fonte para suportar mais de duas opções, preservando as restrições do D1.
- Validação estrita de protocolo HTTPS, domínio exato e formato de URLs de iframe.
- Atualizado cache-busting para `1.7.1`; sem migrações no D1.
- Testes de roteamento de filme/episódio, proteção de fontes, seleção e segurança do iframe.

Consulte `LEIA-ME-PRIMEIRO.md` para limites e publicação.
