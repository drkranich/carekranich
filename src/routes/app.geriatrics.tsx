import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Activity, Droplets, HeartPulse, Moon, ShowerHead, Utensils } from "lucide-react";
import { toast } from "sonner";
import { Card, EmptyState, PageHeader, Pill, Stat } from "@/components/app/primitives";
import { GlassSelect } from "@/components/app/GlassSelect";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { downloadPdf } from "@/lib/pdf";

export const Route = createFileRoute("/app/geriatrics")({ component: Geriatrics });

const SCALES: Record<string, { label: string; min: number; max: number; risk: (score: number) => { level: string; tone: "moss" | "gold" | "wine" } }> = {
  braden: {
    label: "Braden (lesão por pressão)",
    min: 6,
    max: 23,
    risk: (s) => (s <= 12 ? { level: "Risco alto", tone: "wine" } : s <= 14 ? { level: "Risco moderado", tone: "gold" } : s <= 18 ? { level: "Risco leve", tone: "gold" } : { level: "Risco baixo", tone: "moss" }),
  },
  morse: {
    label: "Morse (risco de queda)",
    min: 0,
    max: 125,
    risk: (s) => (s >= 45 ? { level: "Risco alto", tone: "wine" } : s >= 25 ? { level: "Risco moderado", tone: "gold" } : { level: "Risco baixo", tone: "moss" }),
  },
  barthel: {
    label: "Barthel (independência funcional)",
    min: 0,
    max: 100,
    risk: (s) => (s < 20 ? { level: "Dependência total", tone: "wine" } : s < 40 ? { level: "Dependência grave", tone: "wine" } : s < 60 ? { level: "Dependência moderada", tone: "gold" } : s < 100 ? { level: "Dependência leve", tone: "gold" } : { level: "Independent", tone: "moss" }),
  },
  katz: {
    label: "Katz (atividades da vida diária)",
    min: 0,
    max: 6,
    risk: (s) => (s <= 2 ? { level: "Dependência importante", tone: "wine" } : s <= 4 ? { level: "Dependência parcial", tone: "gold" } : { level: "Independent", tone: "moss" }),
  },
  minimental: {
    label: "Mini Mental (rastreio cognitivo)",
    min: 0,
    max: 30,
    risk: (s) => (s < 24 ? { level: "Sugestivo de déficit — avaliar escolaridade", tone: "gold" } : { level: "Within expected range", tone: "moss" }),
  },
};

const CARE_TYPES: { value: string; label: string; icon: typeof ShowerHead; withQuantity?: string }[] = [
  { value: "banho", label: "Banho", icon: ShowerHead },
  { value: "alimentacao", label: "Alimentação", icon: Utensils },
  { value: "hidratacao", label: "Hidratação", icon: Droplets, withQuantity: "ml" },
  { value: "sono", label: "Sono", icon: Moon, withQuantity: "hours" },
  { value: "mobilidade", label: "Mobilidade", icon: Activity },
  { value: "fralda", label: "Troca de fralda", icon: HeartPulse },
  { value: "visita", label: "Visita", icon: HeartPulse },
  { value: "queda", label: "Queda (incidente)", icon: HeartPulse },
];

function Geriatrics() {
  const { profile, user, hasAnyRole, isSuperAdmin } = useAuth();
  const qc = useQueryClient();
  const canLog = hasAnyRole(["caregiver", "nurse", "doctor", "clinic_admin", "super_admin"]);
  const [residentId, setResidentId] = useState("");
  const [scale, setScale] = useState("braden");
  const [score, setScore] = useState("");
  const [scaleNotes, setScaleNotes] = useState("");
  const [careDetail, setCareDetail] = useState("");
  const [careQty, setCareQty] = useState("");

  const residents = useQuery({
    queryKey: ["geriatrics-residents", profile?.tenant_id],
    enabled: !!profile?.tenant_id || isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("residents").select("id, tenant_id, full_name, preferred_name").order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const assessments = useQuery({
    queryKey: ["scale-assessments", residentId],
    enabled: !!residentId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("care_scale_assessments")
        .select("*")
        .eq("resident_id", residentId)
        .order("assessed_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const careLogs = useQuery({
    queryKey: ["daily-care-logs", residentId],
    enabled: !!residentId,
    queryFn: async () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const { data, error } = await (supabase as any)
        .from("daily_care_logs")
        .select("*")
        .eq("resident_id", residentId)
        .gte("logged_at", start.toISOString())
        .order("logged_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const resident = (residents.data ?? []).find((item: any) => item.id === residentId) ?? null;
  const residentLabel = resident ? resident.preferred_name || resident.full_name : "";

  const saveScale = useMutation({
    mutationFn: async () => {
      if (!resident) throw new Error("Select a resident.");
      const numeric = Number(score);
      const config = SCALES[scale];
      if (Number.isNaN(numeric) || numeric < config.min || numeric > config.max) {
        throw new Error(`Score for ${config.label} must be between ${config.min} and ${config.max}.`);
      }
      const { error } = await (supabase as any).from("care_scale_assessments").insert({
        tenant_id: resident.tenant_id,
        resident_id: resident.id,
        scale,
        score: numeric,
        risk_level: config.risk(numeric).level,
        notes: scaleNotes.trim() || null,
        assessed_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Avaliação registrada");
      setScore("");
      setScaleNotes("");
      qc.invalidateQueries({ queryKey: ["scale-assessments", residentId] });
    },
    onError: (error: any) => toast.error(error.message ?? "Não foi possível registrar"),
  });

  const logCare = useMutation({
    mutationFn: async (careType: string) => {
      if (!resident) throw new Error("Select a resident.");
      const { error } = await (supabase as any).from("daily_care_logs").insert({
        tenant_id: resident.tenant_id,
        resident_id: resident.id,
        care_type: careType,
        detail: careDetail.trim() || null,
        quantity: careQty ? Number(careQty) : null,
        logged_by: user?.id,
      });
      if (error) throw error;
      return careType;
    },
    onSuccess: (careType) => {
      toast.success(`${CARE_TYPES.find((item) => item.value === careType)?.label ?? "Cuidado"} registrado`);
      setCareDetail("");
      setCareQty("");
      qc.invalidateQueries({ queryKey: ["daily-care-logs", residentId] });
    },
    onError: (error: any) => toast.error(error.message ?? "Não foi possível registrar"),
  });

  const latestByScale = (key: string) => (assessments.data ?? []).find((item: any) => item.scale === key) ?? null;

  const exportReport = () => {
    if (!resident) return;
    const scaleLines = Object.entries(SCALES).map(([key, config]) => {
      const latest = latestByScale(key);
      return latest
        ? `${config.label}: ${latest.score} — ${latest.risk_level} (${new Date(latest.assessed_at).toLocaleDateString("pt-BR")})`
        : `${config.label}: sem avaliação`;
    });
    const todayLines = (careLogs.data ?? []).map(
      (log: any) =>
        `${new Date(log.logged_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} - ${
          CARE_TYPES.find((item) => item.value === log.care_type)?.label ?? log.care_type
        }${log.quantity ? ` (${log.quantity})` : ""}${log.detail ? ` — ${log.detail}` : ""}`,
    );
    downloadPdf(`geriatria-${residentLabel}`, `Geriatric report — ${residentLabel}`, [
      "ESCALAS CLÍNICAS (última avaliação)",
      ...scaleLines,
      "",
      "ROTINA DE HOJE",
      ...(todayLines.length ? todayLines : ["No care recorded today."]),
      "",
      `Gerado em ${new Date().toLocaleString("pt-BR")} - Care Kranich`,
    ]);
  };

  return (
    <>
      <PageHeader
        title="Gestão geriátrica"
        subtitle="Validated clinical scales (Braden, Morse, Barthel, Katz, Mini Mental) and daily care routine by resident."
        action={
          <div className="flex items-center gap-2">
            <Pill tone="olive">Módulo clínico</Pill>
            {resident && (
              <button onClick={exportReport} className="rounded-full border border-moss/40 bg-white/60 px-4 py-2 text-xs font-medium hover:bg-moss/15">
                PDF report
              </button>
            )}
          </div>
        }
      />

      <Card>
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <GlassSelect
            value={residentId}
            onChange={setResidentId}
            placeholder="Select resident"
            options={(residents.data ?? []).map((item: any) => ({
              value: item.id,
              label: item.preferred_name || item.full_name,
            }))}
          />
          {resident && <Pill tone="moss">{residentLabel}</Pill>}
        </div>
      </Card>

      {!resident ? (
        <div className="mt-6"><EmptyState title="Choose a resident" hint="As escalas and a rotina diária são registradas por pessoa." /></div>
      ) : (
        <>
          <div className="mt-6 grid gap-3 md:grid-cols-3 xl:grid-cols-5">
            {Object.entries(SCALES).map(([key, config]) => {
              const latest = latestByScale(key);
              const risk = latest ? config.risk(Number(latest.score)) : null;
              return (
                <div key={key} className="rounded-2xl border border-white/70 bg-white/50 p-4 shadow-soft backdrop-blur-xl">
                  <p className="text-[11px] font-semibold uppercase text-muted-foreground">{config.label.split(" (")[0]}</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{latest ? latest.score : "—"}</p>
                  {risk ? <Pill tone={risk.tone}>{risk.level}</Pill> : <p className="text-xs text-muted-foreground">Sem avaliação</p>}
                </div>
              );
            })}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {canLog && (
              <Card>
                <h2 className="text-xl font-semibold text-foreground">Registrar escala clínica</h2>
                <div className="mt-4 space-y-3">
                  <GlassSelect
                    value={scale}
                    onChange={setScale}
                    options={Object.entries(SCALES).map(([value, config]) => ({ value, label: config.label }))}
                  />
                  <input
                    value={score}
                    onChange={(e) => setScore(e.target.value.replace(/[^\d.]/g, ""))}
                    placeholder={`Score (${SCALES[scale].min}–${SCALES[scale].max})`}
                    inputMode="numeric"
                    className="w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm"
                  />
                  {score && !Number.isNaN(Number(score)) && (
                    <Pill tone={SCALES[scale].risk(Number(score)).tone}>{SCALES[scale].risk(Number(score)).level}</Pill>
                  )}
                  <textarea
                    value={scaleNotes}
                    onChange={(e) => setScaleNotes(e.target.value)}
                    rows={2}
                    placeholder="Observações da avaliação"
                    className="w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm"
                  />
                  <button
                    onClick={() => saveScale.mutate()}
                    disabled={saveScale.isPending || !score}
                    className="rounded-full bg-olive px-5 py-2 text-xs font-semibold text-ivory disabled:opacity-50"
                  >
                    {saveScale.isPending ? "Saving..." : "Registrar avaliação"}
                  </button>
                </div>
              </Card>
            )}

            {canLog && (
              <Card>
                <h2 className="text-xl font-semibold text-foreground">Rotina diária</h2>
                <p className="mt-1 text-xs text-muted-foreground">Um toque para registrar o cuidado agora.</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {CARE_TYPES.map((care) => {
                    const Icon = care.icon;
                    return (
                      <button
                        key={care.value}
                        onClick={() => logCare.mutate(care.value)}
                        disabled={logCare.isPending}
                        className={`flex items-center gap-2 rounded-2xl border px-3 py-3 text-left text-sm shadow-soft backdrop-blur-xl transition disabled:opacity-50 ${
                          care.value === "queda"
                            ? "border-wine/30 bg-wine/5 text-wine hover:bg-wine/10"
                            : "border-white/70 bg-white/50 text-foreground hover:bg-white/75"
                        }`}
                      >
                        <Icon className="h-4 w-4 flex-none text-olive" />
                        {care.label}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <input
                    value={careQty}
                    onChange={(e) => setCareQty(e.target.value.replace(/[^\d.]/g, ""))}
                    placeholder="Quantidade (ml, hours...)"
                    className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm"
                  />
                  <input
                    value={careDetail}
                    onChange={(e) => setCareDetail(e.target.value)}
                    placeholder="Detalhe (opcional)"
                    className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm"
                  />
                </div>
              </Card>
            )}
          </div>

          <Card className="mt-6">
            <h2 className="text-xl font-semibold text-foreground">Hoje — {residentLabel}</h2>
            {(careLogs.data ?? []).length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No care recorded today yet.</p>
            ) : (
              <div className="mt-4 space-y-2">
                {(careLogs.data ?? []).map((log: any) => (
                  <div key={log.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/50 px-4 py-2.5">
                    <p className="text-sm text-foreground">
                      {CARE_TYPES.find((item) => item.value === log.care_type)?.label ?? log.care_type}
                      {log.quantity ? ` · ${log.quantity}` : ""}
                      {log.detail ? ` · ${log.detail}` : ""}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.logged_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="mt-6">
            <h2 className="text-xl font-semibold text-foreground">Histórico de escalas</h2>
            {(assessments.data ?? []).length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No assessment recorded.</p>
            ) : (
              <div className="mt-4 space-y-2">
                {(assessments.data ?? []).slice(0, 20).map((item: any) => (
                  <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/70 bg-white/50 px-4 py-2.5">
                    <p className="text-sm text-foreground">
                      {SCALES[item.scale]?.label ?? item.scale} · <span className="font-semibold">{item.score}</span>
                      {item.notes ? ` · ${item.notes}` : ""}
                    </p>
                    <div className="flex items-center gap-2">
                      <Pill tone={SCALES[item.scale]?.risk(Number(item.score)).tone ?? "muted"}>{item.risk_level}</Pill>
                      <span className="text-xs text-muted-foreground">{new Date(item.assessed_at).toLocaleDateString("pt-BR")}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </>
  );
}
