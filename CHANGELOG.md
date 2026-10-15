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
