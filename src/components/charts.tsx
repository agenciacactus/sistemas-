// Gráficos em SVG renderizados no servidor — sem dependências externas.
// Seguem as diretrizes de dataviz: marcas finais, grid recessivo, uma hue por
// magnitude, rótulos diretos seletivos e hover nativo via <title>.
// O app é comprometido com tema claro; as cores acompanham a marca (verde).

const GREEN = "#16a34a";
const GREEN_SOFT = "#16a34a";
const GRID = "#e6ebe6";
const AXIS_TEXT = "#8a9c90";

/** Área de tendência para uma série única (ex.: sessões ao longo do tempo). */
export function AreaChart({
  data,
  height = 220,
  valueSuffix = "",
}: {
  data: { label: string; value: number }[];
  height?: number;
  valueSuffix?: string;
}) {
  const w = 760;
  const h = height;
  const padL = 46;
  const padR = 16;
  const padT = 14;
  const padB = 26;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const max = Math.max(1, ...data.map((d) => d.value));
  const n = data.length;
  const stepX = n > 1 ? innerW / (n - 1) : innerW;
  const x = (i: number) => padL + i * stepX;
  const y = (v: number) => padT + innerH - (v / max) * innerH;

  const linePts = data.map((d, i) => `${x(i)},${y(d.value)}`).join(" ");
  const areaPath =
    `M ${x(0)},${padT + innerH} L ` +
    data.map((d, i) => `${x(i)},${y(d.value)}`).join(" L ") +
    ` L ${x(n - 1)},${padT + innerH} Z`;

  const gridFracs = [0, 0.25, 0.5, 0.75, 1];
  const labelEvery = Math.max(1, Math.round(n / 6));
  const gid = `area-grad-${Math.round(max)}`;
  const last = data[n - 1];

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      role="img"
      aria-label="Gráfico de tendência"
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={GREEN_SOFT} stopOpacity="0.22" />
          <stop offset="100%" stopColor={GREEN_SOFT} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* grid + rótulos do eixo Y */}
      {gridFracs.map((f) => {
        const gy = padT + innerH - f * innerH;
        const val = Math.round(f * max);
        return (
          <g key={f}>
            <line x1={padL} y1={gy} x2={w - padR} y2={gy} stroke={GRID} strokeWidth="1" />
            <text x={padL - 8} y={gy + 3} textAnchor="end" fontSize="10" fill={AXIS_TEXT}>
              {val.toLocaleString("pt-BR")}
            </text>
          </g>
        );
      })}

      {/* área + linha */}
      <path d={areaPath} fill={`url(#${gid})`} />
      <polyline points={linePts} fill="none" stroke={GREEN} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

      {/* ponto final destacado */}
      <circle cx={x(n - 1)} cy={y(last.value)} r="4" fill={GREEN} stroke="#fff" strokeWidth="2" />

      {/* rótulos do eixo X (esparsos) */}
      {data.map((d, i) =>
        i % labelEvery === 0 || i === n - 1 ? (
          <text key={i} x={x(i)} y={h - 8} textAnchor="middle" fontSize="10" fill={AXIS_TEXT}>
            {d.label}
          </text>
        ) : null,
      )}

      {/* camada de hover: tooltip nativo por dia */}
      {data.map((d, i) => (
        <rect
          key={`hit-${i}`}
          x={x(i) - stepX / 2}
          y={padT}
          width={stepX}
          height={innerH}
          fill="transparent"
        >
          <title>{`${d.label}: ${d.value.toLocaleString("pt-BR")}${valueSuffix}`}</title>
        </rect>
      ))}
    </svg>
  );
}

/** Barras horizontais para comparação de magnitude (ex.: sessões por canal). */
export function HBars({
  items,
  formatValue = (v) => v.toLocaleString("pt-BR"),
}: {
  items: { label: string; value: number }[];
  formatValue?: (v: number) => string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="flex flex-col gap-3">
      {items.map((it) => {
        const pct = (it.value / max) * 100;
        return (
          <div key={it.label} className="grid grid-cols-[110px_1fr_auto] items-center gap-3">
            <span className="truncate text-sm text-gray-600">{it.label}</span>
            <div className="h-5 overflow-hidden rounded-md bg-gray-100" title={`${it.label}: ${formatValue(it.value)}`}>
              <div
                className="h-full rounded-md"
                style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: GREEN }}
              />
            </div>
            <span className="tabular-nums text-sm font-medium text-gray-700">{formatValue(it.value)}</span>
          </div>
        );
      })}
    </div>
  );
}
