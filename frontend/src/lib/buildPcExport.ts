export type BuildExportItem = {
  slot: string;
  productId: number;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  lineTotal: number;
};

export type BuildFingerprintItem = Pick<BuildExportItem, 'slot' | 'productId' | 'quantity'>;

export function getBuildFingerprint(items: BuildFingerprintItem[]): string {
  return JSON.stringify(
    [...items]
      .sort((a, b) => a.slot.localeCompare(b.slot))
      .map(item => `${item.slot}:${item.productId}:${item.quantity}`),
  );
}

export function escapeCsvField(value: string | number): string {
  const text = String(value);
  if (text.includes(',') || text.includes('"') || text.includes('\n') || text.includes('\r')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function buildCsv(items: BuildExportItem[], slotNames: ReadonlyMap<string, string>): string {
  const header = ['STT', 'Linh kiện', 'Sản phẩm', 'SKU', 'Số lượng', 'Đơn giá (₫)', 'Thành tiền (₫)'];
  const rows = items.map((item, index) => [
    index + 1,
    slotNames.get(item.slot) ?? item.slot,
    item.name,
    item.sku,
    item.quantity,
    item.price,
    item.lineTotal,
  ].map(escapeCsvField).join(','));
  const total = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const totalRow = ['', 'Tổng cộng', '', '', '', '', total].map(escapeCsvField).join(',');

  return `\uFEFF${[header.map(escapeCsvField).join(','), ...rows, totalRow].join('\r\n')}`;
}

export function escapeHtml(value: string | number): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatPrintPrice(value: number): string {
  return `${value.toLocaleString('vi-VN')}₫`;
}

type BuildPrintOptions = {
  items: BuildExportItem[];
  slotNames: ReadonlyMap<string, string>;
  storeName: string;
  printedAt: string;
  note: string;
};

export function buildPrintHtml({ items, slotNames, storeName, printedAt, note }: BuildPrintOptions): string {
  const rows = items.map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(slotNames.get(item.slot) ?? item.slot)}</td>
        <td>${escapeHtml(item.name)}${item.sku ? `<div class="sku">${escapeHtml(item.sku)}</div>` : ''}</td>
        <td style="text-align:center">${escapeHtml(item.quantity)}</td>
        <td style="text-align:right">${escapeHtml(formatPrintPrice(item.price))}</td>
        <td style="text-align:right">${escapeHtml(formatPrintPrice(item.lineTotal))}</td>
      </tr>`).join('');
  const grandTotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const safeStoreName = escapeHtml(storeName);

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<title>Cấu hình PC - ${safeStoreName}</title>
<style>
  @page { size: A4; margin: 18mm 15mm; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #222; margin: 0; padding: 0; }
  h2 { margin: 0 0 2px; font-size: 18px; }
  .meta { color: #555; font-size: 12px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th { background: #f3f4f6; font-weight: 600; padding: 7px 10px; text-align: left; border: 1px solid #ddd; font-size: 12px; }
  td { padding: 6px 10px; border: 1px solid #ddd; vertical-align: top; }
  tr:nth-child(even) td { background: #fafafa; }
  .sku { margin-top: 2px; color: #777; font-size: 11px; }
  .total-row td { font-weight: 700; background: #fff8f5; border-top: 2px solid #c4480a; }
  .total-row td:last-child { color: #c4480a; font-size: 15px; }
  .note { margin-top: 16px; font-size: 11px; color: #888; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
<h2>${safeStoreName}</h2>
<div class="meta">Ngày in: ${escapeHtml(printedAt)}</div>
<table>
  <thead>
    <tr>
      <th style="width:32px">STT</th>
      <th style="width:100px">Linh kiện</th>
      <th>Sản phẩm</th>
      <th style="width:48px;text-align:center">SL</th>
      <th style="width:100px;text-align:right">Đơn giá</th>
      <th style="width:110px;text-align:right">Thành tiền</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
  <tfoot>
    <tr class="total-row">
      <td colspan="5" style="text-align:right">Tổng cộng</td>
      <td style="text-align:right">${escapeHtml(formatPrintPrice(grandTotal))}</td>
    </tr>
  </tfoot>
</table>
<p class="note">${escapeHtml(note)}</p>
</body>
</html>`;
}
