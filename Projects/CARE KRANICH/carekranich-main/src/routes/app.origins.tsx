import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileDown, Play, Sparkles } from "lucide-react";
import { Card, EmptyState, PageHeader, Pill } from "@/components/app/primitives";
import { GlassSelect } from "@/components/app/GlassSelect";
import { AncestryMap, regionLabel, regionPath, type AncestryRegion } from "@/components/app/AncestryMap";
import { AncestryReveal } from "@/components/app/AncestryReveal";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { downloadAncestryPdf } from "@/lib/ancestryPdf";

export const Route = createFileRoute("/app/origins")({ component: Origins });

const CONFIDENCE_LABEL: Record<string, string> = {
  alta: "Alta confiança",
  moderada: "Confiança moderada",
  ampla: "Estimativa ampla",
  revisao: "Em revisão",
};

const CHART_MODES = [
  { value: "circulo", label: "Círculo de ancestralidade" },
  { value: "barras", label: "Barras territoriais" },
  { value: "constelacao", label: "Constelação genética" },
];

function Origins() {
  const { user } = useAuth();
  const [profileId, setProfileId] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [chartMode, setChartMode] = useState("circulo");
  const [showRoutes, setShowRoutes] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [progress, setProgress] = useState(1);

  const myPatients = useQuery({
    queryKey: ["origins-patients", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const db = supabase as any;
      const [own, auth] = await Promise.all([
        db.from("patients").select("id,full_name,social_name").eq("user_id", user!.id),
        db.from("patient_authorizations").select("patient_id,relationship").eq("granted_to", user!.id).eq("status", "active"),
      ]);
      const ownList = own.data ?? [];
      const ids = (auth.data ?? []).map((a: any) => a.patient_id);
      let authList: any[] = [];
      if (ids.length) {
        const { data } = await db.from("patients").select("id,full_name,social_name").in("id", ids);
        authList = (data ?? []).map((p: any) => ({
          ...p,
          _rel: (auth.data ?? []).find((a: any) => a.patient_id === p.id)?.relationship,
        }));
      }
      return [...ownList, ...authList.filter((p) => !ownList.some((o: any) => o.id === p.id))];
    },
  });

  const selectedPatient =
    (myPatients.data ?? []).find((p: any) => p.id === profileId) ?? (myPatients.data ?? [])[0] ?? null;

  const result = useQuery({
    queryKey: ["origins-result", selectedPatient?.id],
    enabled: !!selectedPatient,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ancestry_results")
        .select("*")
        .eq("patient_id", selectedPatient!.id)
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return (data ?? [])[0] ?? null;
    },
  });

  const regions = useQuery({
    queryKey: ["origins-regions", result.data?.id],
    enabled: !!result.data,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ancestry_regions")
        .select("*")
        .eq("result_id", result.data!.id)
        .order("percentage", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AncestryRegion[];
    },
  });

  const routes = useQuery({
    queryKey: ["origins-routes", result.data?.id],
    enabled: !!result.data,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ancestry_routes")
        .select("*")
        .eq("result_id", result.data!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const timeline = useQuery({
    queryKey: ["origins-timeline", result.data?.id],
    enabled: !!result.data,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ancestry_timeline_events")
        .select("*")
        .eq("result_id", result.data!.id)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const list = regions.data ?? [];
  const active = list.find((r) => r.id === activeId) ?? null;
  const total = list.reduce((a, r) => a + Number(r.percentage ?? 0), 0);
  const animation = result.data?.animation ?? {};
  const reducedMotion = reduced || !!animation.reduced_motion;

  // revelação progressiva das regiões após a abertura
  useEffect(() => {
    if (!revealed || reducedMotion || list.length === 0) return;
    setProgress(0);
    let i = 0;
    const timer = window.setInterval(() => {
      i += 1;
      setProgress(i / list.length);
      if (i >= list.length) window.clearInterval(timer);
    }, 700);
    return () => window.clearInterval(timer);
  }, [revealed, reducedMotion, list.length]);

  const journey = () => {
    if (list.length === 0) return;
    let i = 0;
    setActiveId(list[0].id);
    const timer = window.setInterval(() => {
      i += 1;
      if (i >= list.length) {
        window.clearInterval(timer);
        return;
      }
      setActiveId(list[i].id);
    }, 3200);
  };

  const donut = useMemo(() => {
    let acc = 0;
    return list.map((r) => {
      const pct = Number(r.percentage ?? 0);
      const start = (acc / Math.max(total, 1)) * 360;
      acc += pct;
      const end = (acc / Math.max(total, 1)) * 360;
      return { region: r, start, end, pct };
    });
  }, [list, total]);

  const exportPdf = () => {
    if (!result.data) return;
    const name = selectedPatient?.social_name || selectedPatient?.full_name || "Paciente";
    downloadAncestryPdf(`minhas-origens-${name}.pdf`, {
      patientName: name,
      version: result.data.version,
      publishedAt: result.data.published_at,
      labName: result.data.lab_name,
      algorithm: result.data.algorithm_version,
      referencePopulation: result.data.reference_population,
      processedAt: result.data.processed_at,
      technicalLead: result.data.technical_lead,
      regions: list.map((r) => ({
        label: regionLabel(r),
        path: regionPath(r),
        percentage: Number(r.percentage ?? 0),
        rangeMin: r.range_min !== null && r.range_min !== undefined ? Number(r.range_min) : null,
        rangeMax: r.range_max !== null && r.range_max !== undefined ? Number(r.range_max) : null,
        confidence: CONFIDENCE_LABEL[r.confidence ?? "moderada"] ?? "Confiança moderada",
        color: r.color ?? "#c98a3a",
        latitude: r.latitude !== null && r.latitude !== undefined ? Number(r.latitude) : null,
        longitude: r.longitude !== null && r.longitude !== undefined ? Number(r.longitude) : null,
        populationGroup: r.population_group,
        summary: r.summary,
        fullText: r.full_text,
        historicalText: r.historical_text,
        limitations: r.limitations,
      })),
      routes: (routes.data ?? []).map((r: any) => ({
        label: r.label,
        period: r.period,
        description: r.description,
      })),
      timeline: (timeline.data ?? []).map((t: any) => ({
        period: t.period,
        title: t.title,
        description: t.description,
      })),
    });
  };

  if (myPatients.isLoading || result.isLoading) {
    return (
      <>
        <PageHeader title="Minhas Origens" subtitle="Carregando sua jornada ancestral..." />
      </>
    );
  }

  if (!selectedPatient || !result.data) {
    return (
      <>
        <PageHeader
          title="Minhas Origens"
          subtitle="Seu atlas ancestral aparecerá aqui assim que o resultado do teste genético for liberado."
        />
        <EmptyState
          title="Nenhum resultado de ancestralidade publicado"
          hint="Quando o laboratório liberar seu resultado, você receberá uma notificação e poderá explorar o mapa das suas origens."
        />
      </>
    );
  }

  if (!revealed && !reducedMotion) {
    return (
      <AncestryReveal
        patientName={(selectedPatient.social_name || selectedPatient.full_name || "").split(" ")[0]}
        speed={animation.speed}
        reducedMotion={reducedMotion}
        onFinish={() => setRevealed(true)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Minhas Origens"
        subtitle={`Atlas ancestral de ${selectedPatient.social_name || selectedPatient.full_name} · versão ${result.data.version}`}
        action={
          <div className="flex flex-wrap gap-2">
            <button onClick={journey} className="inline-flex items-center gap-1.5 rounded-full bg-olive px-4 py-2 text-xs font-medium text-ivory">
              <Play className="h-3.5 w-3.5" /> Assistir à minha jornada
            </button>
            <button
              onClick={() => {
                setActiveId(null);
                setRevealed(false);
              }}
              className="rounded-full border border-border bg-white/55 px-4 py-2 text-xs"
            >
              Rever a revelação
            </button>
            <button onClick={exportPdf} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white/55 px-4 py-2 text-xs">
              <FileDown className="h-3.5 w-3.5" /> Relatório em PDF
            </button>
          </div>
        }
      />

      {(myPatients.data ?? []).length > 1 && (
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted-foreground">Perfil:</p>
            <GlassSelect
              value={selectedPatient.id}
              onChange={(v) => {
                setProfileId(v);
                setRevealed(false);
                setActiveId(null);
              }}
              className="min-w-64"
              options={(myPatients.data ?? []).map((p: any) => ({
                value: p.id,
                label: `${p.social_name || p.full_name}${p._rel ? ` (${p._rel})` : " (você)"}`,
              }))}
            />
          </div>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-3">
          <AncestryMap
            regions={list}
            activeId={activeId}
            onSelect={setActiveId}
            reducedMotion={reducedMotion}
            revealProgress={progress}
            showRoutes={showRoutes}
            routes={routes.data ?? []}
          />
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              onClick={() => setShowRoutes(!showRoutes)}
              className={`rounded-full border px-3 py-1.5 ${showRoutes ? "border-olive bg-olive text-ivory" : "border-border bg-white/55"}`}
            >
              Rotas migratórias {(routes.data ?? []).length ? `(${(routes.data ?? []).length})` : ""}
            </button>
            <button
              onClick={() => setReduced(!reduced)}
              className={`rounded-full border px-3 py-1.5 ${reduced ? "border-olive bg-olive text-ivory" : "border-border bg-white/55"}`}
            >
              {reduced ? "Animações desativadas" : "Reduzir animações"}
            </button>
            <span className="text-muted-foreground">Toque em um ponto do mapa para abrir a origem.</span>
          </div>
        </div>

        <Card className="space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Sparkles className="h-4 w-4" /> Composição ancestral
            </h3>
            <GlassSelect value={chartMode} onChange={setChartMode} options={CHART_MODES} className="min-w-56" />
          </div>

          {chartMode === "circulo" && (
            <div className="flex items-center justify-center">
              <svg viewBox="0 0 200 200" className="h-56 w-56">
                {donut.map(({ region, start, end }) => {
                  const large = end - start > 180 ? 1 : 0;
                  const rad = (deg: number) => ((deg - 90) * Math.PI) / 180;
                  const x1 = 100 + 78 * Math.cos(rad(start));
                  const y1 = 100 + 78 * Math.sin(rad(start));
                  const x2 = 100 + 78 * Math.cos(rad(end));
                  const y2 = 100 + 78 * Math.sin(rad(end));
                  const dim = activeId && activeId !== region.id;
                  return (
                    <path
                      key={region.id}
                      d={`M 100 100 L ${x1} ${y1} A 78 78 0 ${large} 1 ${x2} ${y2} Z`}
                      fill={region.color ?? "#c98a3a"}
                      opacity={dim ? 0.25 : 0.95}
                      className="cursor-pointer transition"
                      onClick={() => setActiveId(region.id)}
                    />
                  );
                })}
                <circle cx="100" cy="100" r="48" fill="var(--card, #fff)" />
                <text x="100" y="96" textAnchor="middle" fontSize="13" fill="currentColor" className="text-muted-foreground">
                  origens
                </text>
                <text x="100" y="118" textAnchor="middle" fontSize="24" className="fill-current font-display">
                  {list.length}
                </text>
              </svg>
            </div>
          )}

          {chartMode === "barras" && (
            <div className="space-y-2">
              {list.map((r) => (
                <button key={r.id} onClick={() => setActiveId(r.id)} className="block w-full text-left">
                  <div className="flex items-center justify-between text-xs">
                    <span className="truncate text-foreground">{regionLabel(r)}</span>
                    <span className="text-muted-foreground">{Number(r.percentage).toFixed(1)}%</span>
                  </div>
                  <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-white/60">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${Number(r.percentage)}%`, background: r.color ?? "#c98a3a", opacity: activeId && activeId !== r.id ? 0.4 : 1 }}
                    />
                  </div>
                </button>
              ))}
            </div>
          )}

          {chartMode === "constelacao" && (
            <div className="flex flex-wrap items-center justify-center gap-3 py-4">
              {list.map((r) => {
                const size = 28 + Number(r.percentage) * 1.4;
                return (
                  <button
                    key={r.id}
                    onClick={() => setActiveId(r.id)}
                    className="flex flex-col items-center gap-1"
                    title={`${regionLabel(r)} · ${Number(r.percentage).toFixed(1)}%`}
                  >
                    <span
                      className="rounded-full shadow-soft transition"
                      style={{
                        width: size,
                        height: size,
                        background: r.color ?? "#c98a3a",
                        opacity: activeId && activeId !== r.id ? 0.35 : 1,
                        boxShadow: `0 0 ${size / 2}px ${r.color ?? "#c98a3a"}66`,
                      }}
                    />
                    <span className="max-w-24 truncate text-[10px] text-muted-foreground">{regionLabel(r)}</span>
                  </button>
                );
              })}
            </div>
          )}

          <p className="text-xs leading-5 text-muted-foreground">
            Estes percentuais são estimativas obtidas pela comparação do seu DNA com grupos populacionais de
            referência. Semelhança genética com uma região não determina pertencimento cultural.
          </p>
        </Card>
      </div>

      {active && (
        <Card className="space-y-4 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-moss">{regionPath(active)}</p>
              <h3 className="mt-1 font-display text-2xl text-foreground">{regionLabel(active)}</h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="olive">{Number(active.percentage).toFixed(1)}%</Pill>
              {active.range_min !== null && (
                <Pill tone="muted">
                  faixa {active.range_min}–{active.range_max}%
                </Pill>
              )}
              <Pill tone={active.confidence === "alta" ? "moss" : active.confidence === "ampla" ? "gold" : "muted"}>
                {CONFIDENCE_LABEL[active.confidence ?? "moderada"]}
              </Pill>
            </div>
          </div>

          {active.summary && <p className="text-sm leading-relaxed text-foreground/85">{active.summary}</p>}
          {active.full_text && <p className="text-sm leading-relaxed text-muted-foreground">{active.full_text}</p>}
          {active.historical_text && (
            <div className="rounded-2xl border border-white/70 bg-white/45 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contexto histórico</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{active.historical_text}</p>
            </div>
          )}

          {(timeline.data ?? []).filter((t: any) => t.region_id === active.id).length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Linha do tempo</p>
              <div className="mt-2 space-y-2">
                {(timeline.data ?? [])
                  .filter((t: any) => t.region_id === active.id)
                  .map((t: any) => (
                    <div key={t.id} className="rounded-xl border border-white/70 bg-white/45 px-4 py-2.5">
                      <p className="text-xs font-medium text-olive">{t.period}</p>
                      <p className="text-sm text-foreground">{t.title}</p>
                      {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {active.limitations && (
            <p className="rounded-2xl border border-terracotta/30 bg-terracotta/5 p-4 text-xs leading-5 text-terracotta">
              Limitações: {active.limitations}
            </p>
          )}
        </Card>
      )}

      <Card className="p-5">
        <p className="text-xs text-muted-foreground">
          Resultado processado por {result.data.lab_name ?? "laboratório parceiro"} · algoritmo{" "}
          {result.data.algorithm_version ?? "não informado"} · população de referência{" "}
          {result.data.reference_population ?? "não informada"}. Novas versões podem surgir conforme os bancos de
          referência forem ampliados — você será avisado e poderá comparar com o resultado anterior.
        </p>
      </Card>
    </div>
  );
}
