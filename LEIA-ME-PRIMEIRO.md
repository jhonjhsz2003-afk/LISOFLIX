# LISOFLIX — v1.2.0 (Atualização com correções)

**Para quem já publicou a v1.1.0:** não crie um novo repositório, não apague o D1 e não dê `git push --force`.

## 1 — Atualizar os arquivos no GitHub

Extraia o ZIP v1.2.0, abra o PowerShell dentro da pasta `LISOFLIX` e execute:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\04-ATUALIZAR-REPOSITORIO-EXTRAIDO.ps1"
```

O script clona `jhonjhsz2003-afk/LISOFLIX`, copia a versão nova e faz push **sem forçar**, preservando o `database_id` já salvo no `wrangler.jsonc` do repositório. A atualização no GitHub não necessariamente publica o Worker.

## 2 — Corrigir D1_ERROR login_guards e publicar o Worker

**No mesmo PowerShell, na pasta da versão nova**, rode:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\05-CORRIGIR-D1-E-PUBLICAR.ps1"
```

O script localiza o banco `lisoflix-db` caso o arquivo venha com ID de exemplo, cria as tabelas ausentes via comandos **aditivos** (`CREATE TABLE IF NOT EXISTS`), configura o Worker e publica os arquivos. Se o script identificar mais de um banco ou conta errada, vai parar, sem escolher por conta própria. É obrigatório estar autenticado na conta Cloudflare correta e ter Node.js instalado. Não há `DROP TABLE` no SQL. Recomendável fazer backup antes de migrar o banco de produção.

Alternativa manual (se já tiver o UUID do D1 configurado):

```powershell
npx wrangler d1 execute lisoflix-db --remote --file=./schema.sql
npx wrangler deploy
```

Após publicar, abra o endereço do Worker com `/api/health`. Para o login funcionar, é necessário ver `"database":true` e `"schemaReady":true`. O resultado `"missing":[...]` indica tabelas ainda ausentes.

## CORREÇÃO TMDB 401 (versão 1.2.1)

O backend agora aceita **ambos os formatos** de credencial: **API Key v3** (via `api_key`) ou **API Read Access Token** (via `Authorization: Bearer`). Se um token JWT estiver cadastrado por engano no nome `TMDB_API_KEY`, o Worker o reconhecerá automaticamente e usará o cabeçalho correto. Se as duas variáveis existirem, ele pode tentar a segunda caso a primeira retorne 401.

1. Na Cloudflare, abra **Workers & Pages → LISOFLIX → Settings → Variables and Secrets**.
2. **Opção A:** cadastre `TMDB_API_KEY` com a **API Key v3**, normalmente uma sequência curta de 32 caracteres. **Opção B:** cadastre `TMDB_BEARER_TOKEN` com o **API Read Access Token** (token longo). Não use chave de API da Cloudflare, senha do TMDB, nem token de sessão de usuário.
3. Não cole `api_key=`, `Authorization:` ou URL completa no Secret. Cole somente a credencial, sem espaços/aspas externas.
4. Salve com **Deploy**; alternativamente execute o novo `06-CONFIGURAR-TMDB-SECRET.ps1` no PowerShell para cadastrar a chave sem mostrá-la nos comandos.
5. Abra `https://SEU-WORKER.workers.dev/api/tmdb/check`. **`authorized:true`** confirma que o backend foi aceito pelo serviço de catálogo. `401` significa que o Secret continua inválido, revogado, não ativado ou no Worker errado. `/api/health` informa só se um Secret está presente, **não** confirma se ele funciona.
6. Se a página continuar igual, confirme que está abrindo o **Worker correto** e que a versão 1.2.1 já foi publicada. Não envie suas credenciais em prints, mensagens, código, GitHub ou URLs de teste.

> Uma atualização de software não pode corrigir uma credencial realmente inválida. A nova versão corrige a seleção do modo de autenticação, mas você ainda precisa cadastrar um token válido no Worker.

## 3 — Secret do catálogo

Em **Cloudflare → Workers & Pages → LISOFLIX → Settings → Variables and Secrets**, cadastre como **Secret**:

- Name: `TMDB_API_KEY`
- Value: sua **API Key v3** do TMDB (não a chave pública do site)

A chave é lida exclusivamente pelo Worker como `env.TMDB_API_KEY`. Não coloque a chave em `wrangler.jsonc`, no JavaScript público ou no GitHub. Para atualizar os Secrets também é possível usar `npx wrangler secret put TMDB_API_KEY` no terminal Cloudflare autenticado.

## 4 — Reprodução

O HTML do iframe está integrado à API de reprodução externa. A URL usada segue o formato de IDs de filme e episódio descrito em https://superembed.stream/index.html#install. **A integração permanece desativada por padrão** (`ENABLE_EXTERNAL_EMBEDS=false`), pois metadados não são autorização para distribuir conteúdo. Após confirmar os direitos de exibição e as condições do fornecedor, você pode mudar essa variável para `true` em `wrangler.jsonc` e executar o deploy novamente. Não é possível confirmar a disponibilidade do vídeo para todo título, remover anúncios dentro de frames de outro domínio nem recuperar automaticamente o segundo/minuto de execução de players externos.

## 5 — O que mudou

- Corrigida a ausência da tabela `login_guards` (auto-reparo durante o login + script de criação remota de todas as tabelas, sem apagar contas).
- Novos votos **Curtir/Não curti** por perfil, sincronizados a cada 5 segundos enquanto o título está aberto.
- Comentários sincronizados automaticamente a cada 5 segundos (atualização periódica, não WebSocket).
- Filmes, séries, animes e desenhos separados por critérios de tipo, gênero e idioma original nas categorias do catálogo.
- Detalhes maiores com episódios, coleções e títulos semelhantes da mesma categoria.
- Capas maiores, carrosséis com setas grandes e translúcidas sobre as próprias capas.
- Banner inicial mais alto, com rotação automática de imagens, sem vídeos de fundo.
- Textos promocionais independentes. A atribuição do TMDB permanece nos créditos por exigência de uso dos dados.
- Catálogo verifica mudanças no Worker e renova dados com cache por alguns minutos. Não é feed em tempo real do servidor de vídeo.

## 6 — Limitações desta entrega

Foram executados testes locais de API, banco SQLite, registro, login e votos. Não foi realizado teste do projeto já publicado na sua conta Cloudflare, nem se verificou a disponibilidade real de todos os conteúdos no player. Ainda não há verificação/recuperação de e-mail, upload de avatares de usuários para R2, reprodução hospedada própria ou painel administrativo. Salva-se o último título e episódio aberto, mas não o segundo exato de vídeo em iframes externos. Não configure nada secreto no GitHub.

---

# LISOFLIX — Tá liso? Dá o play!

Projeto independente para Cloudflare Workers + D1, preparado para publicar pelo GitHub da conta `jhonjhsz2003-afk`.

## Atualização de identidade visual (v1.1.0)

O site agora utiliza o emblema metálico L + Play + película e o logotipo LISOFLIX vermelho/laranja enviados pelo criador, otimizados em WebP/PNG com transparência. A marca aparece no cabeçalho, rodapé, entrada/login, tela de carregamento e destaque do catálogo. Também foram atualizados favicon, ícones de instalação em dispositivos e manifest web.

Os assets ficam em `public/brand/`. Para atualizar um projeto já publicado no GitHub, **recomenda-se extrair em uma pasta nova** e usar `04-ATUALIZAR-REPOSITORIO-EXTRAIDO.ps1`: ele clona e atualiza o repositório existente, sem forçar push e preservando o UUID D1 configurado no GitHub. Se preferir extrair em cima da pasta local antiga, preserve `.git` e o `wrangler.jsonc` já configurado e use `02-PUBLICAR-ATUALIZACOES.ps1`. Depois, publique a nova versão no Worker com o script `03-DEPLOY-CLOUDFLARE.ps1` ou a sua integração de deploy; `git push` sozinho não garante atualização no Cloudflare.

## Comece por aqui (Windows)

1. **Extraia o ZIP**. Abra o PowerShell dentro da pasta `LISOFLIX`.
2. Execute:
   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File .\01-CRIAR-E-PUBLICAR-GITHUB.ps1
   ```
3. O script usa a conta `jhonjhsz2003-afk`, cria **um novo repositório público `LISOFLIX`** e envia os arquivos. **Não força push e não apaga outros projetos.** Se preferir repositório privado, execute `...ps1 -Privado` na primeira publicação.
4. Se o GitHub CLI (`gh`) pedir autorização no navegador, conclua o login. **Estar logado no site do GitHub não significa que o terminal já esteja autenticado**. Se `git` ou `gh` não estiverem instalados, o script mostra o que fazer.
5. Futuras mudanças: use `02-PUBLICAR-ATUALIZACOES.ps1`.

## Colocar no Cloudflare (plano Free)

Requer Node.js LTS, npm, conta Cloudflare e acesso ao TMDB.

1. Abra o PowerShell na pasta do projeto e rode `npm install` e `npx wrangler login`.
2. Crie o banco persistente **D1**: `npx wrangler d1 create lisoflix-db`.
3. Copie o `database_id` (UUID) retornado para a propriedade `d1_databases[0].database_id` dentro de `wrangler.jsonc`. **Não use `COLOQUE-AQUI-O-ID-DO-SEU-D1`.**
4. No Cloudflare, adicione ao **Worker** um Secret com nome **`TMDB_API_KEY`** (sua **API Key v3**, não um token Bearer v4). Esse Secret nunca deve ir para o GitHub. A API consulta o segredo por `env.TMDB_API_KEY`. Também aceita `TMDB_BEARER_TOKEN` como Secret alternativo para o token de leitura.
5. Inicialize tabelas no banco de produção: `npx wrangler d1 execute lisoflix-db --remote --file=./schema.sql`.
6. Publique: `npx wrangler deploy`. Ou depois dos passos 1 a 4 rode `03-DEPLOY-CLOUDFLARE.ps1`, que executa tabelas e deploy.
7. Confira no navegador `https://SEU-WORKER.workers.dev/api/health` e `.../api/config`: `database:true` e `tmdb:true`. Depois abra a página inicial e crie uma conta de teste.
8. O GitHub não atualiza o Worker automaticamente por padrão. Use `03-DEPLOY-CLOUDFLARE.ps1` após as mudanças ou configure uma integração GitHub/Cloudflare com comandos de build e deploy compatíveis.

### Executar localmente

Após configurar o UUID do D1 e `npm install`:

```powershell
Copy-Item .dev.vars.example .dev.vars
# Edite .dev.vars e informe a sua TMDB_API_KEY, sem publicar esse arquivo.
npm run db:local
npm run dev
```

O arquivo `.dev.vars` é ignorado pelo Git. **Não grave credenciais em `wrangler.jsonc` ou em arquivos da pasta `public`.**

### Reprodução (SuperEmbed)

- O site usa a estrutura de URL do modo *iframe simples* publicado pelo SuperEmbed: `https://multiembed.mov/?video_id=TMDB_ID&tmdb=1`, com `&s=N&e=N` para episódios. URLs e disponibilidade podem mudar sem aviso.
- A integração vem **desabilitada** no projeto para que você ative somente depois de verificar autorização de reprodução e termos da fonte. Para liberar, altere a variável `ENABLE_EXTERNAL_EMBEDS` para a string `true` em `wrangler.jsonc` ou nas configurações de produção e faça deploy.
- **Não existe bloqueio total garantido de anúncios em iframes de outros domínios.** O player usa isolamento (`sandbox`) sem permissão explícita de pop-ups e sem publicidade própria, porém servidores externos podem exibir anúncios no próprio quadro, impedir a reprodução ou alterar o comportamento. Não há proxy de vídeos ou bypass de DRM.
- **TMDB fornece metadados, não filmes/episódios em vídeo.** Itens no catálogo não significam disponibilidade no player.
- Quando o player é de terceiros, o navegador **não permite ler o segundo exato do vídeo**. Por isso a função Continuar assistindo salva o título e o episódio aberto; não pode prometer o minuto exato em players externos.

### Atualização do catálogo

- A API consulta o TMDB com a chave somente no backend, guarda cache no D1 por aproximadamente 10 minutos e atualiza seções principais por `cron` a cada 30 minutos.
- A página verifica seções principais a cada 5 minutos e comentários de título aberto a cada ~7 segundos. Trata-se de **atualização periódica/quase em tempo real**, não push instantâneo ou confirmação de upload no SuperEmbed.
- Se não houver chave, a tela usa uma amostra de catálogo para visualização, identificada como modo demonstração. Para dados recentes verdadeiros é indispensável configurar o TMDB.

### Dados, perfis e avatares

- O D1 mantém contas, hash de senha PBKDF2 com salt, sessões por cookie HttpOnly, perfis, listas, histórico por episódio, comentários e cache. **Os dados persistem entre dispositivos quando a pessoa entra na mesma conta.**
- Sem Google Login. Máximo 5 perfis, com opção de PIN, além de perfil infantil apenas visual (**ainda sem filtro etário real**).
- Para disponibilizar imagens/GIFs de avatares, coloque arquivos `.png`, `.jpg`, `.webp` ou `.gif` em `public/avatars/` e edite `public/avatars/manifest.json` adicionando os nomes. A interface lê o manifest, inclusive para GIF animado. Imagens grandes aumentam o custo de tráfego, o tamanho do repositório e tempo de carregamento: otimize antes de publicar; **upload de avatar direto pelos usuários requer um sistema de armazenamento adicional, ainda não implementado**.
- **Verificação de e-mail e recuperação automatizada de senha por e-mail ainda não implementadas** — para liberar usuários reais é necessário adicionar um provedor de e-mail com verificação e fluxo seguro de redefinição.
- Considere backups regulares do D1, moderação de comentários e política de privacidade antes de tornar o cadastro público. O código contém uma limitação básica de tentativas de login, mas isso não substitui proteção antiabuso como Cloudflare Turnstile/WAF.
- O painel de administração não faz parte desta entrega, conforme solicitado. Um sistema futuro pode gerenciar estatísticas, usuários, temas e moderação por acesso administrativo.

### Estrutura

```text
LISOFLIX/
├── public/                   Interface responsiva (HTML, CSS, JS)
│   ├── avatars/              Pasta pronta para PNG, JPG, GIF e WebP
│   ├── brand/                Emblema, logotipo, favicon e ícones PWA
│   ├── app.js                 Catálogo, detalhes, perfis, listas, player, comentários
│   ├── demo.js                Amostra ilustrativa para a prévia sem TMDB
│   └── style.css
├── src/worker.js             Backend Cloudflare /api/*, sessões, TMDB e cron
├── schema.sql                Banco Cloudflare D1
├── wrangler.jsonc            Configuração Worker + D1
├── 01-CRIAR-E-PUBLICAR-GITHUB.ps1
├── 02-PUBLICAR-ATUALIZACOES.ps1
├── 03-DEPLOY-CLOUDFLARE.ps1
├── 04-ATUALIZAR-REPOSITORIO-EXTRAIDO.ps1
├── .dev.vars.example
└── LEIA-ME-PRIMEIRO.md
```

### Diagnóstico rápido

| Problema | Verificação |
|---|---|
| `tmdb:false` em `/api/config` | Secret `TMDB_API_KEY` configurado no **Worker correto**; redeploy se necessário |
| `database:false` no `/api/health` | Crie o D1 e confira `binding: DB`, `database_id` |
| Erro `no such table` | Rode `npx wrangler d1 execute lisoflix-db --remote --file=./schema.sql` |
| `401` ao salvar lista | Faça login e selecione um perfil |
| Player desativado | Revise direitos, `ENABLE_EXTERNAL_EMBEDS` e deploy |
| Player mostra erro/anúncio | Player externo fora do controle do site |
| Script de GitHub solicita login | É normal se GitHub CLI ainda não tiver autorização |

**Atribuição TMDB:** Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB. Imagens e metadados pertencem aos respectivos titulares. LISOFLIX não é afiliada à Netflix.
