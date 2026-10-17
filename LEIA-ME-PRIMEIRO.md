# LISOFLIX v1.7.5 — Três fontes de reprodução

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
5. Confira `/api/config` para ver `version: "1.7.5"` e `fallbackPlayers: ["superflix","vidsrc"]`. Teste as três fontes em filmes e episódios autorizados.

## Limitações conhecidas

Os testes locais verificam o código e as URLs geradas, não confirmam reprodução real do fornecedor, nem eliminam erros remotos, 404, restrições do navegador ou publicidade. Não altere `TMDB_API_KEY` nem as tabelas do D1 para corrigir 404s de outros domínios.


## Compatibilidade dos provedores (v1.7.5)
- EmbedMovies: fonte 1. O iframe e carregado em ambiente restrito.
- SuperFlixAPI: fonte 2. A publicidade em janelas separadas e permitida pelo atributo `allow-popups`, mas o iframe continua sem permissoes de navegacao de pagina principal. Anuncios podem surgir de sites de terceiros; isso nao garante disponibilidade de video e nao altera verificacoes Cloudflare.
- SuperFlixAPI para animacoes: quando o TMDB classifica o titulo como animacao, o frontend tenta por padrao `/anime/ID/TEMP/EP` (formato fornecido pelo painel do provedor); o botao `Tentar serie` permite testar a rota geral `/serie/ID/TEMP/EP` caso a primeira falhe. Para series comuns, permanece `/serie/ID/TEMP/EP`.
- VidSrc: fonte 3. O iframe dessa fonte nao usa `sandbox` porque o provedor informou que nao funciona com ele. A integracao usa apenas URLs HTTPS aprovadas.
- O site nao consegue detectar conteudo premium, 404 de um documento dentro de iframe, verificacao Cloudflare ou anuncios internos em outra origem. O usuario pode escolher `Outra fonte`; nao ha promessa de disponibilidade automatica.
- Use somente fontes de exibicao autorizada. Caso surjam anuncios invasivos ou redirecionamentos, desative a fonte respectiva no `wrangler.jsonc` e publique novamente.
- Nao executar migracoes nem `schema.sql` no D1 nesta atualizacao. O script de deploy testa a conta e exporta backup.

## Correções da versão 1.7.5

* **Ordem dos players:** EmbedMovies, SuperFlixAPI, VidSrc. Os três podem ser escolhidos pelo seletor. O SuperFlixAPI às vezes conclui o desafio Cloudflare mas exibe HTTP 404 dentro de sua própria página. Esse erro precisa ser corrigido pelo fornecedor e não é resolvido por liberar anúncios.
* **Desenhos vs. anime japonês:** desenhos e séries não japonesas continuam em `/serie/ID/TEMP/EP`. Somente anime japonês de gênero animação utiliza `/anime/ID/TEMP/EP`, com opção de testar `/serie/`.
* **Botão Ajuda:** no alto do player, abre um painel pequeno com instruções e um botão para a fonte seguinte. Não bloqueia o vídeo quando fechado. A troca automática só ocorre se o navegador realmente emite erro do iframe; uma página remota com HTML 404 pode carregar sem disparar erro.
* **Privacidade e segurança:** não desative desafios Cloudflare, bloqueios de navegação nem a proteção do D1. Os três serviços de terceiros podem exibir anúncios e podem falhar; não há como garantir disponibilidade de todos os títulos sem contratos e APIs de disponibilidade dos próprios provedores.
* **Publicação:** mantenha o UUID certo do D1 em `wrangler.jsonc`; rode primeiro o script de Cloudflare (que verifica o banco, salva backup e roda testes) e depois o script de GitHub. Não há migração do banco.
