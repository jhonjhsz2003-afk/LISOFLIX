import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, statSync} from 'node:fs';
import {join} from 'node:path';
const root=new URL('../public/',import.meta.url);
const read=(path)=>readFileSync(new URL(path,root));
const source=(path)=>read(path).toString('utf8');
test('identidade LISOFLIX carregada em todos os pontos importantes',()=>{
  const js=source('app.js');
  const html=source('index.html');
  assert.match(js,/class="brand-mark brand-header"/);
  assert.ok((js.match(/class="brand-mark brand-inline"/g)||[]).length>=3);
  assert.match(js,/lisoflix-emblem\.webp/);
  assert.match(html,/initial-logo.*lisoflix-wordmark\.webp/);
  assert.doesNotMatch(html,/Continuar com Google/);
  assert.doesNotMatch(js,/Continuar com Google/);
});
test('arquivos de marca/ícones possuem assinaturas corretas',()=>{
  for(const path of ['brand/lisoflix-wordmark.webp','brand/lisoflix-emblem.webp']){
    const bytes=read(path); assert.equal(bytes.toString('ascii',0,4),'RIFF');
    assert.equal(bytes.toString('ascii',8,12),'WEBP');
  }
  for(const path of ['favicon.png','brand/icon-180.png','brand/icon-192.png','brand/icon-512.png']){
    assert.equal(read(path).subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  }
});
test('manifesto e links de app instalável válidos',()=>{
  const html=source('index.html');
  const manifest=JSON.parse(source('manifest.webmanifest'));
  assert.equal(manifest.short_name,'LISOFLIX');
  assert.equal(manifest.lang,'pt-BR');
  assert.ok(manifest.icons.some(x=>x.sizes==='512x512'));
  assert.match(html,/href="\/manifest\.webmanifest"/);
  assert.match(html,/rel="apple-touch-icon"/);
});
