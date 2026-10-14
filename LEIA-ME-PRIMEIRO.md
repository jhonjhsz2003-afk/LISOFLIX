# LISOFLIX — Tá liso? Dá o play!

Projeto independente para Cloudflare Workers + D1, preparado para publicar pelo GitHub da conta `jhonjhsz2003-afk`.

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
4. No Cloudflare, adicione ao **Worker** um Secret com nome **`TMDB_API_KEY`** (sua **API Key v3**, não um token Bearer v4). Esse Secret nunca deve ir para o GitHub. A API consulta o segredo por `env.TMDB_API_KEY`. Também aceita `TMDB_BEARER_TOKEN` alternativo (token de leitura v4), mas não é necessário.
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
│   ├── app.js                 Catálogo, detalhes, perfis, listas, player, comentários
│   ├── demo.js                Amostra ilustrativa para a prévia sem TMDB
│   └── style.css
├── src/worker.js             Backend Cloudflare /api/*, sessões, TMDB e cron
├── schema.sql                Banco Cloudflare D1
├── wrangler.jsonc            Configuração Worker + D1
├── 01-CRIAR-E-PUBLICAR-GITHUB.ps1
├── 02-PUBLICAR-ATUALIZACOES.ps1
├── 03-DEPLOY-CLOUDFLARE.ps1
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
