# LISOFLIX 1.5.0 | proteger dados D1, migrar esquema e publicar site.
$ErrorActionPreference='Stop'
if (-not $PSScriptRoot) {throw 'Execute o arquivo PS1, nao cole seu conteudo no terminal.'}
Set-Location -LiteralPath $PSScriptRoot
function Run([string]$exe,[string[]]$args){ & $exe @args; if($LASTEXITCODE -ne 0){throw "Falhou: $exe $($args -join ' ')"}}
try {
 if(-not (Get-Command npx.cmd -ErrorAction SilentlyContinue)){throw 'Instale Node.js LTS.'}
 Run 'npx.cmd' @('wrangler','whoami')
 $cfg=Get-Content -LiteralPath 'wrangler.jsonc' -Raw | ConvertFrom-Json
 if(@($cfg.d1_databases).Count -ne 1 -or $cfg.d1_databases[0].binding -ne 'DB'){throw 'Mantenha apenas o binding DB.'}
 $bankName=[string]$cfg.d1_databases[0].database_name
 $raw = & npx.cmd wrangler d1 list --json | Out-String
 if($LASTEXITCODE -ne 0){throw 'Falha na listagem de bancos D1.'}
 $found=@($raw|ConvertFrom-Json|Where-Object { $_.name -eq $bankName })
 if($found.Count -ne 1){throw 'Banco D1 nao encontrado/unico. Verifique conta Cloudflare.'}
 $uuid=[string]$found[0].uuid; if(-not $uuid){$uuid=[string]$found[0].id}
 if($uuid -ne [string]$cfg.d1_databases[0].database_id){throw "ID D1 local e remoto divergem. UUID remoto: $uuid. Ajuste o arquivo com cuidado antes de publicar."}
 $dest=Join-Path $env:LOCALAPPDATA 'LISOFLIX\backups';New-Item -ItemType Directory -Path $dest -Force|Out-Null
 $dump=Join-Path $dest ('lisoflix-'+(Get-Date -Format 'yyyyMMdd-HHmmss')+'.sql')
 Run 'npx.cmd' @('wrangler','d1','export',$bankName,'--remote',"--output=$dump")
 if(-not (Test-Path $dump) -or (Get-Item $dump).Length -lt 10){throw 'Backup D1 ausente. Interrompido.'}
 Run 'npx.cmd' @('wrangler','d1','execute',$bankName,'--remote','--file=./schema.sql','--yes')
 Run 'npm.cmd' @('test')
 Run 'npx.cmd' @('wrangler','deploy')
 Write-Host "Deploy concluido. Backup D1 salvo fora do GitHub: $dump" -ForegroundColor Green
 Write-Host 'Confira /api/health, /api/system-check e teste cadastro em producao.' -ForegroundColor Cyan
} catch { Write-Host "ERRO: $($_.Exception.Message)" -ForegroundColor Red; exit 1 }
