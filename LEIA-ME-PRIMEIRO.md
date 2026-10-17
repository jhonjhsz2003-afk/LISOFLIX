# LISOFLIX v1.7.2 — SuperFlixAPI habilitada

Atualização incremental sobre v1.7.1. Sem migrações no Cloudflare D1.

## Provedores de reprodução

1. **EmbedMovies**: principal, continua inalterado.
2. **SuperFlixAPI (`superflixapi.fun`)**: alternativa habilitada no `wrangler.jsonc`, com base nas capturas da documentação enviadas pelo administrador do site. Filme: `https://superflixapi.fun/filme/{ID}`. Episódio: `https://superflixapi.fun/serie/{ID}/{TEMPORADA}/{EPISODIO}`. Os números devem vir do título real no catálogo. Não confundir o endpoint `/lista` (dados JSON de catálogo) com uma URL de reprodução.
3. **VidSrc**: mantido como integração opcional, mas desativado por padrão (`ENABLE_VIDSRC_FALLBACK=false`), devido ao erro de *iframe sandbox* observado em produção. A fonte não foi removida do código, permitindo investigar separadamente a compatibilidade.

### Variáveis do Worker

No `wrangler.jsonc`:

```json
"ENABLE_EXTERNAL_EMBEDS": "true",
"ENABLE_EMBEDMOVIES_AUTOMATIC": "true",
"ENABLE_SUPERFLIX_FALLBACK": "true",
"ENABLE_VIDSRC_FALLBACK": "false"
```

Para disponibilizar o VidSrc novamente, avalie cuidadosamente as proteções do iframe antes de alterar a flag; retirar todo o isolamento permite ações não desejadas de publicidade e páginas externas.

Em `/api/config` a resposta esperada inclui `version: "1.7.2"` e `fallbackPlayers: ["superflix"]`. No seletor da tela de reprodução aparecerão **Principal · EmbedMovies** e **Alternativa 1 · SuperFlixAPI**. Se habilitar o VidSrc, ele entra como próxima opção.

**Importante:** o fato de uma URL gerar iframe **não verifica** se o vídeo está disponível, se o servidor aceita ser incorporado ou se há autorização de exibição. Os iframes são de origens diferentes e o LISOFLIX não consegue verificar anúncios, iniciar o vídeo ou determinar automaticamente um erro interno do fornecedor por `onload`. Se uma opção falhar, o visitante pode selecionar outra no topo. Use apenas conteúdos cuja exibição esteja autorizada.

### Publicação

1. Extraia este ZIP em uma pasta nova e confirme o banco correto no arquivo `wrangler.jsonc` antes de publicar.
2. No PowerShell dentro da pasta `LISOFLIX`, execute: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\10-PUBLICAR-CLOUDFLARE.ps1"`.
3. O script identifica a conta Cloudflare, confere o UUID do D1, exige confirmação, salva um backup, executa testes e publica sem migrar o banco.
4. Para atualizar o GitHub, execute: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\09-ATUALIZAR-GITHUB.ps1"`.
5. Confira `/api/config` e teste a reprodução no navegador com títulos para os quais você possua autorização.

Os testes do código não comprovam a reprodução real do fornecedor em produção. Nenhum segredo da Cloudflare deve ser colocado no GitHub.
