# LISOFLIX 1.6.2 — atualizar usando AnimeDragon como referência

## Revisão

A versão foi comparada localmente com `Anime_Dragon-main(5)(1).zip`. Foi possível revisar a API de episódios e o iframe no código, mas o endereço antigo `site.anime-dragon.workers.dev` não pôde ser verificado por uma consulta pública. Nada foi publicado em sua conta.

## Publicação segura

1. Faça uma cópia da pasta atual do LISOFLIX. **Não misture arquivos de versões antigas na mesma pasta.**
2. Descompacte o ZIP em uma pasta nova. Confirme que `wrangler.jsonc` aponta para o UUID da conta Cloudflare correta. NÃO compartilhe Secrets.
3. Execute `powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\10-PUBLICAR-CLOUDFLARE.ps1"`.
4. Confirme a conta Cloudflare. O script salva backup do D1 e faz testes antes de publicar. Não apaga nem migra tabelas.
5. Execute `powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\09-ATUALIZAR-GITHUB.ps1"` para sincronizar o repositório sem sobrescrever histórico. Se o GitHub dispara deploy automático, aguarde e confirme `/api/config` com `version: 1.6.2`.
6. Valide em produção o cadastro já existente, um filme autorizado, uma série autorizada e vários episódios, inclusive um desativado. Confira Console e Network para erros de CSP de fornecedores.

## Gerenciar fontes

`11-GERENCIAR-FONTES.ps1` agora permite uma autorização para uma série inteira (`tv`, `ID TMDB`, `SIM` quando perguntar sobre série). O registro no banco fica `season=0,episode=0`; cada URL de reprodução real mantém o número da temporada e do episódio. É preciso ter autorização de incorporação/exibição de cada título. O registro não confere direitos, não checa disponibilidade real e não remove anúncios internos do fornecedor.

Não altere o nome do D1 só porque aparece `flix` na lista remota; os scripts conferem o UUID da conta. Não execute `schema.sql` novamente.
