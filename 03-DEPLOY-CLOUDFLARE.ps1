# Necessario: Node.js + npm, login Cloudflare e D1 criado e configurado no wrangler.jsonc.
$ErrorActionPreference='Stop'
Set-Location -LiteralPath $PSScriptRoot
function MustRun([string]$bin, [string[]]$arguments) {
 & $bin @arguments
 if ($LASTEXITCODE -ne 0) { throw "Erro em $bin $($arguments -join ' ')" }
}
try {
 if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw 'Instale Node.js LTS antes de continuar.' }
 $config = Get-Content .\wrangler.jsonc -Raw
 if ($config -match 'COLOQUE-AQUI-O-ID-DO-SEU-D1') { throw 'Primeiro crie o banco D1 e substitua database_id no wrangler.jsonc (veja LEIA-ME-PRIMEIRO.md).' }
 MustRun 'npm' @('install')
 MustRun 'npx' @('wrangler','whoami')
 MustRun 'npx' @('wrangler','d1','execute','lisoflix-db','--remote','--file=./schema.sql')
 Write-Host 'Publicando Worker e assets...' -ForegroundColor Cyan
 MustRun 'npx' @('wrangler','deploy')
 Write-Host "`nTudo certo! Verifique TMDB_API_KEY nos Secrets do Worker." -ForegroundColor Green
} catch { Write-Host "ERRO: $($_.Exception.Message)" -ForegroundColor Red; exit 1 }
