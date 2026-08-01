import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileDown, MapPin, Plus, Truck } from "lucide-react";
import { toast } from "sonner";
import { Card, EmptyState, PageHeader, Pill, Stat } from "@/components/app/primitives";
import { GlassSelect } from "@/components/app/GlassSelect";
import { GlassDateTimePicker } from "@/components/app/GlassDatePicker";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { downloadPdf } from "@/lib/pdf";

export const Route = createFileRoute("/app/home-collection")({ component: HomeCollection });

const FLOW: Array<{ key: string; label: string }> = [
  { key: "scheduled", label: "Agendada" },
  { key: "en_route", label: "Em rota" },
  { key: "arrived", label: "No local" },
  { key: "collected", label: "Coletada" },
  { key: "delivered_lab", label: "Entregue no laboratório" },
];

const NEXT_LABEL: Record<string, string> = {
  scheduled: "Iniciar rota",
  en_route: "Cheguei ao local",
  arrived: "Register collection",
  collected: "Entregar no laboratório",
};

function flowIndex(key: string) {
  const i = FLOW.findIndex((s) => s.key === key);
  return i < 0 ? 0 : i;
}

function getPosition(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve(p),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  });
}

function brl(cents: number | null | undefined) {
  return ((cents ?? 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function HomeCollection() {
  const qc = useQueryClient();
  const { profile, user, isSuperAdmin } = useAuth();
  const tenantId = profile?.tenant_id ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ patient_id: "", collector_id: "", scheduled_at: "", address: "", fee: "" });
  const [collect, setCollect] = useState({ signature_name: "", material: "Sangue total", temperature: "", identity: false });

  const tenantsList = useQuery({
    queryKey: ["hc-tenants", isSuperAdmin],
    enabled: isSuperAdmin && !tenantId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("tenants").select("id,name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const effTenant = tenantId ?? ((tenantsList.data ?? [])[0] as any)?.id ?? null;

  const patients = useQuery({
    queryKey: ["hc-patients", tenantId],
    enabled: !!tenantId || isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("patients")
        .select("id,full_name,social_name,address,city")
        .eq("status", "active")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const members = useQuery({
    queryKey: ["hc-members", tenantId],
    enabled: !!tenantId || isSuperAdmin,
    queryFn: async () => {
      const db = supabase as any;
      const [{ data: roles }, { data: profiles }] = await Promise.all([
        db.from("user_roles").select("user_id, role").in("role", ["caregiver", "nurse", "clinic_admin"]),
        db.from("profiles").select("id, full_name, preferred_name"),
      ]);
      const nameOf = new Map((profiles ?? []).map((p: any) => [p.id, p.preferred_name || p.full_name || "Coletador"]));
      const seen = new Set<string>();
      return (roles ?? [])
        .filter((r: any) => (seen.has(r.user_id) ? false : (seen.add(r.user_id), true)))
        .map((r: any) => ({ id: r.user_id, name: nameOf.get(r.user_id) ?? "Coletador" }));
    },
  });

  const collections = useQuery({
    queryKey: ["home-collections", tenantId],
    enabled: !!tenantId || isSuperAdmin,
    refetchInterval: 20000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("home_collections")
        .select("*")
        .order("scheduled_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const selected =
    (collections.data ?? []).find((c: any) => c.id === selectedId) ?? (collections.data ?? [])[0] ?? null;

  const events = useQuery({
    queryKey: ["home-collection-events", selected?.id],
    enabled: !!selected,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("home_collection_events")
        .select("*")
        .eq("collection_id", selected!.id)
        .order("performed_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const patientOf = (id: string | null) => (patients.data ?? []).find((x: any) => x.id === id) ?? null;
  const patientName = (id: string | null) => {
    const p = patientOf(id);
    return p ? p.social_name || p.full_name : "Patient";
  };
  const collectorName = (id: string | null) => {
    const m = (members.data ?? []).find((x: any) => x.id === id);
    return m?.name ?? "No collector";
  };

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["home-collections", tenantId] });
    qc.invalidateQueries({ queryKey: ["home-collection-events", selected?.id] });
  };

  const logEvent = async (collectionId: string, status: string, notes?: string, pos?: GeolocationPosition | null) => {
    await (supabase as any).from("home_collection_events").insert({
      tenant_id: effTenant,
      collection_id: collectionId,
      status,
      notes: notes || null,
      latitude: pos?.coords.latitude ?? null,
      longitude: pos?.coords.longitude ?? null,
      performed_by: user?.id ?? null,
    });
  };

  const create = useMutation({
    mutationFn: async () => {
      if (!effTenant) throw new Error("No organization available.");
      if (!draft.patient_id) throw new Error("Select the patient.");
      if (!draft.scheduled_at) throw new Error("Choose collection date and time.");
      const p = patientOf(draft.patient_id);
      const { data, error } = await (supabase as any)
        .from("home_collections")
        .insert({
          tenant_id: effTenant,
          patient_id: draft.patient_id,
          collector_id: draft.collector_id || null,
          scheduled_at: new Date(draft.scheduled_at).toISOString(),
          address: draft.address.trim() || p?.address || null,
          city: p?.city ?? null,
          fee_cents: draft.fee ? Math.round(Number(draft.fee.replace(",", ".")) * 100) : 0,
          created_by: user?.id ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      await logEvent(data.id, "scheduled", "Coleta domiciliar agendada.");
      return data.id as string;
    },
    onSuccess: (id) => {
      toast.success("Coleta domiciliar agendada");
      setDraft({ patient_id: "", collector_id: "", scheduled_at: "", address: "", fee: "" });
      setSelectedId(id);
      refresh();
    },
    onError: (e: any) => toast.error(e.message ?? "Não foi possível agendar"),
  });

  const advance = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      const idx = flowIndex(selected.status);
      if (idx >= FLOW.length - 1) throw new Error("Coleta já entregue no laboratório.");
      const next = FLOW[idx + 1];
      const patch: Record<string, unknown> = { status: next.key };
      let pos: GeolocationPosition | null = null;
      if (next.key === "arrived") {
        pos = await getPosition();
        patch.checkin_latitude = pos?.coords.latitude ?? null;
        patch.checkin_longitude = pos?.coords.longitude ?? null;
      }
      if (next.key === "collected") {
        if (!collect.identity) throw new Error("Confirm patient identity before registering collection.");
        if (!collect.signature_name.trim()) throw new Error("Enter the name of the person who signed the collection.");
        patch.identity_confirmed = true;
        patch.signature_name = collect.signature_name.trim();
        patch.material = collect.material;
        patch.temperature = collect.temperature.trim() || null;
      }
      const { error } = await (supabase as any).from("home_collections").update(patch).eq("id", selected.id);
      if (error) throw error;
      await logEvent(
        selected.id,
        next.key,
        next.key === "collected"
          ? `Material: ${collect.material}. Assinado por ${collect.signature_name.trim()}.${collect.temperature ? ` Temperatura: ${collect.temperature}.` : ""}`
          : undefined,
        pos,
      );
      return next.label;
    },
    onSuccess: (label) => {
      if (label) toast.success(`Coleta: ${label}`);
      setCollect({ signature_name: "", material: "Sangue total", temperature: "", identity: false });
      refresh();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const fail = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      const reason = window.prompt("Motivo da tentativa sem sucesso (ausente, endereço não localizado, recusa...):");
      if (!reason || !reason.trim()) throw new Error("Informe o motivo.");
      const { error } = await (supabase as any)
        .from("home_collections")
        .update({ status: "failed", failure_reason: reason.trim() })
        .eq("id", selected.id);
      if (error) throw error;
      await logEvent(selected.id, "failed", reason.trim());
      await (supabase as any).from("alerts").insert({
        tenant_id: selected.tenant_id,
        title: `Coleta domiciliar sem sucesso — ${patientName(selected.patient_id)}`,
        description: `Motivo: ${reason.trim()}. Necessário reagendar.`,
        severity: "high",
        category: "lab",
        status: "open",
        created_by: user?.id ?? null,
      });
    },
    onSuccess: () => {
      toast.success("Intercorrência registrada — alerta de reagendamento criado");
      refresh();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const exportPdf = (c: any) => {
    const evts = c.id === selected?.id ? (events.data ?? []) : [];
    downloadPdf(`collection-${patientName(c.patient_id)}.pdf`, "Home collection receipt", [
      `Patient: ${patientName(c.patient_id)}`,
      `Coletador: ${collectorName(c.collector_id)}`,
      `Endereço: ${c.address ?? "-"}${c.city ? `, ${c.city}` : ""}`,
      `Agendada para: ${new Date(c.scheduled_at).toLocaleString("pt-BR")}`,
      `Taxa de deslocamento: ${brl(c.fee_cents)}`,
      `Status: ${c.status === "failed" ? `SEM SUCESSO (${c.failure_reason})` : FLOW[flowIndex(c.status)].label}`,
      c.identity_confirmed ? `Identity confirmed · assinado por ${c.signature_name}` : "",
      c.material ? `Material: ${c.material}${c.temperature ? ` · temperatura ${c.temperature}` : ""}` : "",
      "",
      "Cadeia de custódia:",
      ...evts.map(
        (e: any) =>
          `- ${new Date(e.performed_at).toLocaleString("pt-BR")} · ${FLOW.find((f) => f.key === e.status)?.label ?? e.status}${e.notes ? ` · ${e.notes}` : ""}${e.latitude ? ` · GPS ${e.latitude.toFixed(5)}, ${e.longitude.toFixed(5)}` : ""}`,
      ),
    ].filter((l) => l !== ""));
  };

  const stats = useMemo(() => {
    const all = collections.data ?? [];
    const today = new Date().toDateString();
    return {
      today: all.filter((c: any) => new Date(c.scheduled_at).toDateString() === today && c.status !== "failed").length,
      enRoute: all.filter((c: any) => ["en_route", "arrived"].includes(c.status)).length,
      collected: all.filter((c: any) => ["collected", "delivered_lab"].includes(c.status)).length,
      failed: all.filter((c: any) => c.status === "failed").length,
    };
  }, [collections.data]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Coleta domiciliar"
        subtitle="Collector schedule, GPS route, identity confirmation, signature and chain of custody through the laboratory."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Coletas de hoje" value={stats.today} sub="Agendadas para hoje" tone="olive" />
        <Stat label="En route / on site" value={stats.enRoute} sub="Acontecendo agora" tone="gold" />
        <Stat label="Coletadas" value={stats.collected} sub="Incluindo entregues" tone="moss" />
        <Stat label="Sem sucesso" value={stats.failed} sub="Aguardando reagendamento" tone="wine" />
      </div>

      <Card className="space-y-3 p-6">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Truck className="h-4 w-4" /> Schedule home collection
        </h3>
        <div className="grid gap-3 md:grid-cols-3">
          <GlassSelect
            value={draft.patient_id}
            onChange={(v) => {
              const p = patientOf(v);
              setDraft({ ...draft, patient_id: v, address: p?.address ?? draft.address });
            }}
            placeholder="Patient"
            options={(patients.data ?? []).map((p: any) => ({ value: p.id, label: p.social_name || p.full_name }))}
          />
          <GlassSelect
            value={draft.collector_id}
            onChange={(v) => setDraft({ ...draft, collector_id: v })}
            placeholder="Coletador"
            options={[{ value: "", label: "Definir depois" }, ...(members.data ?? []).map((m: any) => ({ value: m.id, label: m.name }))]}
          />
          <GlassDateTimePicker value={draft.scheduled_at} onChange={(v) => setDraft({ ...draft, scheduled_at: v })} />
          <input
            value={draft.address}
            onChange={(e) => setDraft({ ...draft, address: e.target.value })}
            placeholder="Collection address"
            className="rounded-2xl border border-white/70 bg-white/55 px-4 py-2.5 text-sm shadow-soft backdrop-blur-xl outline-none focus:border-olive/40 md:col-span-2"
          />
          <input
            value={draft.fee}
            onChange={(e) => setDraft({ ...draft, fee: e.target.value })}
            placeholder="Taxa de deslocamento (R$)"
            className="rounded-2xl border border-white/70 bg-white/55 px-4 py-2.5 text-sm shadow-soft backdrop-blur-xl outline-none focus:border-olive/40"
          />
        </div>
        <button
          onClick={() => create.mutate()}
          disabled={create.isPending}
          className="inline-flex items-center gap-2 rounded-full bg-olive px-5 py-2 text-sm font-medium text-ivory shadow-soft hover:opacity-90 disabled:opacity-60"
        >
          <Plus className="h-4 w-4" /> Schedule collection
        </button>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card className="space-y-2 p-5">
          <h3 className="text-sm font-semibold text-foreground">Coletas</h3>
          {(collections.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">No home collections scheduled.</p>}
          {(collections.data ?? []).map((c: any) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`block w-full rounded-2xl border px-4 py-3 text-left transition ${
                selected?.id === c.id ? "border-olive/60 bg-olive/10" : "border-white/70 bg-white/50 hover:bg-white/75"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium text-foreground">{patientName(c.patient_id)}</p>
                <Pill tone={c.status === "failed" ? "wine" : c.status === "delivered_lab" ? "moss" : "gold"}>
                  {c.status === "failed" ? "sem sucesso" : FLOW[flowIndex(c.status)].label}
                </Pill>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(c.scheduled_at).toLocaleString("pt-BR")} · {collectorName(c.collector_id)}
              </p>
            </button>
          ))}
        </Card>

        {selected ? (
          <Card className="space-y-4 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{patientName(selected.patient_id)}</h3>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {selected.address ?? "Endereço não informado"}
                  {selected.city ? `, ${selected.city}` : ""} · {collectorName(selected.collector_id)} · taxa {brl(selected.fee_cents)}
                </p>
              </div>
              <button onClick={() => exportPdf(selected)} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white/55 px-4 py-2 text-xs">
                <FileDown className="h-3.5 w-3.5" /> Comprovante (PDF)
              </button>
            </div>

            {selected.status === "failed" && (
              <div className="rounded-2xl border border-wine/25 bg-wine/5 p-4 text-sm text-wine">
                Unsuccessful attempt: {selected.failure_reason}. Schedule a new collection.
              </div>
            )}

            <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-5">
              {FLOW.map((s, i) => {
                const current = flowIndex(selected.status);
                const done = selected.status !== "failed" && i <= current;
                return (
                  <div
                    key={s.key}
                    className={`rounded-xl border px-3 py-2 text-center text-xs ${
                      i === current && selected.status !== "failed"
                        ? "border-olive bg-olive/15 font-medium text-foreground"
                        : done
                          ? "border-moss/30 bg-moss/10 text-moss"
                          : "border-white/70 bg-white/40 text-muted-foreground"
                    }`}
                  >
                    {s.label}
                  </div>
                );
              })}
            </div>

            {selected.status === "arrived" && (
              <div className="space-y-2 rounded-2xl border border-white/70 bg-white/45 p-4">
                <p className="text-xs font-semibold text-foreground">Collection record</p>
                <div className="grid gap-2 md:grid-cols-3">
                  <input
                    value={collect.signature_name}
                    onChange={(e) => setCollect({ ...collect, signature_name: e.target.value })}
                    placeholder="Nome de quem assina *"
                    className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm"
                  />
                  <input
                    value={collect.material}
                    onChange={(e) => setCollect({ ...collect, material: e.target.value })}
                    placeholder="Collected material"
                    className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm"
                  />
                  <input
                    value={collect.temperature}
                    onChange={(e) => setCollect({ ...collect, temperature: e.target.value })}
                    placeholder="Temperatura (ex.: 2-8°C)"
                    className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setCollect({ ...collect, identity: !collect.identity })}
                  className={`rounded-full border px-4 py-1.5 text-xs font-medium transition ${
                    collect.identity
                      ? "border-moss bg-moss text-ivory"
                      : "border-white/70 bg-white/55 text-muted-foreground"
                  }`}
                >
                  {collect.identity ? "Identity confirmed ✓" : "Confirm patient identity"}
                </button>
              </div>
            )}

            {!["delivered_lab", "failed"].includes(selected.status) && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => advance.mutate()}
                  disabled={advance.isPending}
                  className="rounded-full bg-olive px-5 py-2 text-sm font-medium text-ivory shadow-soft hover:opacity-90 disabled:opacity-60"
                >
                  {NEXT_LABEL[selected.status] ?? "Avançar"} →
                </button>
                <button
                  onClick={() => fail.mutate()}
                  className="rounded-full border border-wine/30 bg-wine/5 px-4 py-2 text-sm text-wine"
                >
                  Unsuccessful attempt
                </button>
              </div>
            )}

            <div>
              <h4 className="text-sm font-semibold text-foreground">Cadeia de custódia</h4>
              <div className="mt-2 space-y-1.5">
                {(events.data ?? []).map((e: any) => (
                  <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/70 bg-white/45 px-3 py-2 text-xs">
                    <span className="font-medium text-foreground">
                      {FLOW.find((f) => f.key === e.status)?.label ?? (e.status === "failed" ? "Sem sucesso" : e.status)}
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(e.performed_at).toLocaleString("pt-BR")}
                      {e.latitude ? ` · GPS ${e.latitude.toFixed(4)}, ${e.longitude.toFixed(4)}` : ""}
                    </span>
                    {e.notes && <span className="w-full text-muted-foreground">{e.notes}</span>}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ) : (
          <EmptyState title="No collection selected" hint="Schedule a home collection to track the route and custody." />
        )}
      </div>
    </div>
  );
}
