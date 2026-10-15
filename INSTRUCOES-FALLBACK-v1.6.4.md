# LISOFLIX v1.6.4 — opção secundária de reprodução e interface limpa

## Funcionalidade

- EmbedMovies permanece como opção 1 (primário).
- SuperEmbed/MultiEmbed é opção 2 (secundário), configurável por `ENABLE_SUPEREMBED_FALLBACK`.
- O botão **Trocar player** aparece na barra superior do vídeo quando houver duas opções. **Recarregar** fica ao lado, com ícone compacto. Foram removidas as duas barras inferiores mostradas na imagem do usuário.
- Trocar fecha/substitui o iframe anterior; nunca há dois vídeos carregados simultaneamente. Não é possível detectar com segurança que o vídeo está indisponível por um simples evento de carregamento do iframe. Por isso a escolha do segundo player é manual.
- Um novo vídeo ou episódio começa sempre no Player 1, não herda a opção 2 de outro título.
- Filmes: EmbedMovies `https://myembed.biz/filme/{tmdb}`; SuperEmbed `https://multiembed.mov/?video_id={tmdb}&tmdb=1`.
- Séries/animes: EmbedMovies `https://myembed.biz/serie/{tmdb}/{temporada}/{episodio}`; SuperEmbed `https://multiembed.mov/?video_id={tmdb}&tmdb=1&s={temporada}&e={episodio}`.
- O backend informa `availabilityVerified:false`. **Gerar URL não confirma que exista vídeo, autorização de exibição ou reprodução real.**
- Um cadastro D1 com `enabled=0` continua bloqueando ambas as opções. Vídeos próprios/permitidos de `playback_sources` mantêm prioridade.

## Segurança e dados

- Nenhum banco foi recriado. O pacote não altera `schema.sql` nem executa migrações.
- O iframe mantém `sandbox` sem `allow-popups`, não executa scripts externos no contexto do LISOFLIX e não faz proxy nem remove anúncios do fornecedor.
- CSP `frame-src` permite apenas origens conhecidas dos dois serviços; redirecionamentos podem ser bloqueados pelo navegador, pela CSP ou pelo próprio fornecedor. Não tente contornar tais restrições.
- Utilize exclusivamente conteúdos com direitos de incorporação/exibição. O site do provedor anunciar player gratuito **não** comprova licenciamento dos filmes.
- `ENABLE_SUPEREMBED_FALLBACK=true` permite a opção 2 onde existe uma fonte EmbedMovies explícita válida ou descoberta automática autorizada. Desative a flag se não houver autorização para fontes secundárias.
- As senhas, contas, perfis, comentários, favoritos, histórico e segredos da Cloudflare não foram alterados.

## Publicação

1. Extraia o pacote e confira o `database_id` real no `wrangler.jsonc` e a conta Cloudflare autenticada.
2. Execute `10-PUBLICAR-CLOUDFLARE.ps1`: verifica a conta, gera backup D1 fora do GitHub, roda testes locais e executa deploy **sem migrar D1**.
3. Teste primeiro em seu navegador dois conteúdos autorizados (um filme e um episódio).
4. Se tudo estiver certo, execute `09-ATUALIZAR-GITHUB.ps1` para enviar ao repositório existente sem force-push.
5. Confira `/api/config` — versão `1.6.4`, `secondaryPlayer:"superembed"` quando habilitado. `/api/system-check` também contém `secondaryPlayerEnabled`.

## Limitações

Os serviços externos podem não hospedar o título, bloquear iframes, anunciar conteúdo não adequado ou exigir ações internas impossíveis de controlar pelo site. A troca manual não é prova de disponibilidade. Não há reprodução garantida de todos os títulos. As verificações locais testam código e respostas de API; a experiência real com fornecedores precisa ser avaliada na Cloudflare.
