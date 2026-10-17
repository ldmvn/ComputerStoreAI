'use client';

export type DonutSlice = { label: string; value: number; color: string };

export default function DonutChart({ slices, centerLabel, centerValue }: {
  slices: DonutSlice[];
  centerLabel: string;
  centerValue: number | string;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const r = 52;
  const circumference = 2 * Math.PI * r;
  let offsetAcc = 0;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:justify-center">
      <div className="relative h-[160px] w-[160px] shrink-0">
        <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
          <circle cx={70} cy={70} r={r} fill="none" stroke="#f1f5f9" strokeWidth={16} />
          {total > 0 && slices.filter(s => s.value > 0).map((s, i) => {
            const frac = s.value / total;
            const dash = frac * circumference;
            const gap = circumference - dash;
            const el = (
              <circle
                key={i} cx={70} cy={70} r={r} fill="none" stroke={s.color} strokeWidth={16}
                strokeDasharray={`${dash} ${gap}`} strokeDashoffset={-offsetAcc}
                strokeLinecap="butt"
              />
            );
            offsetAcc += dash;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tabular-nums text-slate-800">{centerValue}</span>
          <span className="text-[11px] text-slate-400">{centerLabel}</span>
        </div>
      </div>
      <ul className="w-full min-w-0 space-y-1.5 sm:w-auto">
        {slices.map((s, i) => (
          <li key={i} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: s.color }} />
            <span className="min-w-0 flex-1 truncate text-slate-600">{s.label}</span>
            <span className="shrink-0 tabular-nums font-medium text-slate-800">
              {s.value} {total > 0 && <span className="text-slate-400">({Math.round((s.value / total) * 1000) / 10}%)</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
