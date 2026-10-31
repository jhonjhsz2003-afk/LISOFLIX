# LISOFLIX - Publicacao direta pela API oficial do GitHub.
# Nao exige Git, GitHub CLI ou Robocopy.
# Antes de executar, copie o token para a area de transferencia do Windows.
# O script le o token diretamente da area de transferencia e a limpa em seguida.
# Execute na raiz do projeto: .\PUBLICAR-GITHUB.ps1

[CmdletBinding()]
param(
    [string]$Owner = 'jhonjhsz2003-afk',
    [string]$Repository = 'LISOFLIX',
    [string]$Branch = 'main'
)

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$ProjectPath = if ($PSScriptRoot) { (Resolve-Path -LiteralPath $PSScriptRoot).Path } else { (Get-Location).Path }
$ApiRoot = 'https://api.github.com'
$Repo = "$Owner/$Repository"
$RepoUrl = "https://github.com/$Repo"
$script:Headers = $null
$token = $null

function Invoke-GitHubApi {
    param(
        [Parameter(Mandatory=$true)][string]$Method,
        [Parameter(Mandatory=$true)][string]$Uri,
        $Body = $null
    )
    $params = @{
        Method = $Method
        Uri = $Uri
        Headers = $script:Headers
        ContentType = 'application/json; charset=utf-8'
        ErrorAction = 'Stop'
    }
    if ($null -ne $Body) {
        $json = ConvertTo-Json -InputObject $Body -Depth 100 -Compress
        $params.Body = [System.Text.Encoding]::UTF8.GetBytes($json)
    }
    Invoke-RestMethod @params
}

try {
    if (-not (Test-Path -LiteralPath (Join-Path $ProjectPath 'package.json'))) {
        throw 'Pasta incorreta. Execute o script na raiz do LISOFLIX, onde esta o package.json.'
    }

    Write-Host 'LISOFLIX - Publicacao direta pela API do GitHub' -ForegroundColor Cyan
    Write-Host "Projeto: $ProjectPath"
    Write-Host "Destino: $RepoUrl (branch $Branch)"
    Write-Host ''
    Write-Host '1) Copie o token completo do GitHub (Ctrl+C na pagina do GitHub).' -ForegroundColor Yellow
    Write-Host '2) Volte aqui e pressione ENTER. O script vai ler e limpar a area de transferencia.' -ForegroundColor Yellow
    [void](Read-Host 'Pressione ENTER depois de copiar o token')

    $clipboardText = Get-Clipboard -Raw -ErrorAction Stop
    if ($null -eq $clipboardText) { throw 'A area de transferencia esta vazia. Copie o token no GitHub e tente novamente.' }
    $token = ([string]$clipboardText -replace '\s', '').Trim()
    $clipboardText = $null
    try { Clear-Clipboard -ErrorAction SilentlyContinue } catch { }
    if ([string]::IsNullOrWhiteSpace($token) -or $token.Length -lt 20) {
        throw 'Token vazio ou incompleto na area de transferencia. Copie o valor inteiro, sem aspas.'
    }

    $script:Headers = @{
        Authorization = "Bearer $token"
        Accept = 'application/vnd.github+json'
        'X-GitHub-Api-Version' = '2022-11-28'
        'User-Agent' = 'LISOFLIX-PowerShell-Publisher'
    }
    $token = $null

    Write-Host 'Validando autenticacao e permissao...' -ForegroundColor Gray
    $user = Invoke-GitHubApi -Method GET -Uri "$ApiRoot/user"
    if ($user.login -ne $Owner) {
        throw "O token pertence a '$($user.login)', mas o repositorio e da conta '$Owner'."
    }
    $repoInfo = Invoke-GitHubApi -Method GET -Uri "$ApiRoot/repos/$Repo"
    if ($repoInfo.permissions -and -not $repoInfo.permissions.push) {
        throw 'A conta autenticada nao possui permissao de escrita neste repositorio.'
    }

    $branchInfo = Invoke-GitHubApi -Method GET -Uri "$ApiRoot/repos/$Repo/branches/$Branch"
    $parentCommit = [string]$branchInfo.commit.sha
    $baseTreeSha = [string]$branchInfo.commit.commit.tree.sha
    $remoteTree = Invoke-GitHubApi -Method GET -Uri "$ApiRoot/repos/$Repo/git/trees/$baseTreeSha`?recursive=1"
    if ($remoteTree.truncated) { throw 'A arvore remota veio truncada. Publicacao cancelada por seguranca.' }

    # Nunca publica credenciais, dependencias, caches, backups ou arquivos de banco.
    $excludeDirNames = @('.git','node_modules','.wrangler','backups','backup')
    $localFiles = @{}
    Get-ChildItem -LiteralPath $ProjectPath -File -Recurse -Force | ForEach-Object {
        $file = $_
        $relative = $file.FullName.Substring($ProjectPath.Length).TrimStart([char]'\',[char]'/').Replace('\','/')
        $parts = $relative.Split('/')
        if (@($parts | Where-Object { $excludeDirNames -contains $_ }).Count -gt 0) { return }
        if ($relative -match '(^|/)\.env($|\.)|(^|/)\.dev\.vars($|\.)|\.(db|sqlite|sqlite3|bak|log|zip|pem|key)$') { return }
        if ($relative -match '(^|/)(secrets?\.json|credentials?\.json)$') { return }
        $localFiles[$relative] = $file.FullName
    }
    if ($localFiles.Count -eq 0) { throw 'Nenhum arquivo elegivel encontrado para publicar.' }

    $entries = [System.Collections.Generic.List[object]]::new()
    $remotePaths = @{}
    foreach ($item in $remoteTree.tree) {
        if ($item.type -eq 'blob') { $remotePaths[[string]$item.path] = $true }
    }

    $index = 0
    foreach ($path in ($localFiles.Keys | Sort-Object)) {
        $index++
        $bytes = [System.IO.File]::ReadAllBytes($localFiles[$path])
        $content = [Convert]::ToBase64String($bytes)
        $blob = Invoke-GitHubApi -Method POST -Uri "$ApiRoot/repos/$Repo/git/blobs" -Body @{ content = $content; encoding = 'base64' }
        $entries.Add(@{ path = $path; mode = '100644'; type = 'blob'; sha = [string]$blob.sha })
        $bytes = $null; $content = $null
        if (($index % 10) -eq 0 -or $index -eq $localFiles.Count) {
            Write-Host "Enviando arquivos: $index/$($localFiles.Count)" -ForegroundColor Gray
        }
    }

    foreach ($remotePath in $remotePaths.Keys) {
        if (-not $localFiles.ContainsKey($remotePath)) {
            $entries.Add(@{ path = $remotePath; mode = '100644'; type = 'blob'; sha = $null })
        }
    }

    $newTree = Invoke-GitHubApi -Method POST -Uri "$ApiRoot/repos/$Repo/git/trees" -Body @{
        base_tree = $baseTreeSha
        tree = @($entries.ToArray())
    }
    if (-not $newTree.sha) { throw 'O GitHub nao retornou a nova arvore.' }
    if ($newTree.sha -eq $baseTreeSha) {
        Write-Host 'Nenhuma diferenca: o repositorio ja esta atualizado.' -ForegroundColor Green
        exit 0
    }

    $newCommit = Invoke-GitHubApi -Method POST -Uri "$ApiRoot/repos/$Repo/git/commits" -Body @{
        message = 'LISOFLIX: atualizar projeto'
        tree = [string]$newTree.sha
        parents = @($parentCommit)
    }
    Invoke-GitHubApi -Method PATCH -Uri "$ApiRoot/repos/$Repo/git/refs/heads/$Branch" -Body @{
        sha = [string]$newCommit.sha
        force = $false
    } | Out-Null

    Write-Host ''
    Write-Host 'PUBLICACAO NO GITHUB CONCLUIDA!' -ForegroundColor Green
    Write-Host "Commit: $($newCommit.sha)" -ForegroundColor Green
    Write-Host "Repositorio: $RepoUrl" -ForegroundColor Cyan
    Write-Host 'Este script publica no GitHub; nao executa deploy Cloudflare nem altera o banco D1.' -ForegroundColor Yellow
}
catch {
    Write-Host "ERRO: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
finally {
    $script:Headers = $null
    $token = $null
}
