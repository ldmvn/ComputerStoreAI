'use client';

export default function HorizontalBarChart({ items }: { items: { label: string; value: number }[] }) {
  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">Chưa có dữ liệu.</p>;
  }
  const max = Math.max(1, ...items.map(i => i.value));
  return (
    <ul className="space-y-3">
      {items.map((item, i) => (
        <li key={i}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-slate-700">{item.label}</span>
            <span className="tabular-nums text-slate-500">{item.value.toLocaleString('vi-VN')}đ</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-primary-500"
              style={{ width: `${Math.max(2, (item.value / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
