# Atualiza jhonjhsz2003-afk/LISOFLIX a partir de uma pasta ZIP NOVA,
# sem exigir que o diretorio extraido tenha a pasta oculta .git.
# Executar: powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\04-ATUALIZAR-REPOSITORIO-EXTRAIDO.ps1
$ErrorActionPreference = 'Stop'
$owner = 'jhonjhsz2003-afk'
$repo = "$owner/LISOFLIX"
$source = (Get-Location).Path
if ($PSScriptRoot) { $source = (Resolve-Path -LiteralPath $PSScriptRoot).Path }
$temp = Join-Path ([IO.Path]::GetTempPath()) ('lisoflix-sync-' + [guid]::NewGuid().ToString('N'))
$complete = $false
try {
    foreach ($command in @('git', 'gh')) {
        if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
            throw "O comando $command nao foi encontrado. Instale Git e GitHub CLI (gh)."
        }
    }
    $who = (& gh api user --jq .login | Out-String).Trim()
    if ($LASTEXITCODE -ne 0 -or $who -ne $owner) {
        throw "Conta GitHub autenticada: '$who'. Esperada: '$owner'. Entre na conta correta antes de continuar."
    }
    if (-not (Test-Path -LiteralPath (Join-Path $source 'package.json'))) { throw 'Esta pasta nao parece ser o projeto LISOFLIX (package.json nao encontrado).' }
    if (-not (Test-Path -LiteralPath (Join-Path $source 'public/brand/lisoflix-wordmark.webp'))) { throw 'Assets de marca nao encontrados. Extraia o ZIP atualizado primeiro.' }
    Write-Host "Clonando o repositorio $repo para uma pasta temporaria..." -ForegroundColor Cyan
    & gh repo clone $repo $temp
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao clonar o repositorio. Verifique login/permissoes.' }
    $origin = (& git -C $temp remote get-url origin | Out-String).Trim()
    if ($origin -notmatch 'github\.com[:/]jhonjhsz2003-afk/LISOFLIX(?:\.git)?$') { throw "Remoto inesperado: $origin" }
    # Copiar os arquivos desta versao, sem segredos locais, dependencias ou dados Git.
    $skipDirs = @('.git', 'node_modules', '.wrangler', '.vscode', 'backups')
    $files = Get-ChildItem -LiteralPath $source -File -Recurse -Force
    $count = 0
    foreach ($file in $files) {
        $rel = $file.FullName.Substring($source.Length).TrimStart([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
        $parts = $rel -split '[\\/]'
        if ($parts | Where-Object { $skipDirs -contains $_ }) { continue }
        if ($file.Name -match '^(\.dev\.vars|\.env)(\.|$)' -and $file.Name -notin @('.dev.vars.example', '.env.example')) { continue }
        if ($file.Name -match '\.(log|sqlite|db|sqlite3)$') { continue }
        $dest = Join-Path $temp $rel
        # Nunca substitua um UUID D1 configurado por um placeholder do ZIP.
        if ($rel -eq 'wrangler.jsonc' -and (Test-Path -LiteralPath $dest)) {
            $incoming = Get-Content -LiteralPath $file.FullName -Raw
            $existing = Get-Content -LiteralPath $dest -Raw
            $incomingCfg = $incoming | ConvertFrom-Json
            $existingCfg = $existing | ConvertFrom-Json
            $newUuid = [string]$incomingCfg.d1_databases[0].database_id
            $oldUuid = [string]$existingCfg.d1_databases[0].database_id
            if ($newUuid -ne $oldUuid -and $oldUuid -notmatch 'COLOQUE-AQUI') {
                Write-Host "ATENCAO: o ID D1 no GitHub diverge do ZIP ($oldUuid -> $newUuid)." -ForegroundColor Yellow
                $choice = Read-Host 'Confirma atualizar a configuracao do GitHub com o ID do ZIP? Digite SIM'
                if ($choice -cne 'SIM') { throw 'Parado: confirme sua conta Cloudflare e o ID D1 antes de sincronizar.' }
            }
            if ($incoming -match 'COLOQUE-AQUI-O-ID-DO-SEU-D1' -and $existing -notmatch 'COLOQUE-AQUI-O-ID-DO-SEU-D1') {
                Write-Host 'Preservando wrangler.jsonc existente (ID D1 configurado).' -ForegroundColor Yellow
                continue
            }
        }
        $parent = Split-Path -Parent $dest
        if (-not (Test-Path -LiteralPath $parent)) { New-Item -Path $parent -ItemType Directory -Force | Out-Null }
        Copy-Item -LiteralPath $file.FullName -Destination $dest -Force
        $count++
    }
    # Limpar somente arquivos historicos explicitamente substituidos nesta versao.
    # Nao apagar outros arquivos ou dados do usuario no repositorio.
    $obsolete = @(
      'tests/sandbox-165.test.mjs',
      'INSTRUCOES-SUPEREMBED-v1.6.5.md',
      'INSTRUCOES-FALLBACK-v1.6.4.md',
      'HISTORICO-INSTRUCOES-v1.6.0.md',
      'INSTRUCOES-ATUALIZACAO-v1.6.0.md',
      'INSTRUCOES-ATUALIZACAO-v1.6.1.md',
      'INSTRUCOES-ATUALIZACAO-v1.6.2.md',
      'INSTRUCOES-COMPARACAO-ANIMEDRAGON-v1.6.2.md',
      'INSTRUCOES-CORRECOES-v1.6.3.md'
    )
    foreach ($relPath in $obsolete) {
      $target = Join-Path $temp $relPath
      if (Test-Path -LiteralPath $target -PathType Leaf) { Remove-Item -LiteralPath $target -Force }
    }
    Write-Host "$count arquivos sincronizados localmente. Criando commit sem forcar historico..." -ForegroundColor Cyan
    $email = (& git -C $temp config user.email | Out-String).Trim()
    if (-not $email) {
        $id = (& gh api user --jq .id | Out-String).Trim()
        & git -C $temp config user.email "$id+$owner@users.noreply.github.com"
    }
    $name = (& git -C $temp config user.name | Out-String).Trim()
    if (-not $name) { & git -C $temp config user.name $owner }
    & git -C $temp add --all
    if ($LASTEXITCODE -ne 0) { throw 'Falha em git add.' }
    & git -C $temp diff --cached --quiet
    if ($LASTEXITCODE -ne 0) {
        & git -C $temp commit -m 'LISOFLIX'
        if ($LASTEXITCODE -ne 0) { throw 'Falha em git commit.' }
        & git -C $temp push origin HEAD:main
        if ($LASTEXITCODE -ne 0) { throw 'Falha em git push. Nada foi forçado.' }
        Write-Host "Atualizacao publicada: https://github.com/$repo" -ForegroundColor Green
    } else {
        Write-Host 'O GitHub ja possui estes arquivos; nao ha mudancas para enviar.' -ForegroundColor Yellow
    }
    Write-Host 'ATENCAO: se o Cloudflare nao faz deploy automatico pelo GitHub, rode o script 03-DEPLOY-CLOUDFLARE.ps1 com o Worker configurado.' -ForegroundColor Yellow
    $complete = $true
} catch {
    Write-Host "ERRO: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    if (Test-Path -LiteralPath $temp) { Remove-Item -LiteralPath $temp -Recurse -Force -ErrorAction SilentlyContinue }
}
if (-not $complete) { exit 1 }
