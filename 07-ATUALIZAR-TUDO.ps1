# Redirecionamento para o script seguro LISOFLIX v1.4.0.
$ErrorActionPreference='Stop'
if (-not $PSScriptRoot) { throw 'Execute o arquivo .ps1; não cole seu conteúdo.' }
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot '08-VERIFICAR-CORRIGIR-PUBLICAR.ps1')
exit $LASTEXITCODE
