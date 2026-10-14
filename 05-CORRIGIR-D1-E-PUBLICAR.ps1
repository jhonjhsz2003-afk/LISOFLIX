# LISOFLIX v1.2 - aplica schema aditivo e publica o Worker existente.
# Não apaga tabelas, contas ou perfis. Confirme que a conta Cloudflare é a correta.
$ErrorActionPreference = 'Stop'
$folder = (Get-Location).Path
if ($PSScriptRoot) { $folder = $PSScriptRoot }
Set-Location -LiteralPath $folder
function RunChecked([string]$Bin, [string[]]$ArgsList) {
    & $Bin @ArgsList
    if ($LASTEXITCODE -ne 0) { throw "Falha ao executar: $Bin $($ArgsList -join ' ')" }
}
try {
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw 'Node.js / npm nao encontrados. Instale Node.js LTS.' }
    if (-not (Test-Path -LiteralPath '.\schema.sql')) { throw 'Execute dentro da pasta extraida LISOFLIX.' }
    Write-Host '=== LISOFLIX v1.2 | Ajuste D1 + Cloudflare ===' -ForegroundColor Cyan
    RunChecked 'npm' @('install')
    RunChecked 'npx' @('wrangler','whoami')
    $wranglerPath = Join-Path $folder 'wrangler.jsonc'
    $config = [IO.File]::ReadAllText($wranglerPath)
    if ($config.Contains('COLOQUE-AQUI-O-ID-DO-SEU-D1')) {
        Write-Host 'Identificando o banco lisoflix-db na sua conta Cloudflare...' -ForegroundColor Cyan
        $raw = (& npx wrangler d1 list --json | Out-String)
        if ($LASTEXITCODE -ne 0) { throw 'Nao foi possivel listar os bancos D1.' }
        try { $databases = @($raw | ConvertFrom-Json) } catch { throw 'O resultado de wrangler d1 list --json nao e JSON valido.' }
        $matches = @($databases | Where-Object { $_.name -eq 'lisoflix-db' })
        if ($matches.Count -ne 1) { throw "Banco lisoflix-db nao encontrado de forma unica ($($matches.Count) encontrados). Confirme que esta na conta Cloudflare certa." }
        $id = [string]$matches[0].uuid
        if (-not $id) { $id = [string]$matches[0].id }
        if ($id -notmatch '^[0-9a-fA-F-]{36}$') { throw 'Identificador D1 retornado inesperado. Confira o painel da Cloudflare.' }
        $config = $config.Replace('COLOQUE-AQUI-O-ID-DO-SEU-D1',$id)
        [IO.File]::WriteAllText($wranglerPath,$config,(New-Object System.Text.UTF8Encoding($false)))
        Write-Host 'Binding DB atualizado no arquivo local wrangler.jsonc.' -ForegroundColor Green
    }
    Write-Host 'Criando tabelas ausentes no D1 remoto. Dados existentes serao preservados...' -ForegroundColor Yellow
    RunChecked 'npx' @('wrangler','d1','execute','lisoflix-db','--remote','--file=./schema.sql','--yes')
    Write-Host 'Verificando tabelas importantes...' -ForegroundColor Cyan
    RunChecked 'npx' @('wrangler','d1','execute','lisoflix-db','--remote','--command=SELECT name FROM sqlite_master WHERE type=''table'' AND name IN (''users'',''login_guards'',''reactions'');')
    Write-Host 'Enviando Worker e arquivos estaticos para Cloudflare...' -ForegroundColor Cyan
    RunChecked 'npx' @('wrangler','deploy')
    Write-Host 'Concluido. Abra /api/health no endereco publicado e confirme schemaReady:true.' -ForegroundColor Green
    Write-Host 'Configure TMDB_API_KEY em Workers e Pages > Worker > Settings > Variables and Secrets.' -ForegroundColor Yellow
    Write-Host 'Este script NAO envia codigo ao GitHub. Use 04-ATUALIZAR-REPOSITORIO-EXTRAIDO.ps1 para isso.' -ForegroundColor Yellow
} catch {
    Write-Host "ERRO: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
