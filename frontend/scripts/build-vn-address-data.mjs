#!/usr/bin/env node
// Regenerate src/data/vn-provinces.ts and public/vn-communes.json from the
// CAS AddressKit API. Run this script whenever Vietnam's administrative
// divisions change (e.g. future restructuring).
//
// Usage: node frontend/scripts/build-vn-address-data.mjs
// Requirements: Node 18+ (native fetch), run from repo root or frontend/ dir.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_ROOT = path.resolve(__dirname, '..');
const CAS_BASE = 'https://production.cas.so/address-kit/2025-07-01';

console.log('Fetching provinces from CAS...');
const pr = await fetch(`${CAS_BASE}/provinces`);
if (!pr.ok) throw new Error(`Provinces fetch failed: ${pr.status}`);
const pd = await pr.json();
const provinces = pd.provinces.map(p => ({ code: String(p.code), name: String(p.name) }));
console.log(`  ${provinces.length} provinces`);

console.log('Fetching communes for each province...');
const communesByProvince = {};
let totalCommunes = 0;
for (const prov of provinces) {
  const cr = await fetch(`${CAS_BASE}/provinces/${encodeURIComponent(prov.code)}/communes`);
  if (!cr.ok) throw new Error(`Communes fetch failed for ${prov.code}: ${cr.status}`);
  const cd = await cr.json();
  communesByProvince[prov.code] = cd.communes.map(c => ({
    code: String(c.code), name: String(c.name), provinceCode: String(c.provinceCode),
  }));
  totalCommunes += communesByProvince[prov.code].length;
  process.stdout.write(`  ${prov.code} (${communesByProvince[prov.code].length})  \r`);
}
console.log(`\n  ${totalCommunes} communes total`);

// 1. Write provinces TypeScript file
const pLines = provinces.map(p => `  { code: '${p.code}', name: '${p.name.replace(/'/g, "\\'")}' },`);
const provinceTs = `// Auto-generated — DO NOT EDIT MANUALLY
// Regenerate: node frontend/scripts/build-vn-address-data.mjs
// Source: ${CAS_BASE} (Vietnam 34-province restructuring)
import type { Province } from '@/types/address.type';

export const VN_PROVINCES: Province[] = [
${pLines.join('\n')}
];
`;
const tsPath = path.join(FRONTEND_ROOT, 'src', 'data', 'vn-provinces.ts');
fs.mkdirSync(path.dirname(tsPath), { recursive: true });
fs.writeFileSync(tsPath, provinceTs, 'utf-8');
console.log(`Written: ${path.relative(process.cwd(), tsPath)}`);

// 2. Write communes JSON static asset
const communesJson = JSON.stringify(communesByProvince);
const jsonPath = path.join(FRONTEND_ROOT, 'public', 'vn-communes.json');
fs.writeFileSync(jsonPath, communesJson, 'utf-8');
const sizeKB = Math.round(Buffer.byteLength(communesJson) / 1024);
console.log(`Written: ${path.relative(process.cwd(), jsonPath)} (${sizeKB}KB)`);
