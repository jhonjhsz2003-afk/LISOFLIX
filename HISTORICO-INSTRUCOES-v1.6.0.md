# LISOFLIX v1.6.0 — instalação na Cloudflare correta

## Mudanças principais

- Início sem a fileira redundante `Tudo / Filmes / Séries / Animes / Desenhos / Bombando`. O menu superior continua funcionando.
- Busca enquanto digita, com sugestões de títulos e busca completa ao pressionar Enter.
- Carrosséis com setas pequenas e transparentes sobre as capas.
- Página inicial sem seta Voltar; seta disponível nas outras seções.
- Filtros de gênero nos catálogos de Filmes e Séries, conteúdo paginado em Animes, Desenhos e Idiomas, novos destaques de doramas.
- Corrige o erro `Requisição muito grande` ao salvar em Minha Lista e ao registrar histórico, enviando apenas os metadados essenciais.
- Comentários: editar/excluir somente os próprios (verificação de propriedade também no D1).
- Ao registrar conta, já existe um perfil; login com um único perfil passa a selecioná-lo automaticamente.
- PIN de perfil removido. **A senha da conta principal permanece**.
- A integração antiga SuperEmbed/MultiEmbed é eliminada do backend e da CSP. O adaptador EmbedMovies só funciona para fontes **explicitamente autorizadas e cadastradas**, não para todo o catálogo automaticamente.

## Antes de publicar

1. Descompacte o ZIP completo dentro de uma pasta vazia. Faça backup da pasta antiga e preserve seus dados de configuração.
2. Confira que `wrangler.jsonc` está apontando para o **UUID real do D1 da conta correta**. Não misture com banco de outra conta Cloudflare.
3. Garanta que o Secret `TMDB_API_KEY` ou `TMDB_BEARER_TOKEN` já esteja configurado no Worker **da mesma conta Cloudflare**.
4. Rode `npm.cmd test` na pasta do projeto; deve apresentar testes locais bem-sucedidos. Não são testes de reprodução real do provedor.
5. Execute primeiro o **10-PUBLICAR-CLOUDFLARE.ps1**, especialmente se seu GitHub estiver com deploy automático. Ele valida o UUID, salva um backup remoto fora do repositório e pede duas confirmações: `SIM` e `LIMPAR`.
6. A etapa `LIMPAR` migra a tabela `playback_embeds`, remove cadastros antigos de embeds e limpa hashes de PIN dos perfis. **Não altera e-mails, senhas principais, históricos, listas, comentários ou curtidas**.
7. Com o site validado no `/api/health`, `/api/system-check` e cadastro/login, execute **09-ATUALIZAR-GITHUB.ps1** para atualizar o repositório sem forçar o histórico.

### Comandos (PowerShell)

```powershell
npm.cmd test
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\10-PUBLICAR-CLOUDFLARE.ps1"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\09-ATUALIZAR-GITHUB.ps1"
```

## Limitações conhecidas

- Disponibilidade de filme ou episódio no catálogo do TMDB **não significa** que um vídeo esteja disponível em EmbedMovies. O LISOFLIX não cadastra fontes automaticamente sem direito de exibição.
- Um iframe externo pode ser bloqueado por CSP ou pelo próprio fornecedor. Os controles internos não podem ser redesenhados pelo LISOFLIX.
- O catálogo se atualiza por cache, cron e verificação periódica. Não há eventos push instantâneos de uploads no provedor.
- Testes automatizados verificam a API e o código, mas o visual em todos os dispositivos e reprodução real precisam de testes no ambiente publicado.
- Antes de abrir o cadastro para o público, acrescente verificação de e-mail, recuperação de senha, políticas de privacidade e tratamento de denúncias/moderação.
