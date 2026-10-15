import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
const root=new URL('../',import.meta.url);
const file=name=>readFileSync(new URL(name,root),'utf8');
test('Schema aditivo suporta reaplicação sem apagar contas existentes',()=>{
 const db=new DatabaseSync(':memory:');const sql=file('schema.sql');
 db.exec(sql);db.prepare("INSERT INTO users(id,email,password_hash) VALUES ('u1','teste@example.org','hash')").run();
 db.exec(sql);
 assert.equal(db.prepare("SELECT email FROM users WHERE id='u1'").get().email,'teste@example.org');
 for(const table of ['users','login_guards','reactions','playback_sources','playback_progress']){
   assert.ok(db.prepare("SELECT name FROM sqlite_master WHERE name=? AND type='table'").get(table));
 }
 db.close();
});
test('Site remove slogan e iframe externo bloqueado do player principal',()=>{
 const html=file('public/index.html'),frontend=file('public/app.js'),header=file('public/_headers');
 assert.doesNotMatch(html,/Tá liso\?|Dá o play/i);
 assert.doesNotMatch(frontend,/multiembed\.mov|streamingnow\.mov/i);
 assert.match(frontend,/native-player/);
 assert.match(header,/media-src https:/);
});
test('Navegação inclui rotas e retorno pelo histórico do navegador',()=>{
 const source=file('public/app.js');
 assert.match(source,/window\.addEventListener\('popstate',syncFromAddress\)/);
 assert.match(source,/window\.addEventListener\('hashchange',syncFromAddress\)/);
 assert.match(source,/case 'goback'/);
});
