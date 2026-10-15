# LISOFLIX v1.5.1 - fontes autorizadas. Requer Windows, Node.js/Wrangler.
# Executar o arquivo a partir da pasta LISOFLIX. Nao publica segredos ou backups no GitHub.
$ErrorActionPreference = 'Stop'
if (-not $PSScriptRoot) { throw 'Execute este arquivo .ps1. Nao cole o codigo no console.' }
Set-Location -LiteralPath $PSScriptRoot

function SqlText([string]$value) { return "'" + $value.Replace("'", "''") + "'" }
function UInt([string]$label, [int]$min, [int]$max) {
  $str = (Read-Host $label).Trim(); $number = 0
  if (-not [int]::TryParse($str, [ref]$number) -or $number -lt $min -or $number -gt $max) {
    throw "Valor invalido para $label (de $min ate $max)."
  }
  return $number
}
function NeedOk([string]$message) {
  $reply = (Read-Host "$message (digite SIM para confirmar)").Trim()
  if ($reply.ToUpperInvariant() -cne 'SIM') { throw 'Operacao cancelada. Nenhum dado foi alterado.' }
}
function MediaDetails {
  $type = (Read-Host 'Tipo [movie/tv]').Trim().ToLowerInvariant()
  if ($type -notin @('movie','tv')) { throw 'Digite movie para filme ou tv para episodio.' }
  $id = UInt 'ID TMDB do titulo' 1 99999999
  $season=0; $episode=0
  if ($type -eq 'tv') { $season=UInt 'Numero da temporada' 1 100; $episode=UInt 'Numero do episodio' 1 2000 }
  return @{type=$type;id=$id;season=$season;episode=$episode}
}
function ValidateCurrentAccount {
  if (-not (Get-Command npx.cmd -ErrorAction SilentlyContinue)) { throw 'Node.js / npx.cmd nao encontrado.' }
  $cfg = Get-Content -LiteralPath './wrangler.jsonc' -Raw | ConvertFrom-Json
  $bindings = @($cfg.d1_databases)
  if ($bindings.Count -ne 1 -or $bindings[0].binding -ne 'DB') { throw 'wrangler.jsonc deve ter um unico binding D1 chamado DB.' }
  $uuidConfig = [string]$bindings[0].database_id
  if ($uuidConfig -notmatch '^[a-fA-F0-9]{8}(-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}$') { throw 'database_id no wrangler.jsonc nao e um UUID valido.' }
  Write-Host 'Confirmando a conta Cloudflare autenticada...' -ForegroundColor Cyan
  & npx.cmd wrangler whoami
  if ($LASTEXITCODE -ne 0) { throw 'Nao foi possivel verificar a conta Cloudflare.' }
  $raw = (& npx.cmd wrangler d1 list --json | Out-String).Trim()
  if ($LASTEXITCODE -ne 0) { throw 'Falha ao listar D1 na conta autenticada.' }
  try { $list = @(ConvertFrom-Json -InputObject $raw -ErrorAction Stop) }
  catch { throw 'A listagem D1 nao retornou JSON valido. Atualize o Wrangler.' }
  $dbCandidates = @($list | Where-Object { ([string]$_.uuid -eq $uuidConfig) -or ([string]$_.id -eq $uuidConfig) })
  if ($dbCandidates.Count -ne 1) { throw "Nao encontrei UM unico banco com UUID $uuidConfig nesta conta. Nenhuma alteracao executada." }
  $found = $dbCandidates[0]
  $script:remoteDatabaseName = [string]$found.name
  $script:databaseTarget = 'DB' # Binding apontando para o UUID validado, nao nome arbitrario.
  if ([string]::IsNullOrWhiteSpace($script:remoteDatabaseName)) { throw 'D1 localizado por UUID, mas sem nome de banco.' }
  Write-Host "Banco D1 validado: $($script:remoteDatabaseName) / $uuidConfig" -ForegroundColor Green
  if ($script:remoteDatabaseName -ne [string]$bindings[0].database_name) {
    Write-Host "AVISO: o nome remoto e '$($script:remoteDatabaseName)', mas o wrangler.jsonc diz '$($bindings[0].database_name)'." -ForegroundColor Yellow
    Write-Host 'As consultas usam o binding DB e o backup usa o nome remoto, ambos conferidos pelo UUID.' -ForegroundColor Yellow
  }
  NeedOk 'A conta Cloudflare e o banco acima estao CORRETOS?'
}
function ExecuteSQL([string]$sql, [switch]$ShowRows) {
  $file = $null
  try {
    if ($ShowRows) {
      $out = (& npx.cmd wrangler d1 execute $script:databaseTarget --remote '--json' '--yes' '--command' $sql | Out-String).Trim()
    } else {
      $file = Join-Path ([IO.Path]::GetTempPath()) ('lisoflix-'+[guid]::NewGuid().ToString('N')+'.sql')
      [IO.File]::WriteAllText($file, $sql + ';', (New-Object System.Text.UTF8Encoding($false)))
      $out = (& npx.cmd wrangler d1 execute $script:databaseTarget --remote '--json' '--yes' "--file=$file" | Out-String).Trim()
    }
    if ($LASTEXITCODE -ne 0) { throw 'Erro de SQL remoto. Confira a mensagem do Wrangler.' }
    try { $parsed = @(ConvertFrom-Json -InputObject $out -ErrorAction Stop) }
    catch { throw 'Wrangler nao retornou JSON valido para a consulta. Confira a versao instalada.' }
    foreach ($entry in $parsed) {
      if ($entry.success -eq $false) { throw 'D1 retornou falha na operacao.' }
      if ($ShowRows) {
        $rows = @($entry.results | Where-Object { $null -ne $_ })
        if ($rows.Count) { $rows | Format-Table -AutoSize | Out-String -Width 240 | Write-Host }
        else { Write-Host 'Nenhuma fonte cadastrada neste banco.' -ForegroundColor Yellow }
      } else { Write-Host 'Alteracao executada no D1 remoto.' -ForegroundColor Green }
    }
  } finally { if ($file -and (Test-Path $file)) { Remove-Item -LiteralPath $file -Force -ErrorAction SilentlyContinue } }
}
function BackupOnce {
  if ($script:backupMade) { return }
  $folder = Join-Path $env:LOCALAPPDATA 'LISOFLIX\backups'
  New-Item -Path $folder -ItemType Directory -Force | Out-Null
  $file = Join-Path $folder ('antes-de-fontes-'+(Get-Date -Format 'yyyyMMdd-HHmmss')+'.sql')
  & npx.cmd wrangler d1 export $script:remoteDatabaseName --remote "--output=$file"
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path $file) -or (Get-Item $file).Length -lt 10) { throw 'Backup falhou; nenhuma alteracao realizada.' }
  $script:backupMade = $true
  Write-Host "Backup salvo FORA do GitHub: $file" -ForegroundColor Green
}
try {
  ValidateCurrentAccount
  $script:backupMade = $false
  while ($true) {
    Write-Host "`n==== LISOFLIX | Gerenciar fontes autorizadas ====" -ForegroundColor Cyan
    Write-Host '1 - Listar fontes cadastradas (sem mostrar URLs)'
    Write-Host '2 - Cadastrar ou atualizar VIDEO NATIVO autorizado'
    Write-Host '3 - Cadastrar ou atualizar EMBED com permissao de exibicao'
    Write-Host '4 - Desativar uma fonte'
    Write-Host '0 - Sair'
    $choice = (Read-Host 'Opcao').Trim()
    if ($choice -eq '0') { break }
    switch ($choice) {
      '1' {
        ExecuteSQL "SELECT 'nativo' AS tipo,media_type,media_id,season,episode,label,enabled FROM playback_sources UNION ALL SELECT 'externo',media_type,media_id,season,episode,label,enabled FROM playback_embeds ORDER BY media_type,media_id,season,episode" -ShowRows
      }
      '2' {
        $m=MediaDetails
        $url=(Read-Host 'URL HTTPS do video/playlist licenciado').Trim()
        try {$uri=[Uri]::new($url)}catch{throw 'URL invalida.'}
        if ($uri.Scheme -ne 'https' -or -not $uri.Host -or $uri.UserInfo -or $url.Length -gt 2048) { throw 'Informe URL HTTPS sem credenciais embutidas.' }
        Write-Host "O dominio $($uri.Host) deve constar no Secret/variavel MEDIA_ALLOWED_HOSTS do Worker." -ForegroundColor Yellow
        Write-Host 'Formato: 1 = video/mp4; 2 = video/webm; 3 = HLS (depende de navegador)'
        $format=(Read-Host 'Formato').Trim()
        $mime=switch($format){'1'{'video/mp4'}'2'{'video/webm'}'3'{'application/vnd.apple.mpegurl'}default{throw 'Formato invalido.'}}
        $label=(Read-Host 'Nome do player (ate 70 caracteres)').Trim()
        if(-not $label){$label='Video LISOFLIX'}
        if($label.Length -gt 70){throw 'Nome demasiado longo.'}
        NeedOk 'Confirmo ter o direito de exibir esse video?'
        BackupOnce
        ExecuteSQL "INSERT INTO playback_sources(media_type,media_id,season,episode,url,mime,label,enabled) VALUES ($(SqlText $m.type),$($m.id),$($m.season),$($m.episode),$(SqlText $url),$(SqlText $mime),$(SqlText $label),1) ON CONFLICT(media_type,media_id,season,episode) DO UPDATE SET url=excluded.url,mime=excluded.mime,label=excluded.label,enabled=1"
      }
      '3' {
        $m=MediaDetails
        $mode=(Read-Host 'Modo [standard/vip]').Trim().ToLowerInvariant()
        if($mode -notin @('standard','vip')){throw 'Modo invalido.'}
        $label=(Read-Host 'Nome do player (ate 70 caracteres)').Trim()
        if(-not $label){$label='Player externo'}
        if($label.Length -gt 70){throw 'Nome demasiado longo.'}
        Write-Host 'ATENCAO: a API de catalogo NAO comprova direitos de exibicao. O iframe pode ser bloqueado ou conter anuncios.' -ForegroundColor Yellow
        NeedOk 'Confirmo possuir AUTORIZACAO para incorporar ESTE filme/episodio pelo fornecedor?'
        BackupOnce
        ExecuteSQL "INSERT INTO playback_embeds(media_type,media_id,season,episode,provider,mode,label,enabled) VALUES ($(SqlText $m.type),$($m.id),$($m.season),$($m.episode),'multiembed',$(SqlText $mode),$(SqlText $label),1) ON CONFLICT(media_type,media_id,season,episode) DO UPDATE SET provider=excluded.provider,mode=excluded.mode,label=excluded.label,enabled=1"
      }
      '4' {
        $m=MediaDetails
        $kind=(Read-Host 'Desativar [nativo/externo]').Trim().ToLowerInvariant()
        if($kind -notin @('nativo','externo')){throw 'Tipo invalido.'}
        $table=if($kind -eq 'nativo'){'playback_sources'}else{'playback_embeds'}
        NeedOk "Desativar fonte $kind do titulo $($m.id)?"
        BackupOnce
        ExecuteSQL "UPDATE $table SET enabled=0 WHERE media_type=$(SqlText $m.type) AND media_id=$($m.id) AND season=$($m.season) AND episode=$($m.episode)"
      }
      default { Write-Host 'Escolha uma opcao valida.' -ForegroundColor Yellow }
    }
  }
  Write-Host 'Gerenciador concluido. Alteracoes no D1 nao exigem novo deploy do Worker.' -ForegroundColor Green
} catch { Write-Host "ERRO: $($_.Exception.Message)" -ForegroundColor Red; exit 1 }
