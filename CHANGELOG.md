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
