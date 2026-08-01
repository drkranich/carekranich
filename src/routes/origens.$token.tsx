import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AncestryMap, regionLabel, regionPath, type AncestryRegion } from "@/components/app/AncestryMap";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { downloadAncestryPdf } from "@/lib/ancestryPdf";

export const Route = createFileRoute("/origens/$token")({ component: SharedOrigins });

const ERROR_LABEL: Record<string, string> = {
  link_invalido: "This link is not valid.",
  link_revogado: "This link was revoked by the laboratory.",
  link_expirado: "Este link expirou.",
  resultado_indisponivel: "The result is no longer available.",
};

const CONFIDENCE_LABEL: Record<string, string> = {
  alta: "High confidence",
  moderada: "Moderate confidence",
  ampla: "Estimativa ampla",
  revisao: "In review",
};

function SharedOrigins() {
  const { token } = Route.useParams();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showRoutes, setShowRoutes] = useState(false);

  const shared = useQuery({
    queryKey: ["shared-ancestry", token],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_shared_ancestry", { _token: token });
      if (error) throw error;
      return data as any;
    },
  });

  const payload = shared.data;
  const regions: AncestryRegion[] = payload?.regions ?? [];
  const active = regions.find((r) => r.id === activeId) ?? null;

  const exportPremiumPdf = () => {
    if (!payload) return;
    downloadAncestryPdf(`my-origins-${payload.patient_name ?? "patient"}.pdf`, {
      patientName: payload.patient_name ?? "Paciente",
      version: payload.result?.version ?? "-",
      publishedAt: payload.result?.published_at,
      labName: payload.result?.lab_name,
      algorithm: payload.result?.algorithm_version,
      referencePopulation: payload.result?.reference_population,
      processedAt: payload.result?.processed_at,
      technicalLead: payload.result?.technical_lead,
      regions: regions.map((r) => ({
        label: regionLabel(r),
        path: regionPath(r),
        percentage: Number(r.percentage ?? 0),
        rangeMin: r.range_min !== null && r.range_min !== undefined ? Number(r.range_min) : null,
        rangeMax: r.range_max !== null && r.range_max !== undefined ? Number(r.range_max) : null,
        confidence: CONFIDENCE_LABEL[r.confidence ?? "moderada"] ?? "Moderate confidence",
        color: r.color ?? "#c98a3a",
        latitude: r.latitude !== null && r.latitude !== undefined ? Number(r.latitude) : null,
        longitude: r.longitude !== null && r.longitude !== undefined ? Number(r.longitude) : null,
        populationGroup: r.population_group,
        summary: r.summary,
        fullText: r.full_text,
        historicalText: r.historical_text,
        limitations: r.limitations,
      })),
      routes: (payload.routes ?? []).map((r: any) => ({
        label: r.label,
        period: r.period,
        description: r.description,
      })),
      timeline: (payload.timeline ?? []).map((t: any) => ({
        period: t.period,
        title: t.title,
        description: t.description,
      })),
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-16">
        {shared.isLoading && <p className="text-sm text-muted-foreground">Abrindo o atlas compartilhado...</p>}

        {payload?.error && (
          <div className="rounded-2xl border border-wine/25 bg-wine/5 p-8 text-center">
            <p className="font-display text-2xl text-foreground">Atlas unavailable</p>
            <p className="mt-2 text-sm text-muted-foreground">{ERROR_LABEL[payload.error] ?? "Link unavailable."}</p>
          </div>
        )}

        {payload && !payload.error && (
          <div className="space-y-8">
            <header>
              <p className="text-xs uppercase tracking-widest text-moss">Atlas ancestral compartilhado</p>
              <h1 className="mt-2 font-display text-4xl text-foreground">My Origins</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {payload.patient_name} · version {payload.result?.version}
                {payload.result?.published_at ? ` · published on ${new Date(payload.result.published_at).toLocaleDateString("en-US")}` : ""}
              </p>
            </header>

            <AncestryMap
              regions={regions}
              activeId={activeId}
              onSelect={setActiveId}
              showRoutes={showRoutes}
              routes={payload.routes ?? []}
            />

            <div className="flex flex-wrap gap-2 text-xs">
              <button
                onClick={() => setShowRoutes(!showRoutes)}
                className={`rounded-full border px-4 py-2 ${showRoutes ? "border-olive bg-olive text-ivory" : "border-border bg-ivory/60"}`}
              >
                Migration routes
              </button>
              {payload.allow_download && (
                <button onClick={exportPremiumPdf} className="rounded-full border border-border bg-ivory/60 px-4 py-2">
                  Baixar resumo em PDF
                </button>
              )}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <h2 className="font-display text-2xl text-foreground">Composition</h2>
                {regions.map((r) => (
                  <button key={r.id} onClick={() => setActiveId(r.id)} className="block w-full text-left">
                    <div className="flex items-center justify-between text-xs">
                      <span className="truncate text-foreground">{regionLabel(r)}</span>
                      <span className="text-muted-foreground">{Number(r.percentage).toFixed(1)}%</span>
                    </div>
                    <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-cream">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Number(r.percentage)}%`, background: r.color ?? "#c98a3a", opacity: activeId && activeId !== r.id ? 0.4 : 1 }}
                      />
                    </div>
                  </button>
                ))}
              </div>

              <div>
                {active ? (
                  <div className="rounded-2xl border border-border bg-card p-6">
                    <p className="text-xs uppercase tracking-widest text-moss">{regionPath(active)}</p>
                    <h3 className="mt-1 font-display text-2xl text-foreground">{regionLabel(active)}</h3>
                    <p className="mt-2 text-sm text-olive">
                      {Number(active.percentage).toFixed(1)}%
                      {active.range_min !== null ? ` · faixa ${active.range_min}–${active.range_max}%` : ""} ·{" "}
                      {CONFIDENCE_LABEL[active.confidence ?? "moderada"]}
                    </p>
                    {active.summary && <p className="mt-4 text-sm leading-relaxed text-foreground/85">{active.summary}</p>}
                    {active.historical_text && (
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{active.historical_text}</p>
                    )}
                    {active.limitations && (
                      <p className="mt-4 rounded-xl border border-terracotta/30 bg-terracotta/5 p-3 text-xs text-terracotta">
                        Limitations: {active.limitations}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
                    Tap a map point or a composition bar to explore each origin.
                  </div>
                )}
              </div>
            </div>

            <p className="rounded-2xl border border-border bg-ivory/60 p-6 text-xs leading-5 text-muted-foreground">
              These percentages represent estimates built from the comparison between the holder's DNA and
              reference population groups. Genetic similarity with a region does not determine cultural belonging
              cultural belonging, and genetic predisposition does not mean diagnosis. This atlas is an educational
              visualization and does not replace professional guidance.
            </p>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
