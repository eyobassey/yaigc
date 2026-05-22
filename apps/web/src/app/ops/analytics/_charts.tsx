// Tiny inline SVG charts. No external dependency. Server-renderable.
//
// Each chart trusts its caller to pass sensible widths / heights.
// Numbers are formatted with the same en-GB locale used everywhere
// else in the operator console.

export interface LinePoint {
  label: string;
  value: number;
}

export function LineChart({
  points,
  height = 140,
  color = '#3C5A3A', // moss
}: {
  points: LinePoint[];
  height?: number;
  color?: string;
}) {
  if (points.length === 0) {
    return (
      <p className="text-stone text-[0.875rem] italic">No data yet.</p>
    );
  }
  const max = Math.max(1, ...points.map((p) => p.value));
  const w = 100; // viewBox width; scale via CSS
  const h = 40; // viewBox height; padded for labels in the wrapper
  const stepX = points.length > 1 ? w / (points.length - 1) : 0;
  const path = points
    .map((p, i) => {
      const x = i * stepX;
      const y = h - (p.value / max) * (h - 4) - 2;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');

  return (
    <div className="flex flex-col gap-2">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        style={{ height, width: '100%' }}
        aria-hidden="true"
      >
        <path d={path} fill="none" stroke={color} strokeWidth="0.7" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => {
          const x = i * stepX;
          const y = h - (p.value / max) * (h - 4) - 2;
          return <circle key={i} cx={x} cy={y} r="0.9" fill={color} />;
        })}
      </svg>
      <div className="grid grid-cols-12 text-stone text-[0.65rem] font-mono -mt-1">
        {points.map((p, i) => {
          // Render a thin label at start, middle, and end. Tighter spacing
          // for short series.
          const showLabel =
            points.length <= 6 ||
            i === 0 ||
            i === points.length - 1 ||
            i === Math.floor(points.length / 2);
          if (!showLabel) return <span key={i} className="col-span-1" />;
          return (
            <span
              key={i}
              className="col-span-1 whitespace-nowrap overflow-hidden"
              style={{
                textAlign:
                  i === 0 ? 'left' : i === points.length - 1 ? 'right' : 'center',
                gridColumnStart: Math.round((i / Math.max(1, points.length - 1)) * 11) + 1,
              }}
            >
              {p.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export interface FunnelStage {
  label: string;
  count: number;
}

export function Funnel({ stages }: { stages: FunnelStage[] }) {
  if (stages.length === 0) return null;
  const top = Math.max(1, ...stages.map((s) => s.count));
  return (
    <ul className="flex flex-col gap-2">
      {stages.map((s, i) => {
        const width = (s.count / top) * 100;
        const prev = i > 0 ? stages[i - 1]!.count : null;
        const conv = prev && prev > 0 ? (s.count / prev) * 100 : null;
        return (
          <li key={s.label} className="flex flex-col gap-0.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-charcoal text-[0.875rem]">{s.label}</span>
              <span className="font-mono text-charcoal text-[0.9375rem]">{s.count}</span>
            </div>
            <div className="relative h-3 bg-cream rounded-sm overflow-hidden border border-moss/10">
              <div
                className="h-full bg-moss/70 rounded-sm transition-all"
                style={{ width: `${width.toFixed(1)}%` }}
              />
            </div>
            {conv !== null ? (
              <div className="text-stone text-[0.75rem] font-mono">
                {conv.toFixed(0)}% from {stages[i - 1]!.label.toLowerCase()}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export interface StackedSegment {
  label: string;
  count: number;
  color: string;
}

export function StackedBar({ segments }: { segments: StackedSegment[] }) {
  const total = segments.reduce((s, x) => s + x.count, 0);
  if (total === 0) {
    return <p className="text-stone text-[0.875rem] italic">No data yet.</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-3 bg-cream rounded-sm overflow-hidden border border-moss/10">
        {segments.map((s) => {
          const w = (s.count / total) * 100;
          if (w === 0) return null;
          return (
            <div
              key={s.label}
              className="h-full"
              style={{ width: `${w.toFixed(1)}%`, backgroundColor: s.color }}
              title={`${s.label}: ${s.count}`}
            />
          );
        })}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[0.8125rem]">
        {segments.map((s) => (
          <li key={s.label} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="w-2 h-2 rounded-sm"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-charcoal">{s.label}</span>
            <span className="text-stone font-mono">{s.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="bg-cream rounded-md border border-moss/10 p-3">
      <div className="font-body text-[0.65rem] font-medium uppercase tracking-[0.08em] text-stone mb-1">
        {label}
      </div>
      <div className="font-head text-moss text-[1.5rem] leading-tight">{value}</div>
      {hint ? <div className="text-stone text-[0.75rem] mt-0.5">{hint}</div> : null}
    </div>
  );
}
