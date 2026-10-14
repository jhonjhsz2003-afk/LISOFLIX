# LISOFLIX — Histórico de versões

## 1.2.1 — Correção da autenticação TMDB

- Detecta automaticamente **API Key v3** ou **API Read Access Token (JWT)** no Secret do catálogo.
- Envia credencial v3 na query `api_key` e token de leitura no cabeçalho seguro `Authorization: Bearer`.
- Aceita Secrets com espaços/aspas externas e prefixo `Bearer` sem duplicá-lo.
- Se ambas as credenciais estiverem configuradas, tenta a alternativa ao receber 401.
- Novo endpoint de diagnóstico `/api/tmdb/check` que verifica a autenticação sem exibir segredos.
- Melhor mensagem de erro 401 para diferenciar chave inválida de ausência de configuração.
- Novo script PowerShell `06-CONFIGURAR-TMDB-SECRET.ps1` e testes de autenticação.

# Histórico LISOFLIX

## v1.2.0 — 14/10/2026
- Recuperação da tabela login_guards ausente em produção; script de esquema remoto sem destruição de registros.
- Novo banco reactions para avaliações positivas e negativas persistentes por perfil.
- Sincronização periódica de votos/comentários e atualização das categorias.
- Separação por tipos, classificação e idioma original (filmes, séries, animes, desenhos).
- Cartões e setas de navegação ampliados, cabeçalho e banner reequilibrados.
- Janela de detalhes muito maior e recomendações da mesma categoria.
- Textos do catálogo sem menção visual ao fornecedor, preservando atribuição obrigatória nos créditos.
- Testes de login, recuperação de login_guards e votos em SQLite em memória.

# Alterações do LISOFLIX

## 1.1.0 — Identidade visual oficial

- Integração das artes LISOFLIX fornecidas pelo criador: símbolo L com play/película e logotipo horizontal 3D.
- Atualizados cabeçalho, rodapé, janelas de autenticação/perfis, carregamento e selo visual do banner.
- Favicon, ícones para celular (180/192/512 px) e manifesto para instalação.
- Novas cores principais de marca: vermelho intenso, laranja e preto metálico.
- Ajustes responsivos e estado de movimento reduzido.
- Mantidas integração TMDB via Secret, D1, scripts Cloudflare, contas somente com e-mail/senha e demais funcionalidades anteriores.
- Script adicional para publicar atualizações mesmo se a nova versão foi extraída sem pasta `.git`.

**Aviso:** O deploy, login real no D1 e streaming externo precisam ser validados na sua conta Cloudflare.
