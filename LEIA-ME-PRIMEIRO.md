# LISOFLIX v1.7.6 — WarezCDN preparado para domínio autorizado

O SuperFlixAPI foi removido da reprodução, da validação de URLs e da CSP. Os três provedores possíveis são:

1. **EmbedMovies** — principal.
2. **WarezCDN** — primeira alternativa, **DESATIVADA até verificação e aprovação do domínio**.
3. **VidSrc** — alternativa seguinte, disponível conforme a configuração.

## IMPORTANTE: seu domínio ainda está PENDENTE

No painel WarezCDN da captura enviada, `lisoflix.jjszjhon.workers.dev` aparece como **PENDENTE**. Apenas cadastrar o site não garante permissão para incorporar o player.

Para concluir a integração:

1. No painel `https://warezcdn.sbs/perfil`, confirme que o domínio cadastrado é **exatamente** o endereço publicado do LISOFLIX.
2. Clique em **Baixar TXT** na linha do LISOFLIX. Esse TXT deve ser o arquivo de **verificação do WarezCDN**. Não use um arquivo `superflix-verify-...txt` da configuração antiga; ele não prova o domínio para o novo serviço.
3. Sem renomear nem alterar o conteúdo, coloque o arquivo baixado dentro da pasta `public/` do projeto. Ele ficará acessível em `https://SEU-DOMINIO/NOME-EXATO-DO-ARQUIVO.txt` após o deploy.
4. Publique o site pelo script Cloudflare incluído, abra a URL pública exata do TXT e confirme que o navegador exibe o conteúdo esperado.
5. Clique **Verificar arquivo** no painel WarezCDN e aguarde o painel indicar que o domínio está **APROVADO**. Verificação e aprovação podem ser etapas distintas.
6. Somente depois, defina `ENABLE_WAREZCDN_FALLBACK` como `"true"` no bloco `vars` de `wrangler.jsonc` (sem remover `ENABLE_VIDSRC_FALLBACK`) e publique novamente. Quando aprovado e ativado, o WarezCDN aparece entre EmbedMovies e VidSrc.

**Segurança:** o TXT de verificação deve ser público, mas não publique tokens de autenticação, segredos TMDB, cookies ou backups D1. O TXT antigo enviado na conversa **não foi incluído** neste pacote.

## URL do player

A documentação publicada em `https://warezcdn.sbs/doc` usa estes formatos:

- Filme: `https://warezcdn.sbs/filme/969681`
- Episódio: `https://warezcdn.sbs/serie/1396/1/1`

O LISOFLIX gera essas URLs no Worker com ID TMDB, temporada e episódio validados. A aplicação permite iframes HTTPS somente dos hosts autorizados. A URL preparada **não comprova disponibilidade do vídeo, licença ou aprovação da sua conta**. Use fontes com direito de incorporação e publicação.

O WarezCDN usa sandbox restrito com `allow-popups` para publicidade do fornecedor, sem `allow-top-navigation` e sem permissões amplas sobre a página principal. Se recusar essa configuração, não retire todas as proteções às cegas. Fale com o suporte do provedor.

## Outros componentes preservados

- Autenticação, usuários, perfis, listas, comentários, favoritos e histórico permanecem no D1 sem alterações no esquema.
- Vídeos nativos autorizados continuam prioritários, quando cadastrados.
- O iframe externo não permite ao LISOFLIX ler o tempo de reprodução, confirmar anúncios ou diagnosticar um 404 interno pela política de mesma origem.
- **Outra fonte** continua permitindo a seleção manual do próximo player.

## Publicar

Extraia o ZIP e abra PowerShell na pasta LISOFLIX:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\10-PUBLICAR-CLOUDFLARE.ps1"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\09-ATUALIZAR-GITHUB.ps1"
```

O script de Cloudflare verifica a conta e o UUID do D1, exige confirmação, salva backup fora do GitHub, executa testes e publica sem aplicar `schema.sql` ou migrações. A ordem acima publica na Cloudflare antes do GitHub.

Após aprovação e ativação, `/api/config` deve indicar `version: "1.7.6"` e `fallbackPlayers: ["warezcdn","vidsrc"]`. Antes da aprovação (configuração padrão), a lista será `fallbackPlayers: ["vidsrc"]`.

Os testes locais validam construção das URLs, proteção do D1 e a interface. Não garantem a reprodução nos serviços externos.
