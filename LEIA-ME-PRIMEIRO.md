# LISOFLIX v1.7.3 — Três fontes de reprodução

Este pacote preserva as contas, os perfis, os comentários e o histórico. **Não executa migração nem limpa o Cloudflare D1.**

## Players e recuperação de falhas

O seletor na barra superior oferece: **Principal · EmbedMovies**, **Alternativa 1 · SuperFlixAPI** e **Alternativa 2 · VidSrc**. O botão **Outra fonte** troca para a próxima opção e **Recarregar** tenta novamente a escolhida. A troca é manual: por segurança o LISOFLIX não pode inspecionar o conteúdo dos iframes de terceiros e não sabe se houve 404, anúncio, captcha ou se o vídeo realmente tocou.

- **SuperFlixAPI:** URLs conforme a documentação fornecida: `/filme/{ID_TMDB}` e `/serie/{ID_TMDB}/{TEMPORADA}/{EPISODIO}`. O serviço exibiu Cloudflare Turnstile seguido de 404 no filme testado; isso pode indicar fonte indisponível ou rota removida pelo provedor. O LISOFLIX não pode resolver o 404 remoto nem burlar a verificação de segurança do fornecedor.
- **VidSrc:** `/embed/movie/{ID}` e `/embed/tv/{ID}/{TEMPORADA}/{EPISODIO}`. O serviço indicou que seu player não aceita o atributo `sandbox` do iframe. Esta versão deixa **apenas o VidSrc** sem esse atributo (após validação rígida do host HTTPS e da rota) para permitir teste de compatibilidade. **Isso reduz o isolamento de segurança** e pode permitir ações, janelas ou publicidade do fornecedor. Se observar comportamento indevido, altere `ENABLE_VIDSRC_FALLBACK` para `false` em `wrangler.jsonc` e publique novamente. Os outros players e trailers continuam com `sandbox`.
- **Animes:** VidSrc declara não oferecer cobertura de anime no momento. A presença da opção não garante conteúdo disponível.

**Importante:** endpoints de terceiros apenas montam uma página, não comprovam disponibilidade ou autorização de exibição. Utilize fontes para as quais você tem direitos de incorporação. Não há suporte à inspeção ou remoção de anúncios, bypass de captchas, nem monitoramento do progresso de reprodução em iframes sem uma API oficial e autorizada de `postMessage`.

## Publicação segura

1. Extraia o ZIP em uma pasta nova. Confirme o `database_id` e a conta Cloudflare no arquivo `wrangler.jsonc`.
2. Abra o PowerShell nessa pasta e execute `powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\10-PUBLICAR-CLOUDFLARE.ps1"`.
3. O script valida a conta e o banco D1 por UUID, pede confirmação, salva backup, executa os testes e publica **sem migrações**.
4. Atualize o repositório GitHub com `powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\09-ATUALIZAR-GITHUB.ps1"`.
5. Confira `/api/config` para ver `version: "1.7.3"` e `fallbackPlayers: ["superflix","vidsrc"]`. Teste as três fontes em filmes e episódios autorizados.

## Limitações conhecidas

Os testes locais verificam o código e as URLs geradas, não confirmam reprodução real do fornecedor, nem eliminam erros remotos, 404, restrições do navegador ou publicidade. Não altere `TMDB_API_KEY` nem as tabelas do D1 para corrigir 404s de outros domínios.
