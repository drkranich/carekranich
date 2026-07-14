import type { ReactNode } from "react";

export function Card({ children, className = "", padded = true }: { children: ReactNode; className?: string; padded?: boolean }) {
  return (
    <div className={`rounded-2xl border border-white/65 bg-card/75 shadow-soft backdrop-blur-xl ${padded ? "p-6" : ""} ${className}`}>
      {children}
    </div>
  );
}

export function SectionHeader({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-widest text-moss">{eyebrow}</p>}
        <h2 className="mt-1 font-display text-2xl text-foreground md:text-3xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string | ReactNode; action?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl text-foreground md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function Stat({ label, value, sub, tone = "olive" }: { label: string; value: string | number; sub?: string; tone?: "olive" | "wine" | "moss" | "terracotta" | "gold" }) {
  const toneMap: Record<string, string> = {
    olive: "text-olive", wine: "text-wine", moss: "text-moss", terracotta: "text-terracotta", gold: "text-gold",
  };
  return (
    <Card>
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`mt-2 font-display text-4xl ${toneMap[tone]}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </Card>
  );
}

export function Pill({ children, tone = "moss" }: { children: ReactNode; tone?: "moss" | "wine" | "gold" | "olive" | "terracotta" | "muted" }) {
  const toneMap: Record<string, string> = {
    moss: "border border-moss/15 bg-moss/10 text-moss",
    wine: "border border-wine/20 bg-wine/10 text-wine",
    gold: "border border-gold/25 bg-gold/15 text-wine",
    olive: "border border-olive/15 bg-olive/10 text-olive",
    terracotta: "border border-terracotta/20 bg-terracotta/10 text-terracotta",
    muted: "border border-border/70 bg-muted/70 text-muted-foreground",
  };
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${toneMap[tone]}`}>{children}</span>;
}

export function Spark({ points, color = "var(--moss)", height = 40 }: { points: number[]; color?: string; height?: number }) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const w = 100;
  const step = w / (points.length - 1);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${i * step} ${height - ((p - min) / range) * (height - 4) - 2}`).join(" ");
  const area = `${path} L ${w} ${height} L 0 ${height} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      <path d={area} fill={color} opacity="0.12" />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Bars({ values, color = "var(--olive)", height = 60 }: { values: number[]; color?: string; height?: number }) {
  const max = Math.max(...values);
  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {values.map((v, i) => (
        <div key={i} className="flex-1 rounded-t-md transition-all hover:opacity-80" style={{ height: `${(v / max) * 100}%`, background: color, opacity: 0.3 + (v / max) * 0.7 }} />
      ))}
    </div>
  );
}

export function Ring({ value, max = 100, label, sub, color = "var(--olive)", size = 140 }: { value: number; max?: number; label: string; sub?: string; color?: string; size?: number }) {
  const radius = size / 2 - 10;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (value / max) * circ;
  return (
    <div className="flex items-center gap-5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border)" strokeWidth="8" />
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-3xl text-foreground">{value}</span>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">/ {max}</span>
        </div>
      </div>
      <div>
        <p className="font-display text-lg text-foreground">{label}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

export function Avatar({ name, src, tone = "olive", size = 36 }: { name: string; src?: string | null; tone?: string; size?: number }) {
  const initials = (name || "?").split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  const tones: Record<string, string> = {
    olive: "bg-olive/15 text-olive",
    wine: "bg-wine/15 text-wine",
    gold: "bg-gold/20 text-gold",
    terracotta: "bg-terracotta/15 text-terracotta",
    moss: "bg-moss/15 text-moss",
  };
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className="flex-none rounded-full object-cover ring-1 ring-border"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div className={`flex flex-none items-center justify-center rounded-full font-display ${tones[tone] || tones.olive}`} style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initials}
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <Card className="text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-olive text-ivory shadow-soft">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14 M5 12h14"/></svg>
      </div>
      <p className="mt-4 font-display text-lg text-foreground">{title}</p>
      {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </Card>
  );
}
