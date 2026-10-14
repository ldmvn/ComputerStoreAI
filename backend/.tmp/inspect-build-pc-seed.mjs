import '../src/config/env.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const skus = [
  'SEED-MB-001', 'SEED-MB-002', 'SEED-MB-006', 'SEED-MB-007',
  'SEED-MB-008', 'SEED-MB-009', 'SEED-MB-010', 'SEED-MB-011',
  'SEED-RAM-005', 'SEED-HDD-004',
  'SEED-VGA-002', 'SEED-VGA-003', 'SEED-VGA-004', 'SEED-VGA-005',
  'SEED-VGA-007', 'SEED-VGA-008',
  'SEED-VGALN-001', 'SEED-VGALN-002', 'SEED-VGALN-003',
  'SEED-CASE-001', 'SEED-CASE-002', 'SEED-CASE-003', 'SEED-CASE-004',
  'SEED-CASE-005', 'SEED-CASE-006', 'SEED-CASE-008',
  'SEED-AIR-001', 'SEED-AIR-002', 'SEED-AIR-003', 'SEED-AIR-004', 'SEED-AIR-005',
  'SEED-AIO-001', 'SEED-AIO-002', 'SEED-AIO-003', 'SEED-AIO-004',
  'SEED-CUSTOM-001', 'SEED-CUSTOM-002',
  'SEED-MON-003', 'SEED-MON-005', 'SEED-KBC-002', 'SEED-KBC-003',
  'SEED-KB-003', 'SEED-SPK-003', 'SEED-CHAIR-002', 'SEED-CHAIR-003', 'SEED-FAN-004',
];

const attributeSlugs = [
  'socket-cpu', 'loai-ram', 'kich-thuoc-mainboard', 'chipset',
  'so-khe-ram', 'ram-toi-da', 'pcie-cho-vga', 'so-khe-m-2',
  'vga-length', 'case-max-vga-length', 'case-max-cooler-height',
  'cooler-height', 'radiator-size', 'tdp', 'psu-wattage', 'ram-modules',
];

try {
  const products = await prisma.product.findMany({
    where: { sku: { in: skus } },
    select: {
      id: true,
      sku: true,
      name: true,
      attributeValues: {
        where: { attribute: { slug: { in: attributeSlugs } } },
        select: {
          id: true,
          attributeValueId: true,
          valueText: true,
          valueNumber: true,
          attribute: { select: { slug: true, type: true } },
          attributeValue: { select: { value: true } },
        },
        orderBy: [{ attributeId: 'asc' }, { id: 'asc' }],
      },
    },
    orderBy: { sku: 'asc' },
  });

  const missingSkus = skus.filter(sku => !products.some(product => product.sku === sku));
  const output = products.map(product => ({
    id: product.id,
    sku: product.sku,
    name: product.name,
    attributes: product.attributeValues.map(row => ({
      pavId: row.id,
      field: row.attribute.slug,
      type: row.attribute.type,
      attributeValueId: row.attributeValueId,
      value: row.attributeValue?.value
        ?? row.valueNumber?.toString()
        ?? row.valueText,
    })),
  }));

  console.log(JSON.stringify({ missingSkus, products: output }, null, 2));
} finally {
  await prisma.$disconnect();
}
