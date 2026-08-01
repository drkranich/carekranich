import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AncestryMap, regionLabel, regionPath, type AncestryRegion } from "@/components/app/AncestryMap";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { downloadPdf } from "@/lib/pdf";

export const Route = createFileRoute("/origens/$token")({ component: SharedOrigins });

const ERROR_LABEL: Record<string, string> = {
  link_invalido: "Este link não é válido.",
  link_revogado: "Este link foi revogado pelo laboratório.",
  link_expirado: "Este link expirou.",
  resultado_indisponivel: "O resultado não está mais disponível.",
};

const CONFIDENCE_LABEL: Record<string, string> = {
  alta: "Alta confiança",
  moderada: "Confiança moderada",
  ampla: "Estimativa ampla",
  revisao: "Em revisão",
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

  const exportPdf = () => {
    if (!payload) return;
    downloadPdf("minhas-origens.pdf", "Minhas Origens — Atlas Ancestral", [
      `Titular: ${payload.patient_name ?? "-"}`,
      `Versão: ${payload.result?.version} · laboratório ${payload.result?.lab_name ?? "-"}`,
      "",
      "Composição ancestral:",
      ...regions.map((r) => `- ${regionLabel(r)}: ${Number(r.percentage).toFixed(1)}%`),
      "",
      "Estes percentuais representam estimativas construídas a partir da comparação com grupos populacionais",
      "de referência. Semelhança genética não determina pertencimento cultural.",
    ]);
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-16">
        {shared.isLoading && <p className="text-sm text-muted-foreground">Abrindo o atlas compartilhado...</p>}

        {payload?.error && (
          <div className="rounded-2xl border border-wine/25 bg-wine/5 p-8 text-center">
            <p className="font-display text-2xl text-foreground">Atlas indisponível</p>
            <p className="mt-2 text-sm text-muted-foreground">{ERROR_LABEL[payload.error] ?? "Link indisponível."}</p>
          </div>
        )}

        {payload && !payload.error && (
          <div className="space-y-8">
            <header>
              <p className="text-xs uppercase tracking-widest text-moss">Atlas ancestral compartilhado</p>
              <h1 className="mt-2 font-display text-4xl text-foreground">Minhas Origens</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {payload.patient_name} · versão {payload.result?.version}
                {payload.result?.published_at ? ` · publicado em ${new Date(payload.result.published_at).toLocaleDateString("pt-BR")}` : ""}
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
                Rotas migratórias
              </button>
              {payload.allow_download && (
                <button onClick={exportPdf} className="rounded-full border border-border bg-ivory/60 px-4 py-2">
                  Baixar resumo em PDF
                </button>
              )}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <h2 className="font-display text-2xl text-foreground">Composição</h2>
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
                        Limitações: {active.limitations}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
                    Toque em um ponto do mapa ou em uma barra da composição para conhecer cada origem.
                  </div>
                )}
              </div>
            </div>

            <p className="rounded-2xl border border-border bg-ivory/60 p-6 text-xs leading-5 text-muted-foreground">
              Estes percentuais representam estimativas construídas a partir da comparação entre o DNA do titular e
              grupos populacionais de referência. Semelhança genética com uma região não determina pertencimento
              cultural, e predisposição genética não significa diagnóstico. Este atlas é uma visualização educativa e
              não substitui orientação profissional.
            </p>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
