# LISOFLIX v1.3.1 - backup seguro, conferência D1, migração, deploy e GitHub.
# Execute O ARQUIVO .ps1 dentro da pasta extraída; NÃO cole o código no terminal.
param([switch]$SomenteCloudflare)
$ErrorActionPreference = 'Stop'
if (-not $PSScriptRoot) { throw 'Execute o arquivo .ps1, nao cole seu conteudo no console.' }
Set-Location -LiteralPath $PSScriptRoot
function Run([string]$Program, [string[]]$Arguments) {
    & $Program @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Falha no comando: $Program $($Arguments -join ' ')" }
}
function Check([string]$Program) {
    if (-not (Get-Command $Program -ErrorAction SilentlyContinue)) { throw "Programa ausente: $Program" }
}
try {
    Check 'npm.cmd'; Check 'npx.cmd'
    foreach ($path in @('schema.sql','src/worker.js','wrangler.jsonc','public/index.html')) {
        if (-not (Test-Path -LiteralPath $path)) { throw "Arquivo obrigatório ausente: $path" }
    }
    Write-Host '=== LISOFLIX v1.3.1 | Verificação e publicação ===' -ForegroundColor Cyan
    Run 'npm.cmd' @('install','--ignore-scripts')
    Run 'npm.cmd' @('test')
    Run 'npx.cmd' @('wrangler','whoami')

    $cfg = Get-Content -LiteralPath 'wrangler.jsonc' -Raw | ConvertFrom-Json
    $binding = @($cfg.d1_databases | Where-Object { $_.binding -eq 'DB' })
    if ($binding.Count -ne 1 -or @($cfg.d1_databases).Count -ne 1) {
        throw 'Apenas um binding D1 deve existir em wrangler.jsonc: DB.'
    }
    if ($binding[0].database_name -ne 'lisoflix-db') { throw 'O banco configurado não é lisoflix-db.' }
    $remoteList = & npx.cmd wrangler d1 list --json | Out-String
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao listar bancos D1 nesta conta Cloudflare.' }
    $banks = @($remoteList | ConvertFrom-Json)
    $found = @($banks | Where-Object { $_.name -eq 'lisoflix-db' })
    if ($found.Count -ne 1) { throw 'O banco lisoflix-db não foi encontrado exatamente uma vez na conta autenticada.' }
    $id = [string]$found[0].uuid
    if (-not $id) { $id = [string]$found[0].id }
    if ($id -notmatch '^[a-fA-F0-9]{8}(-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}$') { throw 'UUID D1 da conta Cloudflare inválido.' }
    $local = [string]$binding[0].database_id
    if ($local -ne $id) {
        throw "O UUID do D1 no ZIP ($local) difere do banco remoto ($id). Verifique a conta antes de modificar dados."
    }
    Write-Host 'Banco D1 conferido. Nenhuma conta será apagada.' -ForegroundColor Green

    # O backup NÃO fica dentro do repositório GitHub público.
    $secureDir = Join-Path $env:LOCALAPPDATA 'LISOFLIX\backups'
    New-Item -ItemType Directory -Path $secureDir -Force | Out-Null
    $backup = Join-Path $secureDir ('lisoflix-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.sql')
    Write-Host 'Salvando backup D1 no seu computador, fora do GitHub...' -ForegroundColor Yellow
    Run 'npx.cmd' @('wrangler','d1','export','lisoflix-db','--remote',"--output=$backup")
    if (-not (Test-Path -LiteralPath $backup) -or (Get-Item -LiteralPath $backup).Length -eq 0) {
        throw 'Backup D1 vazio ou ausente. Publicação interrompida.'
    }
    Write-Host "Backup: $backup" -ForegroundColor Green
    Run 'npx.cmd' @('wrangler','d1','execute','lisoflix-db','--remote','--file=./schema.sql','--yes')
    Write-Host 'Tabelas verificadas. Publicando Worker...' -ForegroundColor Cyan
    Run 'npx.cmd' @('wrangler','deploy')
    $healthUrl = 'https://lisoflix.jhonjhszgame2003.workers.dev/api/system-check'
    try {
        $check = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 20
        Write-Host ('Worker publicado: versão ' + $check.version) -ForegroundColor Green
        Write-Host ('D1 pronto: ' + $check.schemaReady + ' | TMDB: ' + $check.catalogAuth + ' | Fontes de reprodução: ' + $check.activeSources) -ForegroundColor Cyan
    } catch {
        Write-Host ('Não foi possível consultar o Worker pela rede: ' + $_.Exception.Message) -ForegroundColor Yellow
        Write-Host "Abra manualmente: $healthUrl" -ForegroundColor Yellow
    }
    if ($check) {
        if ($check.version -ne '1.3.1') { throw "Versão remota inesperada: $($check.version)" }
        if (-not $check.schemaReady) { throw 'Worker publicado, mas o banco ainda está incompleto.' }
    }
    if (-not $SomenteCloudflare) {
        Check 'gh'; Check 'git'
        Write-Host 'Sincronizando GitHub sem force-push...' -ForegroundColor Cyan
        & powershell.exe -NoProfile -ExecutionPolicy Bypass -File '.\04-ATUALIZAR-REPOSITORIO-EXTRAIDO.ps1'
        if ($LASTEXITCODE -ne 0) { throw 'Deploy concluído, mas o envio ao GitHub falhou. Execute o arquivo 04 novamente.' }
    }
    Write-Host 'Finalizado. Verifique /api/system-check. Nenhum Secret foi enviado ao GitHub.' -ForegroundColor Green
} catch {
    Write-Host ('ERRO: ' + $_.Exception.Message) -ForegroundColor Red
    exit 1
}
