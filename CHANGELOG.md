## 1.6.2 — reprodução de séries inspirada no AnimeDragon

- Uso de ID TMDB/temporada/episódio para a montagem da URL documentada do EmbedMovies.
- Registro de série autorizada (temporada 0, episódio 0) permite abrir seus episódios sem cadastrar cada um.
- Registro de episódio específico desativado prevalece e impede exibição desse episódio.
- Botão Assistir em série escolhe primeiro episódio existente, sem tentar episódio 0.
- Iframe com prioridade alta de carregamento e sandbox restrito, sem popups.
- Testes específicos da diferença entre fonte cadastrada e reprodução realmente confirmada.
- Banco D1, contas e comentários preservados; não há migração nesta versão.

## 1.6.1 — grade responsiva e gêneros de anime
- Capas de gênero e idioma maiores (5 desktop / 4 laptop / 3 tablet / 2 mobile), formato panorâmico 16:9.
- Filtro de gêneros em Animes com séries e longas japoneses; filtros de Filmes e Séries excluem animações.
- Maior quantidade de títulos por idioma, com tolerância a falhas de páginas individuais.
- Player EmbedMovies com permissão encrypted-media, recarregar e voltar; iframe seguro sem pop-ups.
- Atualização de Worker sem executar novamente migrações D1; script verifica UUID e salva backup.
- Integração de iframe requer fonte previamente autorizada/cadastrada e pode depender do provedor.

# LISOFLIX 1.6.0 (preparado, não publicado)

- Remove os atalhos duplicados "Tudo / Filmes / Séries / Animes / Desenhos / Bombando" da tela inicial. Navegação principal continua.
- A seta de voltar fica oculta no Início.
- Reorganiza os controles de carrossel em botões pequenos sobre as capas.
- Busca com sugestões enquanto o visitante digita (sem esperar Enter); o catálogo remoto exige conexão.
- Nova seleção de gêneros em Filmes e Séries; consultas paginadas em idiomas, desenhos e animes.
- Novas categorias de doramas, séries de ficção e animações; hero intercala destaques de filmes, séries e animes.
- Envia um snapshot reduzido de filmes para Minha Lista e histórico; evita erro de requisição grande.
- Exibe editar/excluir somente nos comentários do próprio perfil e valida a propriedade também no D1.
- Remove criação/edição/verificação de PIN do perfil (senha da conta principal preservada). Se houver um único perfil, entra automaticamente ao fazer login.
- Remove integração do SuperEmbed e prepara fontes explicitamente autorizadas do EmbedMovies. Não disponibiliza mídia sem fonte cadastrada nem garante funcionamento de iframes externos.
- Migração explícita da tabela playback_embeds e limpeza dos antigos PINs dos perfis, somente após confirmação e backup. Não altera contas, senhas principais ou comentários.
- Catálogo atualizado por cache e consulta periódica; NÃO garante push em tempo real do TMDB ou de providers de vídeo.

## Publicação
Execute npm test antes de atualizar GitHub ou Cloudflare. O script de Cloudflare salva backup remoto em LOCALAPPDATA e exige as confirmações SIM e LIMPAR. Faça upload do pacote completo ao repositório correto, nunca do backup D1.

## v1.5.1 — Gerenciador D1 e diagnostico

- Correcao de identificacao do banco pelo UUID, evitando falha falsa por nome diferente.
- Confirmacao sem distincao entre sim/SIM; visualizacao de linhas do D1 com Wrangler `--json`.
- Backup D1 antes de qualquer cadastro/alteracao de fonte e sem incluir arquivos privados no GitHub.
- Script de deploy com validacao de UUID, sem mudar bancos de contas.
- Script de verificacao da configuracao das fontes, somente leitura.
- Versao do Worker e cache-bust atualizados para 1.5.1.
- Nenhum embed adicionado automaticamente; fonte exige autorizacao e registro por titulo.

# LISOFLIX — histórico de mudanças

## v1.5.0 — Cadastro guiado de fontes

- Menu de operação separado do site, sem painel administrativo público, para cadastrar/listar/desativar fontes explícitas por título e episódio.
- Confirmada a conta Cloudflare, `database_id` e permissões antes de qualquer escrita no D1.
- Backup D1 salvo fora da pasta do GitHub antes da primeira alteração.
- `/api/system-check` inclui contagem de players externos ativos sem expor URLs.
- Mensagens mais específicas do player, preservando contas, perfis e dados do banco.
- Configuração do D1 preservada conforme arquivo que o usuário enviou. Não envia Secrets ao repositório.
- Corrigido o conflito entre os testes antigos de versão/flags e a configuração de produção desejada.

# LISOFLIX 1.4.0 — análise e compatibilidade do player externo

- Estudado `se_player.php` enviado: PHP utiliza serviço externo de redirecionamento e desativa a verificação de TLS; o arquivo PHP não é executável em Cloudflare Workers e não foi integrado.
- Novo suporte a iframe externo documentado (modal e política CSP restritos), com controles pertencentes à origem terceira, sem anúncios e pop-ups garantidamente removidos.
- Cadastro manual de fonte incorporada autorizado por título via `playback_embeds`, sem modificar dados antigos do D1 ou inferir direitos de exibição a partir de metadados.
- Variável `ENABLE_EXTERNAL_EMBEDS=false` por padrão; habilitação explícita quando usuário tiver permissão de reprodução, com alternativa de arquivo MP4/WebM autorizado ainda prioritária.
- Cache bust de assets para 1.4.0, relatório de diagnóstico e testes da integração.

# Registro de alterações — LISOFLIX

## v1.3.1 (14/10/2026)

- Corrigidos diagnósticos de autenticação, banco e fontes com a rota pública `/api/system-check` (sem expor segredos).
- Ajustado cache de autenticação TMDB: respostas de erro não ficam em cache; resultados antigos do catálogo são usados temporariamente em falhas de rede quando disponíveis.
- Corrigida preservação da posição do vídeo ao abrir o player (antes podia zerar o progresso salvo).
- Versões de JS e CSS identificadas no HTML para evitar arquivos antigos mantidos pelo navegador.
- Script `08-VERIFICAR-CORRIGIR-PUBLICAR.ps1` valida UUID D1, salva backup fora do GitHub, aplica esquema, testa, publica Cloudflare e sincroniza o repositório.
- Os scripts 05 e 07 passam a chamar o procedimento mais seguro, e o 04 exclui backups/bancos locais da sincronização.
- 32 testes locais aprovados; testes remotos dependem da Cloudflare e das suas credenciais.

## v1.3.0 (14/10/2026)

- Diagnóstico do schema D1 e erros amigáveis quando tabelas estão ausentes.
- Script `05` exporta um backup remoto do D1 antes de aplicar o SQL e publicar o Worker.
- Script `07` combina correção Cloudflare e atualização GitHub na ordem mais segura.
- Nova estrutura de fontes autorizadas (`playback_sources`) e progresso (`playback_progress`).
- Novo player nativo LISOFLIX com volume, linha de reprodução, seek, tela cheia e progresso por perfil.
- Remoção do iframe externo bloqueado do player principal; fonte não autorizada ou ausente informa indisponibilidade e oferece trailer.
- Integração TMDB v3/Bearer preservada; mensagens de erro do catálogo mais visíveis e fallback para capas.
- Navegação por histórico de páginas, detalhes, trailer e reprodução.
- Ajustes de interface para carrosséis, botões, card de detalhes, player e dispositivos móveis.
- Retirado o slogan da interface pública e metadados; somente LISOFLIX.
- 24 testes locais incluindo SQLite, cadastro/login, votos e controle de fontes de vídeo.

## v1.2.1

- Correção do tratamento API Key v3 ou token Bearer na variável TMDB_API_KEY.

## v1.2.0

- Separação de catálogo, curtidas, comentários e primeira correção D1.

## v1.1.0

- Identidade visual LISOFLIX e ícones para navegador e dispositivos.
