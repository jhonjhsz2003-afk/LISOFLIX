# LISOFLIX | Publica no repositorio novo do usuario, sem push forcado.
# Execute DENTRO da pasta extraida, usando:
# powershell -NoProfile -ExecutionPolicy Bypass -File .\01-CRIAR-E-PUBLICAR-GITHUB.ps1
[CmdletBinding()]
param([switch]$Privado)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$owner = 'jhonjhsz2003-afk'
$repoName = 'LISOFLIX'
$repo = "$owner/$repoName"
$repoUrl = "https://github.com/$repo"
function Exec([string]$cmd, [string[]]$argv) {
    & $cmd @argv
    if ($LASTEXITCODE -ne 0) { throw "Falha ao executar $cmd ($LASTEXITCODE)." }
}
try {
    Write-Host "`n=== LISOFLIX | GitHub ===" -ForegroundColor Cyan
    if (-not (Test-Path -LiteralPath '.\wrangler.jsonc')) { throw 'Execute este script dentro da pasta LISOFLIX extraida do ZIP.' }
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'Git nao encontrado. Instale Git for Windows em https://git-scm.com/downloads/win e execute novamente.' }
    $gh = Get-Command gh -ErrorAction SilentlyContinue
    if (-not $gh) {
        Write-Host 'GitHub CLI (gh) nao encontrado. Tentando instalar pelo winget...'
        if (Get-Command winget -ErrorAction SilentlyContinue) {
            & winget install --id GitHub.cli -e --accept-package-agreements --accept-source-agreements
            $env:Path += ';C:\Program Files\GitHub CLI'
            $gh = Get-Command gh -ErrorAction SilentlyContinue
        }
        if (-not $gh) { throw 'Instale o GitHub CLI em https://cli.github.com/ e execute novamente.' }
    }
    & gh auth status *> $null
    if ($LASTEXITCODE -ne 0) {
        Write-Host 'Sua sessao do navegador nao garante login no terminal. Autorize o GitHub CLI:' -ForegroundColor Yellow
        Exec 'gh' @('auth','login','--web','--git-protocol','https')
    }
    $who = (& gh api user --jq '.login' | Out-String).Trim()
    if ($LASTEXITCODE -ne 0 -or $who -ne $owner) {
        throw "O terminal esta autenticado como '$who', mas o repositorio deve pertencer a '$owner'. Troque a conta em 'gh auth login'."
    }
    if (-not (Test-Path -LiteralPath '.git')) { Exec 'git' @('init','-b','main') }
    $email = (& git config user.email | Out-String).Trim()
    if (-not $email) {
        $userId = (& gh api user --jq '.id' | Out-String).Trim()
        Exec 'git' @('config','user.email',"$userId+$owner@users.noreply.github.com")
    }
    $name = (& git config user.name | Out-String).Trim()
    if (-not $name) { Exec 'git' @('config','user.name',$owner) }
    Exec 'git' @('branch','-M','main')
    Exec 'git' @('add','.')
    & git diff --cached --quiet
    if ($LASTEXITCODE -ne 0) { Exec 'git' @('commit','-m','LISOFLIX') }
    & gh repo view $repo --json name --jq '.name' *> $null
    $exists = ($LASTEXITCODE -eq 0)
    $remote = (& git remote get-url origin 2>$null | Out-String).Trim()
    if ($exists) {
        if (-not $remote) { Exec 'git' @('remote','add','origin',"$repoUrl.git") }
        elseif ($remote -notin @("$repoUrl.git",$repoUrl,"git@github.com:$repo.git")) {
            throw "Ja existe um remote origin diferente: $remote. Nao vou sobrescrever seu repositorio."
        }
        Write-Host 'Repositorio existente encontrado: publicando sem forcar historico...' -ForegroundColor Yellow
        Exec 'git' @('push','-u','origin','main')
    } else {
        $visibility = if ($Privado) { '--private' } else { '--public' }
        Write-Host "Criando novo repositorio $repo ($visibility) e enviando os arquivos..." -ForegroundColor Cyan
        if ($remote) { throw "Existe um remote origin ($remote) mas o repositorio novo nao existe. Revise antes de publicar." }
        Exec 'gh' @('repo','create',$repo,$visibility,'--description','LISOFLIX - Ta liso? Da o play!','--source=.','--remote=origin','--push')
    }
    Write-Host "`nPUBLICADO COM SUCESSO: $repoUrl" -ForegroundColor Green
    Write-Host 'O deploy na Cloudflare e uma etapa separada. Consulte LEIA-ME-PRIMEIRO.md.'
} catch {
    Write-Host "`nERRO: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
