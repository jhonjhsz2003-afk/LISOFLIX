# LISOFLIX v1.7.3 — Três players e recuperação de falhas

- Mantido EmbedMovies como principal, SuperFlixAPI como primeiro alternativo e VidSrc como segundo alternativo, habilitados no `wrangler.jsonc`.
- Adicionado botão **Outra fonte** ao lado do seletor, sem faixas inferiores ou tentativas automáticas enganosas.
- VidSrc sem `sandbox` apenas em URL allowlisted exata, com política de referenciador restrita; reconhecido o risco adicional de anúncios e redirecionamentos.
- SuperFlixAPI preserva isolamento; um 404 ou uma verificação do fornecedor só pode ser solucionado pelo próprio fornecedor. O usuário pode optar por outro player.
- Reforçados os testes de seleção, episódios, validação de hosts e bloqueios D1. Sem migrações.
