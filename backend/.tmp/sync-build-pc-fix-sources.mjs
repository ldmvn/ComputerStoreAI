import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(here, '../src/scripts/data');
const fixesPath = path.join(dataDir, 'buildPcSpecFixes.json');
const productsPath = path.join(dataDir, 'buildPcProducts.json');
const specsPath = path.join(dataDir, 'buildPcSpecs.json');

const fixes = JSON.parse(fs.readFileSync(fixesPath, 'utf8'));
const productsDoc = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
const specsDoc = JSON.parse(fs.readFileSync(specsPath, 'utf8'));
const products = new Map(productsDoc.products.map((product) => [product.sku, product]));

const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

for (const fix of fixes.fixes) {
  const product = products.get(fix.sku);
  if (!product) throw new Error(`Không tìm thấy SKU trong buildPcProducts.json: ${fix.sku}`);

  if (fix.field === 'name') {
    if (!same(product.name, fix.old) && !same(product.name, fix.new)) {
      throw new Error(`${fix.sku} name không khớp old/new`);
    }
    product.name = fix.new;
    continue;
  }

  if (fix.field.startsWith('spec:')) {
    const specName = fix.field.slice(5);
    let matched = false;
    const productSpec = product.specs?.find((spec) => spec.name === specName);
    if (productSpec) {
      if (!same(productSpec.value, fix.old) && !same(productSpec.value, fix.new)) {
        throw new Error(`${fix.sku} ${fix.field} trong buildPcProducts.json không khớp old/new`);
      }
      productSpec.value = fix.new;
      matched = true;
    }
    const displaySpecs = specsDoc.products?.[fix.sku]?.specs;
    const displaySpec = displaySpecs?.find(([name]) => name === specName);
    if (displaySpec) {
      if (!same(displaySpec[1], fix.old) && !same(displaySpec[1], fix.new)) {
        throw new Error(`${fix.sku} ${fix.field} trong buildPcSpecs.json không khớp old/new`);
      }
      displaySpec[1] = fix.new;
      matched = true;
    }
    if (!matched) throw new Error(`Không tìm thấy ${fix.sku} ${fix.field} trong hai file nguồn`);
    continue;
  }

  if (!Object.hasOwn(product.attributes ?? {}, fix.field)) {
    throw new Error(`Không tìm thấy thuộc tính ${fix.field} của ${fix.sku}`);
  }
  const current = product.attributes[fix.field];
  if (!same(current, fix.old) && !same(current, fix.new)) {
    throw new Error(`${fix.sku} ${fix.field} không khớp old/new`);
  }
  product.attributes[fix.field] = fix.new;
}

fs.writeFileSync(productsPath, `${JSON.stringify(productsDoc, null, 2)}\n`, 'utf8');
fs.writeFileSync(specsPath, `${JSON.stringify(specsDoc, null, 2)}\n`, 'utf8');
console.log(`Đã đồng bộ ${fixes.fixes.length} mục sửa vào hai file nguồn.`);
