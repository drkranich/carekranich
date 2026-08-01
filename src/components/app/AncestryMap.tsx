import { useMemo, useState } from "react";

export type AncestryRegion = {
  id: string;
  continent: string | null;
  macro_region: string | null;
  genetic_region: string | null;
  country: string | null;
  sub_region: string | null;
  historical_territory: string | null;
  population_group: string | null;
  percentage: number;
  range_min: number | null;
  range_max: number | null;
  confidence: string | null;
  color: string | null;
  latitude: number | null;
  longitude: number | null;
  summary: string | null;
  full_text: string | null;
  historical_text: string | null;
  limitations: string | null;
  sort_order: number | null;
};

export function regionLabel(r: AncestryRegion) {
  return (
    [r.genetic_region, r.macro_region, r.country, r.continent].find((v) => v && v.trim()) ?? "Origem"
  );
}

export function regionPath(r: AncestryRegion) {
  return [r.continent, r.macro_region, r.genetic_region, r.country, r.sub_region, r.historical_territory]
    .filter(Boolean)
    .join(" → ");
}

/** Simple equirectangular projection: lat/lng to 1000x500 viewBox coordinates. */
export function project(lat: number, lng: number) {
  return { x: ((lng + 180) / 360) * 1000, y: ((90 - lat) / 180) * 500 };
}

/**
 * Stylized world map (simplified outlines) with pulsing points
 * with intensity proportional to percentage. No external dependencies.
 */
export function AncestryMap({
  regions,
  activeId,
  onSelect,
  reducedMotion = false,
  revealProgress = 1,
  showRoutes = false,
  routes = [],
}: {
  regions: AncestryRegion[];
  activeId?: string | null;
  onSelect?: (id: string) => void;
  reducedMotion?: boolean;
  revealProgress?: number;
  showRoutes?: boolean;
  routes?: Array<{ id: string; label: string; from_lat: number | null; from_lng: number | null; to_lat: number | null; to_lng: number | null; period: string | null }>;
}) {
  const [hover, setHover] = useState<string | null>(null);

  const points = useMemo(
    () =>
      regions
        .filter((r) => r.latitude !== null && r.longitude !== null)
        .map((r, i) => ({ region: r, index: i, ...project(Number(r.latitude), Number(r.longitude)) })),
    [regions],
  );

  const maxPct = Math.max(1, ...regions.map((r) => Number(r.percentage ?? 0)));
  const visibleCount = Math.ceil(points.length * Math.min(1, Math.max(0, revealProgress)));

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-[#0f1a17]">
      <svg viewBox="0 0 1000 500" className="h-full w-full" role="img" aria-label="Genetic origins map">
        <defs>
          <radialGradient id="ck-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f2c078" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#c98a3a" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#c98a3a" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="ck-sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#122421" />
            <stop offset="100%" stopColor="#0c1614" />
          </linearGradient>
        </defs>

        <rect width="1000" height="500" fill="url(#ck-sea)" />

        {/* meridiyears old and paralelos discretos */}
        <g stroke="#ffffff" strokeOpacity="0.05" strokeWidth="0.6">
          {[...Array(11)].map((_, i) => (
            <line key={`v${i}`} x1={(i * 1000) / 10} y1="0" x2={(i * 1000) / 10} y2="500" />
          ))}
          {[...Array(7)].map((_, i) => (
            <line key={`h${i}`} x1="0" y1={(i * 500) / 6} x2="1000" y2={(i * 500) / 6} />
          ))}
        </g>

        {/* massas continentais estilizadas */}
        <g fill="#243b33" fillOpacity="0.92" stroke="#3d5c50" strokeWidth="0.8">
          <path d="M120 90 L215 70 L300 96 L288 140 L250 150 L232 190 L196 205 L170 250 L140 236 L120 190 L112 140 Z" />
          <path d="M232 258 L280 250 L300 300 L292 350 L268 420 L240 452 L222 400 L228 330 Z" />
          <path d="M448 60 L520 52 L560 74 L556 104 L520 120 L470 118 L440 96 Z" />
          <path d="M470 130 L540 128 L566 170 L560 240 L534 300 L500 340 L470 300 L455 220 L452 170 Z" />
          <path d="M600 70 L760 60 L860 96 L880 150 L820 210 L740 220 L680 190 L620 140 Z" />
          <path d="M700 230 L760 226 L790 260 L770 300 L720 290 L692 262 Z" />
          <path d="M812 330 L900 322 L936 360 L912 410 L840 420 L806 380 Z" />
          <path d="M60 40 L200 30 L260 48 L180 62 L96 66 Z" />
        </g>

        {/* migration routes */}
        {showRoutes &&
          routes
            .filter((r) => r.from_lat !== null && r.to_lat !== null)
            .map((r) => {
              const a = project(Number(r.from_lat), Number(r.from_lng));
              const b = project(Number(r.to_lat), Number(r.to_lng));
              const mx = (a.x + b.x) / 2;
              const my = (a.y + b.y) / 2 - 60;
              return (
                <g key={r.id}>
                  <path
                    d={`M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`}
                    fill="none"
                    stroke="#f2c078"
                    strokeOpacity="0.55"
                    strokeWidth="1.4"
                    strokeDasharray="6 6"
                  >
                    {!reducedMotion && (
                      <animate attributeName="stroke-dashoffset" from="120" to="0" dur="6s" repeatCount="indefinite" />
                    )}
                  </path>
                </g>
              );
            })}

        {/* pontos pulsantes */}
        {points.slice(0, visibleCount).map((p) => {
          const pct = Number(p.region.percentage ?? 0);
          const weight = pct / maxPct;
          const base = 5 + weight * 12;
          const color = p.region.color ?? "#c98a3a";
          const isActive = activeId === p.region.id || hover === p.region.id;
          return (
            <g
              key={p.region.id}
              transform={`translate(${p.x} ${p.y})`}
              className="cursor-pointer"
              onMouseEnter={() => setHover(p.region.id)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onSelect?.(p.region.id)}
            >
              <circle r={base * 4} fill="url(#ck-glow)" opacity={isActive ? 0.9 : 0.55} />
              <circle r={base} fill={color} opacity={isActive ? 1 : 0.85} />
              {!reducedMotion && (
                <circle r={base} fill="none" stroke={color} strokeWidth="1.4" opacity="0.75">
                  <animate attributeName="r" from={base} to={base * 3.2} dur={`${2.4 + weight}s`} repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.75" to="0" dur={`${2.4 + weight}s`} repeatCount="indefinite" />
                </circle>
              )}
              {isActive && (
                <g transform="translate(0 -18)">
                  <rect x={-70} y={-26} width={140} height={26} rx={13} fill="#0d1714" fillOpacity="0.92" />
                  <text x="0" y="-8" textAnchor="middle" fontSize="12" fill="#f4efe2">
                    {regionLabel(p.region)} · {pct.toFixed(1)}%
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
