# LISOFLIX 1.4.0 - atalho compatível com scripts antigos.
param([switch]$SomenteCloudflare)
$ErrorActionPreference='Stop'
if(-not $PSScriptRoot){throw 'Execute o arquivo .ps1.'}
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot '10-PUBLICAR-CLOUDFLARE.ps1')
if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
if(-not $SomenteCloudflare){
 & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot '09-ATUALIZAR-GITHUB.ps1')
 exit $LASTEXITCODE
}
