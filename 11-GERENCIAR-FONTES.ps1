# LISOFLIX v1.5.0 - Gerenciar fontes por titulo, somente com autorizacao de exibicao.
# Executar a partir da pasta do projeto. Nunca publica URLs privadas no GitHub.
$ErrorActionPreference = 'Stop'
if (-not $PSScriptRoot) { throw 'Execute este arquivo .ps1, nao cole o codigo no console.' }
Set-Location -LiteralPath $PSScriptRoot

function SqlText([string]$value) { return "'" + $value.Replace("'", "''") + "'" }
function UInt([string]$label, [int]$min, [int]$max) {
  $inputValue = (Read-Host $label).Trim()
  $number = 0
  if (-not [int]::TryParse($inputValue, [ref]$number) -or $number -lt $min -or $number -gt $max) {
    throw "Valor invalido para $label (de $min ate $max)."
  }
  return $number
}
function NeedOk([string]$label) {
  $ok = Read-Host "$label (digite SIM para confirmar)"
  if ($ok -cne 'SIM') { throw 'Operacao cancelada sem alterar o banco.' }
}
function ExecuteSQL([string]$sql) {
  $tempSql = Join-Path ([IO.Path]::GetTempPath()) ('lisoflix-'+[guid]::NewGuid().ToString('N')+'.sql')
  try {
    [System.IO.File]::WriteAllText($tempSql, $sql, (New-Object System.Text.UTF8Encoding($false)))
    & npx.cmd wrangler d1 execute $script:databaseName --remote "--file=$tempSql"
    if ($LASTEXITCODE -ne 0) { throw 'Erro de SQL remoto. Nenhuma outra etapa sera executada.' }
  } finally { Remove-Item -LiteralPath $tempSql -Force -ErrorAction SilentlyContinue }
}
function BackupOnce {
  if ($script:backupMade) { return }
  $dir = Join-Path $env:LOCALAPPDATA 'LISOFLIX\backups'
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  $file = Join-Path $dir ('antes-de-editar-fontes-'+(Get-Date -Format 'yyyyMMdd-HHmmss')+'.sql')
  & npx.cmd wrangler d1 export $script:databaseName --remote "--output=$file"
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $file) -or (Get-Item -LiteralPath $file).Length -lt 10) {
    throw 'Backup D1 falhou. Operacao bloqueada por seguranca.'
  }
  $script:backupMade = $true
  Write-Host "Backup salvo fora do GitHub em $file" -ForegroundColor Green
}
function MediaDetails {
  $type = (Read-Host 'Tipo [movie/tv]').Trim().ToLowerInvariant()
  if ($type -notin @('movie','tv')) { throw 'Use movie ou tv.' }
  $id = UInt 'ID do titulo no catalogo TMDB' 1 99999999
  $season = 0; $episode = 0
  if ($type -eq 'tv') {
    $season = UInt 'Temporada' 1 100
    $episode = UInt 'Episodio' 1 2000
  }
  return @{type=$type;id=$id;season=$season;episode=$episode}
}
function ValidateCurrentAccount {
  if (-not (Get-Command npx.cmd -ErrorAction SilentlyContinue)) { throw 'Instale Node.js LTS e o Wrangler.' }
  if (-not (Test-Path -LiteralPath './wrangler.jsonc')) { throw 'wrangler.jsonc nao encontrado.' }
  $cfg = Get-Content -LiteralPath './wrangler.jsonc' -Raw | ConvertFrom-Json
  $dbBindings = @($cfg.d1_databases)
  if ($dbBindings.Count -ne 1 -or $dbBindings[0].binding -ne 'DB') { throw 'Confira o binding DB unico em wrangler.jsonc.' }
  $script:databaseName = [string]$dbBindings[0].database_name
  $uuidConfig = [string]$dbBindings[0].database_id
  Write-Host 'Verificando a conta Cloudflare autenticada...' -ForegroundColor Cyan
  & npx.cmd wrangler whoami
  if ($LASTEXITCODE -ne 0) { throw 'Nao foi possivel validar a conta Cloudflare.' }
  $raw = (& npx.cmd wrangler d1 list --json | Out-String)
  if ($LASTEXITCODE -ne 0) { throw 'Nao foi possivel listar os bancos na conta atual.' }
  $matches = @($raw | ConvertFrom-Json | Where-Object { $_.name -eq $script:databaseName })
  if ($matches.Count -ne 1) { throw "Banco $($script:databaseName) nao encontrado ou ambiguo nesta conta." }
  $uuidRemote = [string]$matches[0].uuid
  if (-not $uuidRemote) { $uuidRemote = [string]$matches[0].id }
  if ($uuidRemote -ne $uuidConfig) { throw "Banco divergente! Arquivo: $uuidConfig / Cloudflare: $uuidRemote. Nao alterei nada." }
  Write-Host "Banco confirmado: $($script:databaseName) / $uuidConfig" -ForegroundColor Green
  NeedOk 'Esta e a conta Cloudflare CERTA e voce quer usar este banco?'
}
try {
  ValidateCurrentAccount
  $script:backupMade = $false
  while ($true) {
    Write-Host "`n==== LISOFLIX | Gerenciar fontes autorizadas ====" -ForegroundColor Cyan
    Write-Host '1 - Consultar fontes cadastradas (sem mostrar URLs privadas)'
    Write-Host '2 - Cadastrar ou atualizar VIDEO NATIVO autorizado'
    Write-Host '3 - Cadastrar ou atualizar EMBED com direito de incorporacao'
    Write-Host '4 - Desativar uma fonte cadastrada'
    Write-Host '0 - Sair'
    $choice = (Read-Host 'Opcao').Trim()
    if ($choice -eq '0') { break }
    switch ($choice) {
      '1' {
        ExecuteSQL "SELECT 'nativo' AS tipo,media_type,media_id,season,episode,label,enabled FROM playback_sources UNION ALL SELECT 'externo',media_type,media_id,season,episode,label,enabled FROM playback_embeds ORDER BY media_type,media_id,season,episode;"
      }
      '2' {
        $m=MediaDetails
        $url=(Read-Host 'URL HTTPS direta do arquivo ou playlist do video autorizado').Trim()
        try { $uri=[System.Uri]::new($url) } catch { throw 'URL invalida.' }
        if ($uri.Scheme -ne 'https' -or -not $uri.Host -or $uri.UserInfo -or $url.Length -gt 2048) { throw 'A URL deve ser HTTPS, sem credenciais incorporadas.' }
        Write-Host "O dominio $($uri.Host) deve estar em MEDIA_ALLOWED_HOSTS no Worker." -ForegroundColor Yellow
        Write-Host '1 - video/mp4 | 2 - video/webm | 3 - application/vnd.apple.mpegurl (HLS, suporte varia por navegador)'
        $format=(Read-Host 'Formato').Trim()
        $mime=switch($format){'1'{'video/mp4'}'2'{'video/webm'}'3'{'application/vnd.apple.mpegurl'}default{throw 'Formato invalido.'}}
        $label=(Read-Host 'Nome do player (maximo 70 caracteres)').Trim();if(-not $label){$label='Video LISOFLIX'}
        if($label.Length -gt 70){throw 'Nome muito longo.'}
        NeedOk 'Confirmo possuir direitos para exibir esta fonte e desejo cadastrar?'
        BackupOnce
        $sql="INSERT INTO playback_sources(media_type,media_id,season,episode,url,mime,label,enabled) VALUES ($(SqlText $m.type),$($m.id),$($m.season),$($m.episode),$(SqlText $url),$(SqlText $mime),$(SqlText $label),1) ON CONFLICT(media_type,media_id,season,episode) DO UPDATE SET url=excluded.url,mime=excluded.mime,label=excluded.label,enabled=1;"
        ExecuteSQL $sql
      }
      '3' {
        $m=MediaDetails
        $mode=(Read-Host 'Modo [standard/vip]').Trim().ToLowerInvariant()
        if($mode -notin @('standard','vip')){throw 'Modo invalido.'}
        $label=(Read-Host 'Nome do player (maximo 70 caracteres)').Trim();if(-not $label){$label='Player externo'}
        if($label.Length -gt 70){throw 'Nome muito longo.'}
        Write-Host 'ATENCAO: a API catalogo nao prova licenca de incorporacao, nem garante video disponivel.' -ForegroundColor Yellow
        Write-Host 'Este player de terceiros pode falhar por CSP/sandbox e pode mostrar anuncios.' -ForegroundColor Yellow
        NeedOk 'Confirmo autorizacao para incorporar ESTE titulo por este fornecedor?'
        BackupOnce
        $sql="INSERT INTO playback_embeds(media_type,media_id,season,episode,provider,mode,label,enabled) VALUES ($(SqlText $m.type),$($m.id),$($m.season),$($m.episode),'multiembed',$(SqlText $mode),$(SqlText $label),1) ON CONFLICT(media_type,media_id,season,episode) DO UPDATE SET provider=excluded.provider,mode=excluded.mode,label=excluded.label,enabled=1;"
        ExecuteSQL $sql
      }
      '4' {
        $m=MediaDetails
        $kind=(Read-Host 'Desativar [nativo/externo]').Trim().ToLowerInvariant()
        if($kind -notin @('nativo','externo')){throw 'Tipo invalido.'}
        $table=if($kind -eq 'nativo'){'playback_sources'}else{'playback_embeds'}
        NeedOk "Desativar a fonte $kind do titulo $($m.id)?"
        BackupOnce
        ExecuteSQL "UPDATE $table SET enabled=0 WHERE media_type=$(SqlText $m.type) AND media_id=$($m.id) AND season=$($m.season) AND episode=$($m.episode);"
      }
      default { Write-Host 'Escolha uma das opcoes do menu.' -ForegroundColor Yellow }
    }
  }
  Write-Host 'Concluido. As mudancas do banco remoto nao exigem novo deploy do Worker.' -ForegroundColor Green
} catch {
  Write-Host "ERRO: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
