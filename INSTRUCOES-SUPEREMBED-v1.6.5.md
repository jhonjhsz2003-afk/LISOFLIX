# LISOFLIX v1.6.5 — Player 2 sem sandbox

## Correção

O erro observado no SuperEmbed (“Sandboxing is not allowed!”) ocorreu com `sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"` presente no iframe. Agora o **SuperEmbed** carrega sem esse atributo, enquanto **EmbedMovies**, trailer e restante do site mantêm suas configurações de segurança anteriores.

Esta mudança não altera a lógica de disponibilidade: EmbedMovies permanece Player 1, SuperEmbed Player 2, com troca manual no topo. Somente um iframe carrega por vez. Os URLs são verificados por provedor e domínio antes de aparecer na página.

## Aviso importante

A remoção do sandbox **aumenta os riscos de pop-ups, anúncios, redirecionamentos e conteúdo externo malicioso**. Uma CSP restrita do LISOFLIX e as regras de origem dos navegadores não impedem todos esses comportamentos. Não existe bloqueio de anúncios garantido e não é possível controlar os botões internos de um iframe de terceiro. Use apenas quando tiver autorização de incorporação/exibição e aceite o comportamento do fornecedor.

Se a página continuar sem vídeo, isso pode depender dos servidores do fornecedor, CSP ou indisponibilidade da mídia. O carregamento do iframe não é prova de reprodução.

## Publicação segura

1. Extraia o pacote em pasta separada. Confirme que `wrangler.jsonc` contém o UUID D1 da sua conta.
2. Na pasta extraída execute `powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\10-PUBLICAR-CLOUDFLARE.ps1"`.
3. Para manter GitHub sincronizado execute `powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\09-ATUALIZAR-GITHUB.ps1"`.
4. Confira `/api/config` para `version: "1.6.5"`, e teste os players 1 e 2 em um título autorizado. O script Cloudflare valida a conta, faz backup local fora do GitHub e não executa migrações D1.

Não forneça suas credenciais ou secrets do TMDB. A atualização precisa ser publicada por você; não houve deploy neste ambiente.
