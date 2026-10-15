# LISOFLIX v1.5.1 - somente LEITURA, sem executar UPDATE/INSERT ou deploy.
param([string]$SiteUrl = '')
$ErrorActionPreference = 'Stop'
if (-not $PSScriptRoot) { throw 'Execute este arquivo PS1 na pasta LISOFLIX.' }
Set-Location -LiteralPath $PSScriptRoot
try {
  $cfg=Get-Content -LiteralPath './wrangler.jsonc' -Raw | ConvertFrom-Json
  if(@($cfg.d1_databases).Count -ne 1 -or $cfg.d1_databases[0].binding -ne 'DB') {throw 'Binding DB ausente/duplicado.'}
  $configuredId=[string]$cfg.d1_databases[0].database_id
  & npx.cmd wrangler whoami
  if($LASTEXITCODE -ne 0){throw 'Verificacao de conta falhou.'}
  $raw=(& npx.cmd wrangler d1 list --json | Out-String).Trim()
  if($LASTEXITCODE -ne 0){throw 'Nao foi possivel listar D1.'}
  $records=@(ConvertFrom-Json -InputObject $raw)
  $matchesById=@($records | Where-Object { ([string]$_.uuid -eq $configuredId) -or ([string]$_.id -eq $configuredId) })
  if($matchesById.Count -ne 1){throw 'UUID D1 nao encontrado na conta atual. Nao execute deploy ate corrigir.'}
  Write-Host "D1 validado: $($matchesById[0].name) / $configuredId" -ForegroundColor Green
  $sql="SELECT 'nativo' AS tipo,COUNT(*) AS total FROM playback_sources UNION ALL SELECT 'externo',COUNT(*) FROM playback_embeds"
  $out=(& npx.cmd wrangler d1 execute DB --remote --json --command $sql | Out-String).Trim()
  if($LASTEXITCODE -ne 0){throw 'Consulta D1 falhou.'}
  $parsed=@(ConvertFrom-Json -InputObject $out)
  foreach($block in $parsed){
    if($block.success -eq $false){throw 'D1 recusou a consulta.'}
    @($block.results | Where-Object { $null -ne $_ }) | Format-Table -AutoSize | Out-String | Write-Host
  }
  if($SiteUrl){
    $baseUrl=$SiteUrl.TrimEnd('/')
    if($baseUrl -notmatch '^https://[a-zA-Z0-9.-]+$'){throw 'SiteUrl deve ser HTTPS sem caminhos ou parametros.'}
    foreach($path in @('/api/health','/api/config','/api/system-check')){
      try{
        $result=Invoke-RestMethod -Method Get -Uri "$baseUrl$path" -TimeoutSec 15
        Write-Host "$path ->" -ForegroundColor Cyan
        $result | ConvertTo-Json -Depth 4 | Write-Host
      }catch{Write-Host "Falha ao consultar $path`: $($_.Exception.Message)" -ForegroundColor Yellow}
    }
  }
  Write-Host 'Diagnostico finalizado: nenhuma alteracao realizada.' -ForegroundColor Green
}catch{Write-Host "ERRO: $($_.Exception.Message)" -ForegroundColor Red;exit 1}
