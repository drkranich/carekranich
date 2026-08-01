import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileDown, Pencil, Plus, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Card, EmptyState, PageHeader, Pill, Stat } from "@/components/app/primitives";
import { GlassSelect } from "@/components/app/GlassSelect";
import { GlassDatePicker } from "@/components/app/GlassDatePicker";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { downloadPdf } from "@/lib/pdf";

export const Route = createFileRoute("/app/equipment")({ component: Equipment });

const STATUS_LABEL: Record<string, string> = {
  operational: "Operacional",
  maintenance: "Em manutenção",
  inactive: "Inativo",
};

const KIND_LABEL: Record<string, string> = {
  preventiva: "Preventiva",
  corretiva: "Corretiva",
  calibracao: "Calibração",
};

const glassInput =
  "w-full rounded-2xl border border-white/70 bg-white/55 px-4 py-2.5 text-sm shadow-soft backdrop-blur-xl outline-none focus:border-olive/40";

function brl(cents: number | null | undefined) {
  return ((cents ?? 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const EMPTY = {
  name: "",
  serial_number: "",
  manufacturer: "",
  model: "",
  unit_id: "",
  room: "",
  warranty_until: "",
  next_maintenance: "",
  notes: "",
};

function Equipment() {
  const qc = useQueryClient();
  const { profile, user, isSuperAdmin } = useAuth();
  const tenantId = profile?.tenant_id ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [maint, setMaint] = useState({ kind: "preventiva", scheduled_for: "", provider: "", cost: "", description: "" });

  const tenantsList = useQuery({
    queryKey: ["eq-tenants", isSuperAdmin],
    enabled: isSuperAdmin && !tenantId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("tenants").select("id,name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const effTenant = tenantId ?? ((tenantsList.data ?? [])[0] as any)?.id ?? null;

  const units = useQuery({
    queryKey: ["eq-units", tenantId],
    enabled: !!tenantId || isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("clinic_units")
        .select("id,name")
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const equipment = useQuery({
    queryKey: ["equipment", tenantId],
    enabled: !!tenantId || isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("equipment")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(150);
      if (error) throw error;
      return data ?? [];
    },
  });

  const selected =
    (equipment.data ?? []).find((e: any) => e.id === selectedId) ?? (equipment.data ?? [])[0] ?? null;

  const maintenances = useQuery({
    queryKey: ["equipment-maint", selected?.id],
    enabled: !!selected,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("equipment_maintenance")
        .select("*")
        .eq("equipment_id", selected!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const unitName = (id: string | null) => (units.data ?? []).find((u: any) => u.id === id)?.name ?? "Sem unidade";

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["equipment", tenantId] });
    qc.invalidateQueries({ queryKey: ["equipment-maint", selected?.id] });
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!effTenant) throw new Error("Nenhuma organização disponível.");
      if (form.name.trim().length < 2) throw new Error("Informe o nome do equipamento.");
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        serial_number: form.serial_number.trim() || null,
        manufacturer: form.manufacturer.trim() || null,
        model: form.model.trim() || null,
        unit_id: form.unit_id || null,
        room: form.room.trim() || null,
        warranty_until: form.warranty_until || null,
        next_maintenance: form.next_maintenance || null,
        notes: form.notes.trim() || null,
      };
      if (editingId) {
        const { error } = await (supabase as any).from("equipment").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        payload.tenant_id = effTenant;
        payload.created_by = user?.id ?? null;
        const { error } = await (supabase as any).from("equipment").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Equipamento atualizado" : "Equipamento cadastrado");
      setForm({ ...EMPTY });
      setOpen(false);
      setEditingId(null);
      refresh();
    },
    onError: (e: any) => toast.error(e.message ?? "Não foi possível salvar"),
  });

  const setStatus = async (eq: any, status: string) => {
    const { error } = await (supabase as any).from("equipment").update({ status }).eq("id", eq.id);
    if (error) return toast.error(error.message);
    if (status === "maintenance") {
      await (supabase as any).from("alerts").insert({
        tenant_id: eq.tenant_id,
        title: `Equipamento em manutenção — ${eq.name}`,
        description: `Agendas que dependem deste equipamento devem ser bloqueadas ou redistribuídas (${unitName(eq.unit_id)}).`,
        severity: "high",
        category: "equipment",
        status: "open",
        created_by: user?.id ?? null,
      });
      toast.success("Status atualizado — alerta de bloqueio de agenda criado");
    } else {
      toast.success(`Status: ${STATUS_LABEL[status]}`);
    }
    refresh();
  };

  const addMaintenance = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Selecione um equipamento.");
      const { error } = await (supabase as any).from("equipment_maintenance").insert({
        tenant_id: selected.tenant_id,
        equipment_id: selected.id,
        kind: maint.kind,
        scheduled_for: maint.scheduled_for || null,
        provider: maint.provider.trim() || null,
        cost_cents: maint.cost ? Math.round(Number(maint.cost.replace(",", ".")) * 100) : 0,
        description: maint.description.trim() || null,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
      if (maint.scheduled_for) {
        await (supabase as any).from("equipment").update({ next_maintenance: maint.scheduled_for }).eq("id", selected.id);
      }
    },
    onSuccess: () => {
      toast.success("Manutenção registrada");
      setMaint({ kind: "preventiva", scheduled_for: "", provider: "", cost: "", description: "" });
      refresh();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const completeMaintenance = async (m: any) => {
    const { error } = await (supabase as any)
      .from("equipment_maintenance")
      .update({ status: "done", performed_at: new Date().toISOString() })
      .eq("id", m.id);
    if (error) return toast.error(error.message);
    if (m.kind === "calibracao" && selected) {
      await (supabase as any)
        .from("equipment")
        .update({ last_calibration: new Date().toISOString().slice(0, 10) })
        .eq("id", selected.id);
    }
    toast.success("Manutenção concluída");
    refresh();
  };

  const startEdit = (eq: any) => {
    setEditingId(eq.id);
    setForm({
      name: eq.name,
      serial_number: eq.serial_number ?? "",
      manufacturer: eq.manufacturer ?? "",
      model: eq.model ?? "",
      unit_id: eq.unit_id ?? "",
      room: eq.room ?? "",
      warranty_until: eq.warranty_until ?? "",
      next_maintenance: eq.next_maintenance ?? "",
      notes: eq.notes ?? "",
    });
    setOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const exportPdf = (eq: any) => {
    const list = eq.id === selected?.id ? (maintenances.data ?? []) : [];
    downloadPdf(`equipamento-${eq.name}.pdf`, eq.name, [
      `Fabricante: ${eq.manufacturer ?? "-"}  Modelo: ${eq.model ?? "-"}`,
      `Número de série: ${eq.serial_number ?? "-"}`,
      `Unidade: ${unitName(eq.unit_id)}  Sala: ${eq.room ?? "-"}`,
      `Status: ${STATUS_LABEL[eq.status] ?? eq.status}`,
      `Garantia até: ${eq.warranty_until ? new Date(eq.warranty_until + "T00:00:00").toLocaleDateString("pt-BR") : "-"}`,
      `Última calibração: ${eq.last_calibration ? new Date(eq.last_calibration + "T00:00:00").toLocaleDateString("pt-BR") : "-"}`,
      `Próxima manutenção: ${eq.next_maintenance ? new Date(eq.next_maintenance + "T00:00:00").toLocaleDateString("pt-BR") : "-"}`,
      "",
      "Histórico de manutenções:",
      ...list.map(
        (m: any) =>
          `- ${KIND_LABEL[m.kind] ?? m.kind} · ${m.status === "done" ? "concluída" : "agendada"} · ${m.scheduled_for ? new Date(m.scheduled_for + "T00:00:00").toLocaleDateString("pt-BR") : "-"} · ${brl(m.cost_cents)}${m.provider ? ` · ${m.provider}` : ""}`,
      ),
    ]);
  };

  const stats = useMemo(() => {
    const all = equipment.data ?? [];
    const today = new Date().toISOString().slice(0, 10);
    return {
      total: all.length,
      operational: all.filter((e: any) => e.status === "operational").length,
      maintenance: all.filter((e: any) => e.status === "maintenance").length,
      overdue: all.filter((e: any) => e.next_maintenance && e.next_maintenance < today && e.status !== "inactive").length,
    };
  }, [equipment.data]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Equipamentos e manutenção"
        subtitle="Ativos médicos com série, garantia, calibração, manutenções preventivas/corretivas e impacto em agenda."
        action={
          <button
            onClick={() => {
              setEditingId(null);
              setForm({ ...EMPTY });
              setOpen(!open);
            }}
            className="inline-flex items-center gap-2 rounded-full bg-olive px-4 py-2 text-sm font-medium text-ivory shadow-soft hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Novo equipamento
          </button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Equipamentos" value={stats.total} sub="Cadastrados" tone="olive" />
        <Stat label="Operacionais" value={stats.operational} sub="Disponíveis para agenda" tone="moss" />
        <Stat label="Em manutenção" value={stats.maintenance} sub="Agendas impactadas" tone="wine" />
        <Stat label="Manutenção atrasada" value={stats.overdue} sub="Data prevista vencida" tone="terracotta" />
      </div>

      {open && (
        <Card className="space-y-3 p-6">
          <h3 className="text-sm font-semibold text-foreground">{editingId ? "Editar equipamento" : "Novo equipamento"}</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <input className={glassInput} placeholder="Nome (ex.: Ultrassom GE Logiq) *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className={glassInput} placeholder="Fabricante" value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} />
            <input className={glassInput} placeholder="Modelo" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
            <input className={glassInput} placeholder="Número de série" value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} />
            <GlassSelect
              value={form.unit_id}
              onChange={(v) => setForm({ ...form, unit_id: v })}
              placeholder="Unidade"
              options={[{ value: "", label: "Sem unidade" }, ...(units.data ?? []).map((u: any) => ({ value: u.id, label: u.name }))]}
            />
            <input className={glassInput} placeholder="Sala" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} />
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Garantia até</p>
              <GlassDatePicker value={form.warranty_until} onChange={(v) => setForm({ ...form, warranty_until: v })} />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Próxima manutenção</p>
              <GlassDatePicker value={form.next_maintenance} onChange={(v) => setForm({ ...form, next_maintenance: v })} />
            </div>
            <input className={glassInput} placeholder="Observações" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <button onClick={() => save.mutate()} disabled={save.isPending} className="rounded-full bg-olive px-5 py-2 text-sm font-medium text-ivory shadow-soft hover:opacity-90 disabled:opacity-60">
              {save.isPending ? "Salvando..." : editingId ? "Salvar alterações" : "Cadastrar"}
            </button>
            <button onClick={() => { setOpen(false); setEditingId(null); }} className="rounded-full border border-white/70 bg-white/55 px-5 py-2 text-sm backdrop-blur-xl">
              Cancelar
            </button>
          </div>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card className="space-y-2 p-5">
          <h3 className="text-sm font-semibold text-foreground">Ativos</h3>
          {(equipment.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">Nenhum equipamento ainda.</p>}
          {(equipment.data ?? []).map((eq: any) => (
            <button
              key={eq.id}
              onClick={() => setSelectedId(eq.id)}
              className={`block w-full rounded-2xl border px-4 py-3 text-left transition ${
                selected?.id === eq.id ? "border-olive/60 bg-olive/10" : "border-white/70 bg-white/50 hover:bg-white/75"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium text-foreground">{eq.name}</p>
                <Pill tone={eq.status === "operational" ? "moss" : eq.status === "maintenance" ? "wine" : "muted"}>
                  {STATUS_LABEL[eq.status] ?? eq.status}
                </Pill>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {unitName(eq.unit_id)}{eq.room ? ` · ${eq.room}` : ""}{eq.model ? ` · ${eq.model}` : ""}
              </p>
            </button>
          ))}
        </Card>

        {selected ? (
          <Card className="space-y-4 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{selected.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {selected.manufacturer ?? "-"} {selected.model ?? ""} · série {selected.serial_number ?? "-"} ·{" "}
                  {unitName(selected.unit_id)}{selected.room ? ` · ${selected.room}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => startEdit(selected)} className="inline-flex items-center gap-1 rounded-full border border-border bg-white/55 px-3 py-1.5 text-xs">
                  <Pencil className="h-3 w-3" /> Editar
                </button>
                <button onClick={() => exportPdf(selected)} className="inline-flex items-center gap-1 rounded-full border border-border bg-white/55 px-3 py-1.5 text-xs">
                  <FileDown className="h-3 w-3" /> Ficha PDF
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              {selected.warranty_until && (
                <Pill tone="olive">Garantia até {new Date(selected.warranty_until + "T00:00:00").toLocaleDateString("pt-BR")}</Pill>
              )}
              {selected.last_calibration && (
                <Pill tone="moss">Calibrado em {new Date(selected.last_calibration + "T00:00:00").toLocaleDateString("pt-BR")}</Pill>
              )}
              {selected.next_maintenance && (
                <Pill tone={selected.next_maintenance < new Date().toISOString().slice(0, 10) ? "wine" : "gold"}>
                  Próxima manutenção {new Date(selected.next_maintenance + "T00:00:00").toLocaleDateString("pt-BR")}
                </Pill>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {selected.status !== "operational" && (
                <button onClick={() => setStatus(selected, "operational")} className="rounded-full bg-moss px-4 py-2 text-xs font-medium text-ivory">
                  Marcar operacional
                </button>
              )}
              {selected.status !== "maintenance" && (
                <button onClick={() => setStatus(selected, "maintenance")} className="rounded-full bg-wine px-4 py-2 text-xs font-medium text-ivory">
                  Colocar em manutenção
                </button>
              )}
              {selected.status !== "inactive" && (
                <button onClick={() => setStatus(selected, "inactive")} className="rounded-full border border-border bg-white/55 px-4 py-2 text-xs">
                  Desativar
                </button>
              )}
            </div>

            <div className="space-y-3 rounded-2xl border border-white/70 bg-white/45 p-4">
              <p className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Wrench className="h-3.5 w-3.5" /> Registrar manutenção / calibração
              </p>
              <div className="grid gap-2 md:grid-cols-4">
                <GlassSelect
                  value={maint.kind}
                  onChange={(v) => setMaint({ ...maint, kind: v })}
                  options={Object.entries(KIND_LABEL).map(([value, label]) => ({ value, label }))}
                />
                <GlassDatePicker value={maint.scheduled_for} onChange={(v) => setMaint({ ...maint, scheduled_for: v })} />
                <input className={glassInput} placeholder="Prestador" value={maint.provider} onChange={(e) => setMaint({ ...maint, provider: e.target.value })} />
                <input className={glassInput} placeholder="Custo (R$)" value={maint.cost} onChange={(e) => setMaint({ ...maint, cost: e.target.value })} />
              </div>
              <input className={glassInput} placeholder="Descrição (peças, falha, laudo técnico...)" value={maint.description} onChange={(e) => setMaint({ ...maint, description: e.target.value })} />
              <button onClick={() => addMaintenance.mutate()} disabled={addMaintenance.isPending} className="rounded-full bg-olive px-4 py-1.5 text-xs font-medium text-ivory disabled:opacity-60">
                Registrar
              </button>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-foreground">Histórico de manutenções</h4>
              <div className="mt-2 space-y-1.5">
                {(maintenances.data ?? []).length === 0 && (
                  <p className="text-xs text-muted-foreground">Nenhuma manutenção registrada.</p>
                )}
                {(maintenances.data ?? []).map((m: any) => (
                  <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/70 bg-white/45 px-3 py-2 text-xs">
                    <span className="font-medium text-foreground">
                      {KIND_LABEL[m.kind] ?? m.kind}
                      {m.provider ? ` · ${m.provider}` : ""} · {brl(m.cost_cents)}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {m.scheduled_for ? new Date(m.scheduled_for + "T00:00:00").toLocaleDateString("pt-BR") : "-"}
                      </span>
                      {m.status === "done" ? (
                        <Pill tone="moss">concluída</Pill>
                      ) : (
                        <button onClick={() => completeMaintenance(m)} className="rounded-full bg-olive px-3 py-1 font-medium text-ivory">
                          Concluir
                        </button>
                      )}
                    </span>
                    {m.description && <span className="w-full text-muted-foreground">{m.description}</span>}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ) : (
          <EmptyState title="Nenhum equipamento selecionado" hint="Cadastre um ativo médico para controlar manutenções e calibração." />
        )}
      </div>
    </div>
  );
}
