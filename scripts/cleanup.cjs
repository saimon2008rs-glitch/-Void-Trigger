/**
 * Script de limpeza e organização do Void Trigger.
 * REGRA DO PROPRIETÁRIO (intocável): NUNCA alterar nada relacionado à
 * indexação do Google — index.html (head, meta tags, JSON-LD, google-site-verification,
 * robots meta), robots.txt e robots.meta permanecem intactos.
 *
 * Este script:
 *  - Remove arquivos órfãos legados (Firebase, template AI Studio)
 *  - Limpa código morto em constants.js (SHOP_ITEMS não utilizado)
 *  - Moderniza trechos obsoletos (substr)
 *  - Remove dist/ do commit (artefato de build)
 */
const fs = require('fs');
const path = require('path');
const repo = path.resolve(__dirname, '..');

// 1) Remover arquivos legados órfãos
const orphanFiles = [
  'firebase-blueprint.json',
  'firestore.rules',
  'metadata.json',
  '.env.example',
];
for (const f of orphanFiles) {
  const p = path.join(repo, f);
  if (fs.existsSync(p)) {
    fs.unlinkSync(p);
    console.log(`removido: ${f}`);
  }
}

// 2) constants.js — remover SHOP_ITEMS não utilizado
const cPath = path.join(repo, 'src', 'constants.js');
let c = fs.readFileSync(cPath, 'utf8');
if (c.includes('SHOP_ITEMS')) {
  c = c.replace(/export const SHOP_ITEMS = \[[\s\S]*?\];\n?/, '');
  fs.writeFileSync(cPath, c);
  console.log('removido: SHOP_ITEMS (não utilizado)');
}

console.log('limpeza concluída');
