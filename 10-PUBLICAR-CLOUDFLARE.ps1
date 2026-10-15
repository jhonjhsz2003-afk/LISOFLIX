# LISOFLIX 1.5.1 | proteger dados D1, migrar esquema e publicar site.
$ErrorActionPreference='Stop'
if (-not $PSScriptRoot) {throw 'Execute o arquivo PS1, nao cole seu conteudo no terminal.'}
Set-Location -LiteralPath $PSScriptRoot
function Run([string]$exe,[string[]]$args){ & $exe @args; if($LASTEXITCODE -ne 0){throw "Falhou: $exe $($args -join ' ')"}}
try {
 if(-not (Get-Command npx.cmd -ErrorAction SilentlyContinue)){throw 'Instale Node.js LTS.'}
 Run 'npx.cmd' @('wrangler','whoami')
 $cfg=Get-Content -LiteralPath 'wrangler.jsonc' -Raw | ConvertFrom-Json
 if(@($cfg.d1_databases).Count -ne 1 -or $cfg.d1_databases[0].binding -ne 'DB'){throw 'Mantenha apenas o binding DB.'}
 $uuidConfigured=[string]$cfg.d1_databases[0].database_id
 if($uuidConfigured -notmatch '^[a-fA-F0-9]{8}(-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}$'){throw 'database_id invalido no wrangler.jsonc.'}
 $raw = & npx.cmd wrangler d1 list --json | Out-String
 if($LASTEXITCODE -ne 0){throw 'Falha na listagem de bancos D1.'}
 try { $available = @(ConvertFrom-Json -InputObject $raw -ErrorAction Stop) }
 catch {throw 'Wrangler nao retornou JSON valido para D1 list.'}
 $dbCandidates = @($available | Where-Object { ([string]$_.uuid -eq $uuidConfigured) -or ([string]$_.id -eq $uuidConfigured) })
 if($dbCandidates.Count -ne 1){throw 'UUID D1 do projeto nao encontrado na conta Cloudflare autenticada. Nenhuma mudanca feita.'}
 $bankName=[string]$dbCandidates[0].name
 if(-not $bankName){throw 'D1 encontrado sem nome remoto.'}
 Write-Host "Banco verificado pelo UUID: $bankName / $uuidConfigured" -ForegroundColor Green
 if ($bankName -ne [string]$cfg.d1_databases[0].database_name) {
   Write-Host 'ATENCAO: nome do D1 difere da configuracao. O UUID foi validado.' -ForegroundColor Yellow
 }
 $confirmation=(Read-Host 'A conta Cloudflare e o banco acima sao os desejados? Digite SIM').Trim()
 if($confirmation.ToUpperInvariant() -cne 'SIM'){throw 'Publicacao cancelada sem alteracoes.'}
 $dest=Join-Path $env:LOCALAPPDATA 'LISOFLIX\backups';New-Item -ItemType Directory -Path $dest -Force|Out-Null
 $dump=Join-Path $dest ('lisoflix-'+(Get-Date -Format 'yyyyMMdd-HHmmss')+'.sql')
 Run 'npx.cmd' @('wrangler','d1','export',$bankName,'--remote',"--output=$dump")
 if(-not (Test-Path $dump) -or (Get-Item $dump).Length -lt 10){throw 'Backup D1 ausente. Interrompido.'}
 Run 'npx.cmd' @('wrangler','d1','execute','DB','--remote','--file=./schema.sql','--yes')
 Run 'npm.cmd' @('test')
 Run 'npx.cmd' @('wrangler','deploy')
 Write-Host "Deploy concluido. Backup D1 salvo fora do GitHub: $dump" -ForegroundColor Green
 Write-Host 'Confira /api/health, /api/system-check e teste cadastro em producao.' -ForegroundColor Cyan
} catch { Write-Host "ERRO: $($_.Exception.Message)" -ForegroundColor Red; exit 1 }
