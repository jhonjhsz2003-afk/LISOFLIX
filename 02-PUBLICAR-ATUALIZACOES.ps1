# Execute dentro da pasta LISOFLIX para publicar alteracoes futuras.
$ErrorActionPreference='Stop'
Set-Location -LiteralPath $PSScriptRoot
$expected = 'jhonjhsz2003-afk/LISOFLIX'
try {
  if (-not (Test-Path '.git')) { throw 'Repositorio nao inicializado. Execute 01-CRIAR-E-PUBLICAR-GITHUB.ps1 primeiro.' }
  $origin = (& git remote get-url origin | Out-String).Trim()
  if ($origin -notmatch 'github\.com[:/]jhonjhsz2003-afk/LISOFLIX(?:\.git)?$') { throw "Remote inesperado: $origin" }
  & git add .
  if ($LASTEXITCODE -ne 0) { throw 'Falha em git add.' }
  & git diff --cached --quiet
  if ($LASTEXITCODE -ne 0) {
    & git commit -m 'LISOFLIX'
    if ($LASTEXITCODE -ne 0) { throw 'Falha em git commit.' }
  }
  & git push origin main
  if ($LASTEXITCODE -ne 0) { throw 'Falha em git push. Verifique se existem atualizacoes remotas antes de sincronizar.' }
  Write-Host 'Atualizacoes enviadas: https://github.com/jhonjhsz2003-afk/LISOFLIX' -ForegroundColor Green
} catch { Write-Host "ERRO: $($_.Exception.Message)" -ForegroundColor Red; exit 1 }
