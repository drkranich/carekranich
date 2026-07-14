import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, Spark, Pill } from "@/components/app/primitives";
import type { ReactNode } from "react";

export type Resident = { id: string; full_name: string; preferred_name: string | null };

export function useResidents(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: ["residents-list", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase
        .from("residents")
        .select("id,full_name,preferred_name")
        .order("full_name");
      return (data ?? []) as Resident[];
    },
  });
}

export function ResidentPicker({
  residents,
  value,
  onChange,
}: {
  residents: Resident[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-border bg-ivory px-3 py-1.5">
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4 text-muted-foreground"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8" />
      </svg>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-sm focus:outline-none"
      >
        {residents.length === 0 && <option value="">No residents</option>}
        {residents.map((r) => (
          <option key={r.id} value={r.id}>
            {r.preferred_name || r.full_name}
          </option>
        ))}
      </select>
    </div>
  );
}

export function StatusTile({
  label,
  status,
  value,
  trend,
  spark,
  tone = "olive",
  icon,
}: {
  label: string;
  status: string;
  value?: string;
  trend?: "up" | "down" | "flat";
  spark?: number[];
  tone?: "olive" | "wine" | "moss" | "terracotta" | "gold";
  icon: string;
}) {
  const trendArrow = trend === "up" ? "up" : trend === "down" ? "down" : "-";
  const trendTone =
    trend === "up" ? "text-moss" : trend === "down" ? "text-wine" : "text-muted-foreground";
  const toneColor: Record<string, string> = {
    olive: "var(--olive)",
    wine: "var(--wine)",
    moss: "var(--moss)",
    terracotta: "var(--terracotta)",
    gold: "var(--gold)",
  };
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{value ?? "-"}</p>
          <p className={`mt-1 text-xs ${trendTone}`}>
            {trendArrow} {status}
          </p>
        </div>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-${tone}/10 text-${tone}`}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d={icon} />
          </svg>
        </div>
      </div>
      {spark && spark.length > 1 && (
        <div className="mt-3">
          <Spark points={spark} color={toneColor[tone]} height={36} />
        </div>
      )}
    </Card>
  );
}

export function InsightCard({
  title,
  summary,
  reasoning,
  confidence,
  severity = "info",
  recommendations,
  generatedBy = "AI",
  createdAt,
}: {
  title: string;
  summary: string;
  reasoning?: string | null;
  confidence?: number | null;
  severity?: string;
  recommendations?: string[];
  generatedBy?: string;
  createdAt?: string;
}) {
  const sevTone: Record<string, "moss" | "wine" | "gold" | "olive"> = {
    info: "olive",
    positive: "moss",
    warning: "gold",
    critical: "wine",
  };
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Pill tone={sevTone[severity] ?? "olive"}>{severity}</Pill>
            {typeof confidence === "number" && (
              <span className="text-[10px] uppercase text-muted-foreground">
                {Math.round(confidence * 100)}% confidence
              </span>
            )}
          </div>
          <p className="mt-2 text-lg font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{summary}</p>
          {reasoning && (
            <details className="mt-3 text-xs text-muted-foreground">
              <summary className="cursor-pointer text-olive">Why this conclusion</summary>
              <p className="mt-2 whitespace-pre-wrap">{reasoning}</p>
            </details>
          )}
          {recommendations && recommendations.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-foreground">
              {recommendations.map((r, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1 h-1 w-1 rounded-full bg-olive" />
                  {r}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-[10px] uppercase text-muted-foreground">
        <span>{generatedBy}</span>
        {createdAt && <span>{new Date(createdAt).toLocaleString()}</span>}
      </div>
    </Card>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-xs font-medium uppercase text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export function inputCls() {
  return "rounded-xl border border-border bg-ivory px-3 py-2 text-sm focus:border-olive focus:outline-none";
}
