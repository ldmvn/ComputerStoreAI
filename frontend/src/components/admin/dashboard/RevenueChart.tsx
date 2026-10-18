'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { RevenuePoint } from '@/services/adminDashboard.service';

function shortLabel(label: string) {
  // 'YYYY-MM-DD' -> 'DD/MM' ; 'YYYY-MM' -> 'MM/YYYY'
  const parts = label.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
  if (parts.length === 2) return `${parts[1]}/${parts[0]}`;
  return label;
}

function formatCompact(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export default function RevenueChart({ data }: { data: RevenuePoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(700);
  const hasData = data.length > 0;
  // Vẽ theo bề rộng thật của khung chứa để chữ/điểm không bị méo trên màn hình nhỏ.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setWidth(Math.max(240, Math.round(el.clientWidth)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [hasData]);
  const height = 260;
  const padL = 44, padR = 12, padT = 16, padB = 28;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  const rawMaxRevenue = Math.max(0, ...data.map(d => d.revenue));
  const maxRevenue = Math.max(1, rawMaxRevenue);
  const maxOrders = Math.max(1, ...data.map(d => d.orders));
  const n = data.length || 1;
  const bandW = innerW / n;
  const barW = Math.min(64, bandW * 0.72);
  const maxLabels = width < 480 ? 5 : 8;

  const linePoints = useMemo(() => data.map((d, i) => {
    const x = padL + bandW * i + bandW / 2;
    const y = padT + innerH - (d.orders / maxOrders) * innerH;
    return { x, y, d };
  }), [data, bandW, innerH, maxOrders]);

  const linePath = linePoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');

  // show at most ~8 (5 on narrow screens) x-axis labels to avoid crowding on 12-month / 30-day views
  const labelStep = Math.max(1, Math.ceil(n / maxLabels));

  if (data.length === 0) {
    return <div className="flex h-[260px] items-center justify-center text-sm text-slate-400">Chưa có dữ liệu.</div>;
  }

  return (
    <div ref={wrapRef} className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="block max-w-full">
        {/* gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map(f => (
          <line key={f} x1={padL} x2={width - padR} y1={padT + innerH * f} y2={padT + innerH * f} stroke="#f1f5f9" strokeWidth={1} />
        ))}
        {/* y-axis revenue labels */}
        {[0, 0.5, 1].map(f => (
          <text key={f} x={padL - 8} y={padT + innerH * (1 - f) + 4} textAnchor="end" fontSize={10} fill="#94a3b8">
            {rawMaxRevenue === 0 ? '0' : formatCompact(maxRevenue * f)}
          </text>
        ))}
        {/* bars: revenue */}
        {data.map((d, i) => {
          const x = padL + bandW * i + (bandW - barW) / 2;
          const h = (d.revenue / maxRevenue) * innerH;
          const y = padT + innerH - h;
          return (
            <rect
              key={i} x={x} y={y} width={barW} height={Math.max(h, 1)} rx={5}
              fill={hover === i ? '#ea580c' : '#fb923c'}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onClick={() => setHover(i)}
            />
          );
        })}
        {/* line: order count */}
        <path d={linePath} fill="none" stroke="#f97316" strokeWidth={2} />
        {linePoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={hover === i ? 4 : 3} fill="#f97316"
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
        ))}
        {/* x-axis labels */}
        {data.map((d, i) => (
          i % labelStep === 0 && (
            <text key={i} x={padL + bandW * i + bandW / 2} y={height - 8} textAnchor="middle" fontSize={10} fill="#94a3b8">
              {shortLabel(d.label)}
            </text>
          )
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-orange-400" /> Doanh thu</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-orange-500" /> Số đơn</span>
        </div>
        {hover !== null && data[hover] && (
          <div className="text-xs text-slate-600">
            <strong>{shortLabel(data[hover].label)}</strong>: {data[hover].revenue.toLocaleString('vi-VN')}đ · {data[hover].orders} đơn
          </div>
        )}
      </div>
    </div>
  );
}
