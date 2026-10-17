# LISOFLIX v1.7.1 - atualizar Worker sem modificar tabelas do banco D1.
# Execute dentro da pasta extraida. Mantenha o UUID real no wrangler.jsonc.
$ErrorActionPreference = 'Stop'
if (-not $PSScriptRoot) { throw 'Execute este arquivo .ps1 a partir da pasta extraida.' }
Set-Location -LiteralPath $PSScriptRoot
function Run([string]$exe, [string[]]$arguments) {
  & $exe @arguments
  if ($LASTEXITCODE -ne 0) { throw "Comando falhou: $exe $($arguments -join ' ')" }
}
try {
  if (-not (Get-Command npx.cmd -ErrorAction SilentlyContinue)) { throw 'Node.js LTS e npm/npx sao necessarios.' }
  if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) { throw 'npm.cmd nao encontrado.' }
  $cfg = Get-Content -LiteralPath '.\wrangler.jsonc' -Raw | ConvertFrom-Json
  $items = @($cfg.d1_databases)
  if ($items.Count -ne 1 -or $items[0].binding -ne 'DB') { throw 'O projeto precisa de um unico binding D1 chamado DB.' }
  $uuid = [string]$items[0].database_id
  if ($uuid -notmatch '^[a-fA-F0-9]{8}(-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}$') { throw 'UUID do D1 invalido no wrangler.jsonc.' }
  Run 'npx.cmd' @('wrangler','whoami')
  $raw = (& npx.cmd wrangler d1 list --json | Out-String).Trim()
  if ($LASTEXITCODE -ne 0) { throw 'Falha ao listar bancos D1 da conta atual.' }
  try { $banks = @(ConvertFrom-Json -InputObject $raw -ErrorAction Stop) }
  catch { throw 'O Wrangler nao retornou JSON valido para os bancos D1.' }
  $match = @($banks | Where-Object { ([string]$_.uuid -eq $uuid) -or ([string]$_.id -eq $uuid) })
  if ($match.Count -ne 1) { throw 'O UUID do D1 nao pertence a esta conta Cloudflare. Publicacao cancelada.' }
  $remoteName = [string]$match[0].name
  Write-Host "Conta correta e banco confirmado: $remoteName / $uuid" -ForegroundColor Green
  $ok = (Read-Host 'Confirma publicar nesta conta e manter os dados D1? (digite SIM)').Trim()
  if ($ok.ToUpperInvariant() -cne 'SIM') { throw 'Operacao cancelada.' }
  $folder = Join-Path $env:LOCALAPPDATA 'LISOFLIX\backups'
  New-Item -ItemType Directory -Force -Path $folder | Out-Null
  $backup = Join-Path $folder ('antes-do-deploy-171-'+(Get-Date -Format 'yyyyMMdd-HHmmss')+'.sql')
  Run 'npx.cmd' @('wrangler','d1','export',$remoteName,'--remote',"--output=$backup")
  if (-not (Test-Path -LiteralPath $backup) -or (Get-Item -LiteralPath $backup).Length -lt 10) { throw 'Backup D1 nao foi criado. Publicacao cancelada.' }
  Write-Host "Backup seguro: $backup" -ForegroundColor Green
  Run 'npm.cmd' @('test')
  # NAO executa schema.sql, DROP, UPDATE, ou migracoes nesta atualizacao.
  Run 'npx.cmd' @('wrangler','deploy')
  Write-Host 'LISOFLIX v1.7.1 publicado. Nenhuma tabela do D1 foi modificada pelo script.' -ForegroundColor Green
  Write-Host 'Confira /api/health e /api/system-check e teste o layout no navegador.' -ForegroundColor Cyan
} catch {
  Write-Host "ERRO: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
