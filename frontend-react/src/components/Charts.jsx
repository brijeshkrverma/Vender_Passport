export function DonutChart({ data, size = 120, stroke = 14 }) {
  const r = (size - stroke) / 2, cx = size / 2, cy = size / 2;
  const total = data.reduce((a, d) => a + d.value, 1);
  const circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {data.map(d => {
        const dash = (d.value / total) * circ;
        const seg = (
          <circle key={d.label} cx={cx} cy={cy} r={r} fill="none" stroke={d.color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-acc}
            transform={`rotate(-90 ${cx} ${cy})`} />
        );
        acc += dash;
        return seg;
      })}
    </svg>
  );
}

export function BarChart({ data, w = 200, h = 90 }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const bw = w / data.length;
  return (
    <svg viewBox={`0 0 ${w} ${h + 18}`} width="100%" height={h + 30} preserveAspectRatio="none">
      {data.map((d, i) => {
        const bh = (d.value / max) * h;
        return (
          <g key={d.label}>
            <rect x={i * bw + bw * 0.22} y={h - bh} width={bw * 0.56} height={bh} rx={2} fill={d.color} />
            <text x={i * bw + bw / 2} y={h + 13} textAnchor="middle" fontSize={7} fill="#6C7280">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}
