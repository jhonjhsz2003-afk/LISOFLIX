# LISOFLIX 1.5.0 | enviar a pasta ZIP ao GitHub sem force-push.
$ErrorActionPreference='Stop'
if (-not $PSScriptRoot) { throw 'Execute como arquivo PS1, nao cole linhas no console.' }
Set-Location -LiteralPath $PSScriptRoot
if (-not (Test-Path -LiteralPath '.\04-ATUALIZAR-REPOSITORIO-EXTRAIDO.ps1')) {throw 'Script de sincronizacao ausente.'}
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File '.\04-ATUALIZAR-REPOSITORIO-EXTRAIDO.ps1'
if($LASTEXITCODE -ne 0){throw 'Falha ao atualizar repositório LISOFLIX. Confira as mensagens acima.'}
