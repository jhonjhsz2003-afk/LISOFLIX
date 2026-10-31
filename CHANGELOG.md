# 1.7.7 — compatibilidade iframe WarezCDN

- Iframe WarezCDN sem sandbox, em linha com o embed oficial e limitado a host e rotas validados.
- Permissoes de midia especificas documentadas; EmbedMovies permanece isolado.
- WarezCDN ativado por padrao apos aprovacao do dominio pelo usuario.
- Sem migracoes D1. Limitacao de desafios Cloudflare/404 do fornecedor preservada.

# 1.7.7 — troca da fonte alternativa

- Removida a antiga integração de terceiro que apresentava 404 após desafios Cloudflare.
- Adicionado WarezCDN com URL de filme e episódio segundo a documentação e verificação de host/rota no frontend.
- Integração desativada por padrão até o domínio ser verificado e aprovado no painel.
- EmbedMovies e VidSrc preservados; seletor e botão Outra fonte mantidos.
- Sem migração D1; backup e checagem de conta mantidos no deploy.

# Manutencao do pacote

- Removidos testes obsoletos e arquivo TXT residual do SuperFlixAPI, que nao integra mais o player.
- Consolidada a publicacao GitHub em `PUBLICAR-GITHUB.ps1`; removidos scripts PowerShell duplicados/antigos.
- Nenhuma tentativa de contornar verificacoes de seguranca de provedores externos.
