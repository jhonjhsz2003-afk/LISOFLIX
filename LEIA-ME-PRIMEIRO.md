# LISOFLIX v1.7.7 — WarezCDN preparado para domínio autorizado

O SuperFlixAPI foi removido da reprodução, da validação de URLs e da CSP. Os três provedores possíveis são:

1. **EmbedMovies** — principal.
2. **WarezCDN** — primeira alternativa, **ATIVADA para o domínio previamente aprovado**.
3. **VidSrc** — alternativa seguinte, disponível conforme a configuração.

## Domínio do WarezCDN aprovado

O usuário confirmou no painel do WarezCDN que o domínio `lisoflix.jjszjhon.workers.dev` está **ATIVO**.
Por isso, esta versão já define `ENABLE_WAREZCDN_FALLBACK` como `"true"`. Verifique que está
publicando na mesma conta e domínio autorizado. Não reutilize este pacote em outro domínio sem
obter a respectiva aprovação.

O TXT de verificação já foi validado no site público, não sendo necessário recriar a confirmação.
Não publique tokens privados, cookies ou backups D1 no GitHub.

## URL do player

A documentação publicada em `https://warezcdn.sbs/doc` usa estes formatos:

- Filme: `https://warezcdn.sbs/filme/969681`
- Episódio: `https://warezcdn.sbs/serie/1396/1/1`

O LISOFLIX gera essas URLs no Worker com ID TMDB, temporada e episódio validados. A aplicação permite iframes HTTPS somente dos hosts autorizados. A URL preparada **não comprova disponibilidade do vídeo, licença ou aprovação da sua conta**. Use fontes com direito de incorporação e publicação.

O exemplo oficial do WarezCDN não usa atributo `sandbox`. Nesta versão, apenas o iframe HTTPS com URL e domínio estritamente validados fica sem sandbox, visando compatibilidade. Isso reduz o isolamento do conteúdo externo e pode permitir publicidade e redirecionamentos. Caso haja comportamento indevido, desative essa fonte.

## Outros componentes preservados

- Autenticação, usuários, perfis, listas, comentários, favoritos e histórico permanecem no D1 sem alterações no esquema.
- Vídeos nativos autorizados continuam prioritários, quando cadastrados.
- O iframe externo não permite ao LISOFLIX ler o tempo de reprodução, confirmar anúncios ou diagnosticar um 404 interno pela política de mesma origem.
- **Outra fonte** continua permitindo a seleção manual do próximo player.

## Publicar

Extraia o ZIP e abra PowerShell na pasta LISOFLIX:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\PUBLICAR-GITHUB.ps1"
```

O `PUBLICAR-GITHUB.ps1` sincroniza o projeto completo com o repositorio GitHub,
remove arquivos antigos do destino, preserva `.git` e nao envia credenciais,
bancos locais ou backups. Ele publica somente no GitHub.

Para publicar o Worker na Cloudflare, depois de conferir a conta e o D1 configurado,
execute separadamente `10-PUBLICAR-CLOUDFLARE.ps1`. Esse passo nao e necessario
para apenas enviar os arquivos ao GitHub.

O script de Cloudflare verifica a conta e o UUID do D1, exige confirmação, salva backup fora do GitHub, executa testes e publica sem aplicar `schema.sql` ou migrações. A ordem acima publica na Cloudflare antes do GitHub.

Após publicar, `/api/config` deve indicar `version: "1.7.7"` e `fallbackPlayers: ["warezcdn","vidsrc"]`. Se a opção não aparecer, confira a configuração do Worker e a conta autorizada.

Os testes locais validam construção das URLs, proteção do D1 e a interface. Não garantem a reprodução nos serviços externos.


## Ajuste de compatibilidade WarezCDN (v1.7.7)

O dominio previamente validado no painel foi habilitado nesta configuracao (`ENABLE_WAREZCDN_FALLBACK=true`).
Somente o iframe cujo host HTTPS e caminho correspondem as rotas publicadas pelo WarezCDN
fica sem `sandbox`, conforme exemplo oficial de integracao. Isso permite funcoes
externas adicionais (incluindo publicidade e redirecionamentos iniciados pelo visitante).
Se houver comportamento abusivo, desligue `ENABLE_WAREZCDN_FALLBACK` e publique novamente.

Esta alteracao NAO remove verificacoes da Cloudflare do fornecedor e NAO garante
que todos os titulos sejam oferecidos. Uma resposta HTTP 404 do fornecedor nao
pode ser corrigida pelo LISOFLIX nem detectada com seguranca dentro de iframe
de outra origem. Nestes casos, use `Outra fonte` (EmbedMovies ou VidSrc).

O banco D1 nao sofre alteracoes. O script apenas faz backup e publica o Worker.
