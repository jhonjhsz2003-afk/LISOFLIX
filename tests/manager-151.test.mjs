import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const get=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('gestor usa UUID em vez de depender do nome, queries mostram linhas',()=>{
  const s=get('11-GERENCIAR-FONTES.ps1');
  assert.match(s,/\$dbCandidates = @\(\$list \| Where-Object/);
  assert.match(s,/\.uuid -eq \$uuidConfig/);
  assert.match(s,/databaseTarget = 'DB'/);
  assert.match(s,/--json/);
  assert.match(s,/Format-Table -AutoSize/);
  assert.match(s,/Nenhuma fonte cadastrada/);
  assert.match(s,/ToUpperInvariant\(\)/);
  assert.match(s,/BackupOnce/);
  assert.match(s,/LOCALAPPDATA/);
  assert.doesNotMatch(s,/INSERT INTO playback_embeds[\s\S]*?WHERE 1=1/);
});
test('deploy confere UUID e conta e nao modifica tabelas D1',()=>{
  const s=get('10-PUBLICAR-CLOUDFLARE.ps1');
  assert.match(s,/database_id/);
  assert.match(s,/\$match = @\(\$banks \| Where-Object/);
  assert.match(s,/Read-Host/);
  assert.match(s,/'d1','export'/);
  assert.doesNotMatch(s,/'d1','execute'|schema\.sql.*--yes/); assert.match(s,/'wrangler','deploy'/);
});
test('diagnostico e somente leitura e sem segredos',()=>{
  const s=get('12-VERIFICAR-PLAYER.ps1');
  assert.match(s,/SELECT 'nativo'/);
  assert.match(s,/d1 execute DB --remote --json/);
  assert.doesNotMatch(s,/(INSERT INTO|UPDATE playback|DELETE FROM|wrangler deploy|secret put)/i);
});
