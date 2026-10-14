# Executar dentro da pasta do LISOFLIX. Wrangler solicita a credencial sem exibi-la.
$ErrorActionPreference='Stop'
Set-Location -LiteralPath $PSScriptRoot
Write-Host "`n=== LISOFLIX | Corrigir TMDB 401 ===" -ForegroundColor Cyan
Write-Host '1 = API Key v3 (chave curta)' -ForegroundColor White
Write-Host '2 = API Read Access Token (token longo)' -ForegroundColor White
$choice = Read-Host 'Qual credencial voce tem? (1 ou 2)'
if ($choice -eq '1') { $secret='TMDB_API_KEY' }
elseif ($choice -eq '2') { $secret='TMDB_BEARER_TOKEN' }
else { Write-Host 'Opcao invalida; nenhuma alteracao foi feita.' -ForegroundColor Red; exit 1 }
if (-not (Get-Command npx -ErrorAction SilentlyContinue)) { Write-Host 'Instale Node.js LTS antes de continuar.' -ForegroundColor Red; exit 1 }
$configPath = Join-Path $PSScriptRoot 'wrangler.jsonc'
if ((Test-Path -LiteralPath $configPath) -and ((Get-Content -LiteralPath $configPath -Raw) -match 'COLOQUE-AQUI-O-ID-DO-SEU-D1')) {
    Write-Host 'D1 ainda nao esta configurado nesta pasta.' -ForegroundColor Yellow
    Write-Host 'Execute primeiro 05-CORRIGIR-D1-E-PUBLICAR.ps1 para configurar o banco e publicar o Worker. Depois rode este script novamente.' -ForegroundColor Yellow
    exit 1
}
Write-Host "`nO Wrangler perguntara o VALOR do Secret $secret. Digite somente a chave, sem colar no comando." -ForegroundColor Yellow
& npx wrangler secret put $secret
if ($LASTEXITCODE -ne 0) { Write-Host 'Falha ao cadastrar o Secret. Confirme o login no Wrangler e nome do Worker no wrangler.jsonc.' -ForegroundColor Red; exit 1 }
Write-Host "`nSecret salvo. Aguarde a publicacao e abra https://SEU-WORKER.workers.dev/api/tmdb/check" -ForegroundColor Green
Write-Host 'O resultado esperado e: {"configured":true,"authorized":true}' -ForegroundColor Green
Write-Host 'Nao compartilhe o conteudo do Secret em mensagens, capturas de tela ou repositorios.' -ForegroundColor Yellow
