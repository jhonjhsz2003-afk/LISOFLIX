# LISOFLIX - Publicar SOMENTE no GitHub (sem Cloudflare / D1 / Wrangler)
# Salve este arquivo dentro da pasta LISOFLIX extraida e execute como arquivo .ps1.
# Destino fixo: https://github.com/jhonjhsz2003-afk/LISOFLIX
# Nao apaga o repositorio, nao faz force-push e nao envia segredos locais.

$ErrorActionPreference = 'Stop'
$owner = 'jhonjhsz2003-afk'
$repo = "$owner/LISOFLIX"
$origem = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
$temporaria = Join-Path ([IO.Path]::GetTempPath()) ('lisoflix-github-' + [guid]::NewGuid().ToString('N'))

try {
    $pkg = Join-Path $origem 'package.json'
    if (-not (Test-Path -LiteralPath $pkg -PathType Leaf)) {
        $sub = Join-Path $origem 'LISOFLIX'
        if (Test-Path -LiteralPath (Join-Path $sub 'package.json') -PathType Leaf) {
            $origem = $sub
        } else {
            throw 'Coloque este script na pasta do projeto LISOFLIX, onde existe package.json.'
        }
    }

    foreach ($programa in @('git.exe', 'gh.exe', 'robocopy.exe')) {
        if (-not (Get-Command $programa -ErrorAction SilentlyContinue)) {
            throw "Programa necessario nao encontrado: $programa"
        }
    }

    $usuario = (& gh.exe api user --jq '.login' 2>&1 | Out-String).Trim()
    if ($LASTEXITCODE -ne 0) { throw 'Falha no login GitHub. Execute gh auth login e tente novamente.' }
    if ($usuario -ne $owner) { throw "GitHub conectado como '$usuario', mas o destino e '$owner'. Confira gh auth status." }

    Write-Host "=== LISOFLIX: atualizacao SOMENTE GitHub ===" -ForegroundColor Cyan
    Write-Host "Origem: $origem"
    Write-Host "Destino: https://github.com/$repo"
    Write-Host 'Obtendo o repositorio existente...' -ForegroundColor Cyan
    & gh.exe repo clone $repo $temporaria
    if ($LASTEXITCODE -ne 0) { throw "Nao foi possivel clonar $repo. Confira permissoes no GitHub." }

    # Atualizar apenas arquivos do projeto; nao sobrescrever arquivos fora deste escopo.
    $arquivos = @(
        'package.json', 'package-lock.json', '.gitignore',
        '.dev.vars.example', '.env.example', 'wrangler.jsonc',
        'schema.sql', 'README.md', 'LEIA-ME-PRIMEIRO.md', 'CHANGELOG.md'
    )
    foreach ($nome in $arquivos) {
        $entrada = Join-Path $origem $nome
        if (-not (Test-Path -LiteralPath $entrada -PathType Leaf)) { continue }
        $destino = Join-Path $temporaria $nome

        if ($nome -eq 'wrangler.jsonc' -and (Test-Path -LiteralPath $destino)) {
            # Evita trocar um D1 real por placeholder ou por UUID de outro banco.
            $novo = Get-Content -LiteralPath $entrada -Raw | ConvertFrom-Json
            $anterior = Get-Content -LiteralPath $destino -Raw | ConvertFrom-Json
            $idNovo = [string]$novo.d1_databases[0].database_id
            $idAnterior = [string]$anterior.d1_databases[0].database_id
            $padraoUuid = '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
            if ($idAnterior -match $padraoUuid -and $idNovo -ne $idAnterior) {
                Write-Host 'Aviso: UUID D1 diferente. Mantendo wrangler.jsonc atual do GitHub para nao trocar o banco.' -ForegroundColor Yellow
                continue
            }
            if ($idNovo -notmatch $padraoUuid) {
                Write-Host 'Aviso: UUID D1 local nao esta preenchido; mantendo configuracao existente do GitHub.' -ForegroundColor Yellow
                continue
            }
        }
        Copy-Item -LiteralPath $entrada -Destination $destino -Force
    }

    # Copiar scripts da raiz apenas como arquivos. Nenhum script e executado aqui.
    Get-ChildItem -LiteralPath $origem -File -Filter '*.ps1' | ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $temporaria $_.Name) -Force
    }

    foreach ($pasta in @('public', 'src', 'tests')) {
        $entrada = Join-Path $origem $pasta
        if (-not (Test-Path -LiteralPath $entrada -PathType Container)) { continue }
        $destino = Join-Path $temporaria $pasta
        if (-not (Test-Path -LiteralPath $destino)) {
            New-Item -ItemType Directory -Path $destino -Force | Out-Null
        }
        & robocopy.exe $entrada $destino /E /R:1 /W:1 /NFL /NDL /NJH /NJS /NP /XD '.git' 'node_modules' '.wrangler' 'backups' 'backup' /XF '.env' '.env.*' '.dev.vars' '.dev.vars.*' '*.db' '*.db-*' '*.sqlite' '*.sqlite3' '*.bak' '*.zip' '*.log' | Out-Null
        if ($LASTEXITCODE -ge 8) { throw "Falha ao copiar a pasta: $pasta" }
    }

    $nomeGit = (& git.exe -C $temporaria config user.name | Out-String).Trim()
    if (-not $nomeGit) { & git.exe -C $temporaria config user.name $owner }
    $emailGit = (& git.exe -C $temporaria config user.email | Out-String).Trim()
    if (-not $emailGit) {
        $idGit = (& gh.exe api user --jq '.id' | Out-String).Trim()
        if ($LASTEXITCODE -ne 0) { throw 'Falha ao consultar usuario do GitHub.' }
        & git.exe -C $temporaria config user.email "${idGit}+${owner}@users.noreply.github.com"
    }

    & git.exe -C $temporaria add --all
    if ($LASTEXITCODE -ne 0) { throw 'Git add falhou.' }
    $mudancas = (& git.exe -C $temporaria status --porcelain | Out-String).Trim()
    if (-not $mudancas) {
        Write-Host 'Tudo certo. O GitHub ja possui esses arquivos.' -ForegroundColor Green
    } else {
        & git.exe -C $temporaria commit -m 'LISOFLIX'
        if ($LASTEXITCODE -ne 0) { throw 'Falha ao criar commit.' }
        & git.exe -C $temporaria push origin HEAD:main
        if ($LASTEXITCODE -ne 0) { throw 'O push falhou. Nenhuma alteracao foi forcada; confira a mensagem acima.' }
        Write-Host 'SUCESSO! Atualizacao enviada ao GitHub.' -ForegroundColor Green
    }
    Write-Host "https://github.com/$repo" -ForegroundColor Cyan
    Write-Host 'Este script NAO publica no Cloudflare.' -ForegroundColor Yellow
}
catch {
    Write-Host "ERRO: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
finally {
    if (Test-Path -LiteralPath $temporaria) {
        Remove-Item -LiteralPath $temporaria -Recurse -Force -ErrorAction SilentlyContinue
    }
}
