# LISOFLIX 1.7.0 — instalação e notas de atualização

Projeto estático + Cloudflare Workers + D1, com catálogo de metadados TMDB e duas opções de reprodução via iframe **apenas para conteúdos cuja incorporação/exibição seja autorizada**.

## Mudanças desta versão

- Player principal: EmbedMovies (`https://myembed.biz/filme/{id}` e `https://myembed.biz/serie/{id}/{temporada}/{episodio}`).
- Player alternativo: API do PrimeVício/Cineveok, conforme formato mostrado na documentação fornecida pelo operador (`https://cineveok.firebaseapp.com/embed/movie/{id}` e `https://cineveok.firebaseapp.com/embed/tv/{id}/{temporada}/{episodio}`). **A disponibilidade real do fornecedor precisa ser verificada no site publicado.**
- API anterior de player secundário removida do código ativo, da CSP e da configuração Wrangler.
- Escolha de fonte clara no topo do player. O visitante pode trocar a fonte se houver uma falha ou preferir a alternativa. Em caso de erro de iframe sinalizado pelo próprio navegador, a troca pode acontecer automaticamente, mas navegadores não expõem os erros internos dos iframes externos.
- Perfis: separa a listagem dos formulários de adicionar/editar, permite alterar avatar sem apagar campos preenchidos; não solicita PIN de perfil. Senha principal de acesso à conta permanece.
- Histórico: “Continuar assistindo” para títulos abertos, “Já assistidos” para os marcados; barra de progresso somente para mídias nativas com tempo realmente conhecido ou para títulos marcados como assistidos. Em iframes sem eventos de reprodução documentados, não se inventa minuto nem marca como visto ao carregar a página.
- Recomendações pelo gênero e tipo dos conteúdos no histórico, sem passar informações pessoais aos provedores de vídeo.
- Navegação visível imediatamente ao clicar nas abas, cabeçalho e avatares maiores. Atualização do catálogo no navegador a cada 2 minutos, e sincronização do histórico ativo a cada 30 segundos. São consultas periódicas, **não eventos em tempo real/push** de fornecedores externos.

## O que NÃO é possível garantir

O selo “Premium / com anúncios” está **dentro do iframe de outro domínio**. O LISOFLIX não pode inspecionar esse selo via JavaScript (Same-Origin Policy), e a documentação disponibilizada do Cineveok e EmbedMovies não inclui um endpoint oficial que o indique. Por isso, a troca **não é automática por cor/selo**: o usuário escolhe a segunda fonte; o navegador pode tentar trocar apenas se comunicar erro real de carregamento. Não há promessa de que todos os filmes estejam disponíveis ou de que o fornecedor tenha direitos de exibição de todos os títulos.

No player externo, os controles internos, anúncios, legendas e qualidade pertencem ao provedor. Iframes sem sandbox têm riscos extras de anúncios/pop-ups. Não incluí bloqueio invasivo de publicidade ou acesso ao DOM do provedor.

## Publicar com segurança

1. Faça cópia da pasta anterior do LISOFLIX. Descompacte este projeto em nova pasta. Confirme que `wrangler.jsonc` contém o UUID do D1 **da conta Cloudflare correta** antes de prosseguir.
2. No PowerShell nessa pasta, execute `powershell.exe -NoProfile -ExecutionPolicy Bypass -File '.\10-PUBLICAR-CLOUDFLARE.ps1'`. O script verifica o UUID, confirma a conta, cria backup fora do GitHub, executa `npm test` e só então publica. **Não executa migração nem substitui o banco.**
3. Atualize o repositório GitHub, se desejado, com `powershell.exe -NoProfile -ExecutionPolicy Bypass -File '.\09-ATUALIZAR-GITHUB.ps1'`. Tenha cuidado com deploy automático pelo GitHub, que pode sobrepor outra publicação do Worker.
4. Confira `/api/config` (versão `1.7.0`, `secondaryPlayer: "cineveok"`) e `/api/system-check` (`database: true`, `schemaReady: true`, `catalogAuth: "authorized"`). Teste filme, série, anime, PIN removido, comentários e ambos os players no navegador.

Os Secrets `TMDB_API_KEY`/`TMDB_BEARER_TOKEN` devem permanecer no painel da Cloudflare; nunca no repositório ou nos arquivos `public/`. A variável `ENABLE_CINEVEOK_FALLBACK` no Wrangler ativa ou desativa o botão de fonte alternativa. Essa variável não confere direitos de exibição.

O histórico e as contas existentes são preservados. Esta atualização **não altera `schema.sql` nem tabelas de produção**. Como em qualquer mudança online, faça o backup antes e teste gradualmente.

## Testes locais

Rode `npm run check` e `npm test`. Testes locais usam banco SQLite temporário, não substituem testes no Workers publicado nem garantem funcionamento do provedor externo.
