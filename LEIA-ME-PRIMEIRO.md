**Versão atual: 1.6.1.** Para atualizar um site que já usa o LISOFLIX v1.6.0, comece por `INSTRUCOES-ATUALIZACAO-v1.6.1.md` e use `10-PUBLICAR-CLOUDFLARE.ps1`. Esta atualização não requer aplicar novamente a migração D1.

## v1.5.1 — corrigido em 15/10/2026

- O gerenciador `11-GERENCIAR-FONTES.ps1` identifica o banco por **UUID** (nao por nome). Se o nome remoto for diferente, informa o fato e usa o binding `DB` para consultas e atualizacoes.
- Agora a opcao **1** mostra as linhas de fontes autorizadas ou a mensagem **Nenhuma fonte cadastrada**. URLs privadas nunca aparecem.
- Confirma `sim` e `SIM` sem diferenca; grava apenas com autorizacao explicita. Backup obrigatorio antes de ALTERAR registros, salvo fora do GitHub.
- `10-PUBLICAR-CLOUDFLARE.ps1` verifica UUID remoto e solicita confirmacao da conta ANTES de backup, migracao e deploy. **Nao publique de uma conta errada.**
- `12-VERIFICAR-PLAYER.ps1` faz diagnostico **somente leitura** do D1 e opcionalmente das APIs publicas. Nao altera fontes, contas ou segredos.
- **Sem fonte de video autorizada cadastrada, o player continua indisponivel.** Iframe nao garante que o fornecedor permita incorporacao e nao possibilita controlar o video interno ou bloquear todos os anuncios.

**Endereco de producao usado nos testes anteriores:** `https://lisoflix.jjszjhon.workers.dev` — nao confundir com URLs Workers antigas de outra conta. Confirme o endereco exibido pelo seu deploy atual.

**Instalacao:** para atualizar apenas o GitHub, execute `09-ATUALIZAR-GITHUB.ps1` na pasta extraida. Para fazer deploy do Worker, execute `10-PUBLICAR-CLOUDFLARE.ps1` e confira a conta e o UUID exibidos. Para consultar fontes, execute `11-GERENCIAR-FONTES.ps1` e escolha 1. Para diagnostico somente leitura, use `12-VERIFICAR-PLAYER.ps1`.

---

# LISOFLIX v1.5.1 — gerenciamento de fontes corrigido

Esta versão **não cria filmes para reprodução automaticamente**. A API de catálogo retorna informações, capas e trailers; reproduções completas só funcionam quando houver uma fonte de vídeo autorizada cadastrada, com URL HTTPS permitida para o player nativo ou um embed que o titular permita incorporar. A existência de um iframe de terceiros não assegura licença de exibição nem sua disponibilidade.

## O que mudou nesta versão

- `11-GERENCIAR-FONTES.ps1`: menu no PowerShell para **listar, cadastrar e desativar** fontes de filmes ou episódios, identificados por IDs TMDB. Possui validação de banco/conta, confirmação explícita e backup remoto fora do GitHub antes da primeira mudança.
- `/api/system-check`: retorna `activeSources` e `activeEmbeds`, separadamente. Não revela URLs privadas, senhas nem chaves.
- Mensagens do player aperfeiçoadas para URLs, formatos e domínios não permitidos.
- Conserva **Cloudflare D1, contas, perfis, comentários e histórico existentes**. Não requer recriação do banco e não altera o `schema.sql`.
- Mantida a correção PBKDF2 de **100.000** iterações da versão `worker.js` que você enviou. É necessário planejar uma evolução segura do armazenamento de senhas antes de abrir o cadastro para o público, com migração de hashes antigos.
- `wrangler.jsonc` acompanha o banco e as variáveis presentes no arquivo que você enviou. **Antes de publicar, confirme que o UUID ainda pertence à conta Cloudflare desejada.** O script de deploy verifica o UUID remoto e interrompe em caso de divergência.

## Primeiro uso: gerenciar fontes

1. Extraia o ZIP em uma pasta nova e abra o PowerShell dentro da pasta `LISOFLIX`.
2. Rode `powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\11-GERENCIAR-FONTES.ps1"`.
3. Confirme **a conta Cloudflare e o UUID do D1**. Escolha `1` para listar, `2` para cadastrar vídeo nativo, `3` para cadastrar embed autorizado ou `4` para desativar um registro.
4. Informe `movie` ou `tv`, ID do título no catálogo e, no caso de série, temporada e episódio. Para vídeos próprios, informe a URL HTTPS e o tipo MIME. Para incorporação de terceiros, é preciso ter os direitos necessários.
5. As mudanças no D1 remoto são imediatas, **sem necessidade de novo deploy**, desde que o Worker já esteja atualizado e usando o mesmo banco.

**Sobre vídeos nativos:** adicione os domínios de mídia autorizados à variável de ambiente `MEDIA_ALLOWED_HOSTS` da Cloudflare, separados por vírgula. Exemplo fictício: `midia.exemplo.com,cdn.exemplo.com`. O player aceita MP4, WebM e HLS; alguns navegadores precisam de suporte adicional para HLS e não existe garantia de funcionamento sem testes.

**Sobre embeds:** a integração fica restrita a registros explicitamente cadastrados na tabela `playback_embeds`, quando `ENABLE_EXTERNAL_EMBEDS=true`. A incorporação usa um iframe com isolamento, que pode impedir funcionamento de serviços que exigem pop-ups ou redirecionamentos. Não são removidos anúncios dentro do iframe e a barra de progresso própria não controla o vídeo de terceiros.

## Atualizar o GitHub e o Worker

- **GitHub:** `powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\09-ATUALIZAR-GITHUB.ps1"`. O script atualiza `jhonjhsz2003-afk/LISOFLIX` sem force push; caso o `database_id` do GitHub seja diferente, exige confirmação.
- **Cloudflare:** `powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\10-PUBLICAR-CLOUDFLARE.ps1"`. Confirma conta e UUID remoto, faz backup e executa testes, migração não destrutiva e deploy. Nunca cole o token TMDB no código.
- Confirme a versão em `/api/config` (**1.5.1**), a estrutura do D1 em `/api/health` (`schemaReady: true`) e os números de fontes em `/api/system-check`.

As instruções anteriores da documentação permanecem abaixo para referência. Os passos específicos desta seção prevalecem sobre os procedimentos de versões antigas.

---

# LISOFLIX 1.4.0 — publicação conferida

Esta versão atualiza o site, a API do catálogo, os perfis, as reações e o player de fontes próprias/autorizadas. Está preparada para **Cloudflare Workers + D1** e para o repositório `jhonjhsz2003-afk/LISOFLIX`.

## CORREÇÃO IMPORTANTE: `D1_ERROR: no such table: users`

Esse erro significa que o banco D1 conectado ao Worker não recebeu todas as tabelas. **Publicar arquivos no GitHub não executa automaticamente `schema.sql` no D1.**

1. Extraia este ZIP e abra o PowerShell dentro da pasta `LISOFLIX`.
2. Instale Node.js LTS (se necessário) e faça login na Cloudflare: `npx wrangler login`.
3. Confira se o nome do Worker em `wrangler.jsonc` corresponde ao Worker que você quer atualizar (por padrão, `lisoflix`). O banco precisa estar na conta Cloudflare correta com o nome `lisoflix-db` e binding `DB`.
4. Execute o script a seguir na pasta extraída:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\08-VERIFICAR-CORRIGIR-PUBLICAR.ps1"
```

Esse script executa, nesta ordem: **backup remoto do D1**, criação das tabelas ausentes sem limpar contas existentes, deploy Cloudflare e atualização do GitHub. O backup fica em `%LOCALAPPDATA%\LISOFLIX\backups`, **fora da pasta do projeto e do GitHub**. Nunca envie backups do banco para repositórios públicos.

Se quiser separar as etapas, execute primeiro `05-CORRIGIR-D1-E-PUBLICAR.ps1` e depois `04-ATUALIZAR-REPOSITORIO-EXTRAIDO.ps1`. **Não use** o script `01` novamente, pois o repositório já existe.

O ZIP usa o UUID D1 que estava configurado no repositório público LISOFLIX nesta revisão. O script confere esse UUID com o banco remoto e **interrompe sem alterar dados** se o identificador divergir. Não crie outro banco se o `lisoflix-db` já existe.

### Confirmar a publicação

No endereço **real** do seu Worker, abra primeiro:

- `https://lisoflix.jhonjhszgame2003.workers.dev/api/system-check` → confirme `version:"1.4.0"`, `schemaReady:true` e `catalogAuth:"authorized"`. `activeSources:0` significa que não há vídeos autorizados cadastrados; não é erro do TMDB.

Verificações adicionais:

- `https://SEU-SITE.workers.dev/api/health` → confirme `database: true`, `schemaReady: true` e `missing: []`.
- `https://SEU-SITE.workers.dev/api/tmdb/check` → confirme `configured: true` e `authorized: true`.

Se `schemaReady` for falso, verifique se seu Worker tem o binding `DB` apontando para o **mesmo UUID** do banco onde o SQL foi aplicado. Confira também a conta Cloudflare e o nome do Worker. O script interrompe a operação quando detecta diferença entre os UUIDs configurado e remoto.

## Configurar o catálogo

Em **Cloudflare → Workers & Pages → LISOFLIX → Settings → Variables and Secrets**, cadastre:

- Secret **`TMDB_API_KEY`** → API Key v3 **ou** API Read Access Token longo. O backend detecta JWT e envia `Authorization: Bearer`.
- Alternativamente, Secret **`TMDB_BEARER_TOKEN`** para o token longo.

Nunca salve chaves no repositório. O endereço `/api/tmdb/check` permite verificar autenticação sem revelar a chave. As imagens do catálogo são servidas pela CDN oficial do provedor de metadados. Caso uma imagem individual esteja ausente ou indisponível, o frontend tenta a capa alternativa e então exibe uma arte de substituição.

## Player LISOFLIX

O antigo iframe externo da v1.2 dependia de páginas de terceiros e apresentou `ERR_BLOCKED_BY_CSP`. Essa dependência **não pode oferecer reprodução confiável nem controles personalizáveis** e foi removida do player principal. A variável antiga `ENABLE_EXTERNAL_EMBEDS` não ativa vídeos na versão 1.3.

A versão 1.3 usa `<video>` nativo com interface personalizada, avanço, volume, play/pausa, tela cheia e salvamento de progresso por perfil. **Para assistir a um filme ou episódio, você precisa configurar uma fonte de vídeo que tem o direito de disponibilizar.** Os metadados do TMDB não fornecem filmes para reprodução. Arquivos MP4 e WebM funcionam conforme os recursos do navegador; HLS nativo depende de compatibilidade do navegador.

Para integrar um vídeo **próprio ou licenciado**:

1. Hospede-o em HTTPS (seu servidor ou CDN que autorize incorporação).
2. Configure no Worker uma variável chamada **`MEDIA_ALLOWED_HOSTS`** com uma lista de domínios autorizados separados por vírgula, sem `https://`. Exemplo: `videos.seudominio.com`.
3. Cadastre a fonte no banco D1, substituindo ID e URL pelo seu título e arquivo **autorizados**. No exemplo, `123456` é um ID fictício de filme:

```sql
INSERT OR REPLACE INTO playback_sources
(media_type, media_id, season, episode, url, mime, label, enabled)
VALUES ('movie', 123456, 0, 0,
  'https://videos.seudominio.com/video-autorizado.mp4',
  'video/mp4', 'HD', 1);
```

Para episódio de série, use `media_type='tv'` e preencha `season` e `episode`. **Domínios fora de `MEDIA_ALLOWED_HOSTS` são rejeitados**; nenhuma origem desconhecida é aberta automaticamente. Certifique-se de que o servidor tenha CORS e permissões adequadas para streaming. Sem fonte válida, o site explica a indisponibilidade e oferece o trailer, quando existir.

## Recursos desta versão

- Identidade visual LISOFLIX, com ícones oficiais e **sem slogan** nas telas e metadados.
- Navegação de páginas, detalhes, trailer e reprodução pelo botão Voltar do navegador e botão Voltar da interface.
- Catálogo separado por Filmes, Séries, Animes e Desenhos, com imagens de substituição quando necessário.
- Carrosséis com botões translúcidos sobre as capas, janelas maiores, episódios, títulos relacionados e coleções.
- Login e cadastro por e-mail/senha; contas, perfis, listas, comentários, votos e progresso persistentes no D1.
- Curtidas e comentários atualizados automaticamente a cada 5 segundos nas janelas abertas (**atualização periódica, não WebSocket instantâneo**).
- Atualização periódica de catálogo com cache e rotinas agendadas, conforme disponibilidade do fornecedor (**não notificação instantânea de lançamentos**).

## Testes e limitações

No diretório do projeto: `npm run check` e `npm test` (**32 testes locais nesta versão**). Os testes usam um banco SQLite temporário; não representam um teste do Worker real. Valide cadastro/login, conteúdo, imagens, botão Voltar e reprodução de uma fonte autorizada no seu endereço Cloudflare depois do deploy.

**Atenção:** recuperar senha por e-mail, verificação de e-mail, painel administrativo, uploads pessoais de avatares e bloqueio etário real ainda não estão finalizados. A pasta `public/avatars` aceita mídias GIF, PNG, JPG e WebP incluídas pelo operador no `manifest.json`. O player não remove anúncios dentro de sites externos.

O TMDB exige atribuição em uma área de créditos legais; por isso, o crédito existe somente na seção discreta de informações legais do rodapé, não nos destaques/capas/player.

## Entendendo o diagnóstico v1.4.0

- `version` diferente de `1.4.0`: seu navegador ou Worker ainda está com versão antiga; publique com `08-VERIFICAR-CORRIGIR-PUBLICAR.ps1` e use `Ctrl + Shift + R`.
- `schemaReady:false`: banco D1 incompleto ou conectado incorretamente. O script aplica `schema.sql` sem apagar tabelas existentes.
- `catalogAuth:"unauthorized"`: o TMDB recusou a chave/token armazenado no Secret. Verifique-o no painel Cloudflare; nunca cole tokens no chat ou GitHub.
- `catalogAuth:"unavailable"`: a chamada TMDB falhou por conexão/limite/tempo; tente novamente e confira logs do Worker.
- `activeSources:0`: **nenhum filme inteiro tocará apenas por ter metadados TMDB**. É preciso cadastrar mídias autorizadas na tabela `playback_sources` e o domínio em `MEDIA_ALLOWED_HOSTS`.
- `externalEmbedsSupported:false`: o player com iframe de terceiros foi removido porque mostrou erros de CSP; a variável antiga `ENABLE_EXTERNAL_EMBEDS` não ativa esse recurso. Não tente relaxar CSP para contornar bloqueios do fornecedor.

Este pacote mantém o código do site, corrige diagnóstico e atualização de versão, exibe indisponibilidade com clareza e preserva o tempo de reprodução gravado no D1. **A publicação em sua Cloudflare depende da execução do script no seu PC e de credenciais válidas.**


## Integração opcional com o player do guia enviado — v1.4.0

O ZIP `se_player(1).zip` contém **um arquivo PHP** que chama `https://getsuperembed.link` e redireciona o navegador para um URL externo. Cloudflare Workers não executa esse PHP. O arquivo recebido ainda usa `CURLOPT_SSL_VERIFYPEER=FALSE` (inseguro); ele **não foi copiado**. Em vez disso, o LISOFLIX suporta a modalidade simples de `iframe` fornecida pelo guia, que é compatível com Workers. **Não garante que o servidor externo funcione, aceite incorporação ou não exiba anúncios.** Não use para exibir conteúdo sem direitos de distribuição/incorporação.

**Para títulos cuja incorporação está autorizada**, siga este processo:

1. Faça backup do banco; execute `npx.cmd wrangler d1 execute lisoflix-db --remote --file=./schema.sql` para criar a tabela nova `playback_embeds` (não altera contas existentes).
2. Configure a variável `ENABLE_EXTERNAL_EMBEDS` como `true` no `wrangler.jsonc` e publique com `npx.cmd wrangler deploy`. O pacote vem com `false` por segurança. Variáveis alteradas só no painel podem ser sobrescritas durante um deploy posterior.
3. Cadastre **cada título autorizado**, com seu ID TMDB correto. Exemplo de sintaxe com ID fictício de teste (substitua):

```sql
INSERT OR REPLACE INTO playback_embeds(media_type,media_id,season,episode,provider,mode,label,enabled)
VALUES ('movie',123456,0,0,'embedmovies','standard','Player autorizado',1);
```

Para episódios, use `media_type='tv'`, `season` e `episode` reais; utilize `mode='standard'`; incorporações só devem ser registradas com direitos de exibição válidos.

O backend monta links com `video_id`, `tmdb=1` e, para episódios, `s` e `e`, sem aceitar URL arbitrária vinda da interface. O iframe usa sandbox **sem** `allow-popups` e **sem** permissão de navegação de nível superior. Alguns provedores podem não funcionar sob essa proteção. O usuário não recebe controles falsos para vídeos externos: barra de tempo, idioma, áudio e legendas são de responsabilidade do próprio fornecedor. Progresso exato só está disponível no player nativo, a menos que o fornecedor ofereça uma API formal e autorizada.

**Não há reprodução automática de todos os filmes do TMDB.** Ter o título no catálogo não implica licença, fonte válida ou direito de incorporação.

### Atualização para GitHub e Cloudflare

O script `09-ATUALIZAR-GITHUB.ps1` envia esta versão ao repositório existente sem publicar bancos ou Secrets. O `10-PUBLICAR-CLOUDFLARE.ps1` verifica o UUID D1, salva backup local fora do repositório, aplica `schema.sql`, executa testes e publica o Worker (não atualiza o GitHub). Execute cada script a partir da pasta extraída usando `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\NOME-DO-SCRIPT.ps1`.
