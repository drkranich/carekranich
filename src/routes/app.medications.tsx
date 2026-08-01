import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, CircleSlash, Pill as PillIcon, Plus, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Card, EmptyState, PageHeader, Pill, Stat } from "@/components/app/primitives";
import { GlassSelect } from "@/components/app/GlassSelect";
import { GlassDatePicker } from "@/components/app/GlassDatePicker";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { downloadPdf } from "@/lib/pdf";

export const Route = createFileRoute("/app/medications")({ component: Medications });

const ROUTES = [
  { value: "oral", label: "Oral" },
  { value: "sublingual", label: "Sublingual" },
  { value: "topica", label: "Tópica" },
  { value: "injetavel", label: "Injetável" },
  { value: "inalatoria", label: "Inalatória" },
  { value: "ocular", label: "Ocular" },
  { value: "outra", label: "Outra" },
];

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function Medications() {
  const { profile, user, hasAnyRole, isSuperAdmin } = useAuth();
  const qc = useQueryClient();
  const canAdminister = hasAnyRole(["caregiver", "nurse", "doctor", "clinic_admin", "super_admin"]);
  const canPrescribe = hasAnyRole(["nurse", "doctor", "clinic_admin", "super_admin"]);
  const [residentId, setResidentId] = useState("");
  const [day, setDay] = useState(todayKey());
  const [form, setForm] = useState({ name: "", dose: "", route: "oral", frequency: "", times: "08:00, 20:00", instructions: "", start_date: "", end_date: "" });
  if (!canAdminister) return <Navigate to="/app" />;

  const residents = useQuery({
    queryKey: ["med-residents", profile?.tenant_id],
    enabled: !!profile?.tenant_id || isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("residents").select("id, tenant_id, full_name, preferred_name").order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const medications = useQuery({
    queryKey: ["medications", residentId],
    enabled: !!residentId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("medications")
        .select("*")
        .eq("resident_id", residentId)
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const administrations = useQuery({
    queryKey: ["med-administrations", residentId, day],
    enabled: !!residentId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("medication_administrations")
        .select("*")
        .eq("resident_id", residentId)
        .eq("scheduled_date", day)
        .order("administered_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const resident = (residents.data ?? []).find((item: any) => item.id === residentId) ?? null;
  const residentLabel = resident ? resident.preferred_name || resident.full_name : "";

  const prescribe = useMutation({
    mutationFn: async () => {
      if (!resident) throw new Error("Select a resident.");
      if (!form.name.trim()) throw new Error("Informe o medicamento.");
      const times = form.times.split(",").map((t) => t.trim()).filter((t) => /^\d{1,2}:\d{2}$/.test(t));
      const { error } = await (supabase as any).from("medications").insert({
        tenant_id: resident.tenant_id,
        resident_id: resident.id,
        name: form.name.trim(),
        dose: form.dose.trim() || null,
        route: form.route,
        frequency: form.frequency.trim() || null,
        schedule_times: times,
        instructions: form.instructions.trim() || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        prescribed_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Medicamento prescrito");
      setForm({ name: "", dose: "", route: "oral", frequency: "", times: "08:00, 20:00", instructions: "", start_date: "", end_date: "" });
      qc.invalidateQueries({ queryKey: ["medications", residentId] });
    },
    onError: (error: any) => toast.error(error.message ?? "Não foi possível prescrever"),
  });

  const deactivate = async (id: string) => {
    const { error } = await (supabase as any).from("medications").update({ active: false, end_date: todayKey() }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Medicamento suspenso");
      qc.invalidateQueries({ queryKey: ["medications", residentId] });
    }
  };

  const register = useMutation({
    mutationFn: async ({ medication, time, status }: { medication: any; time: string | null; status: string }) => {
      const { error } = await (supabase as any).from("medication_administrations").insert({
        tenant_id: medication.tenant_id,
        medication_id: medication.id,
        resident_id: medication.resident_id,
        scheduled_time: time,
        scheduled_date: day,
        status,
        administered_by: user?.id,
      });
      if (error) throw error;
      return status;
    },
    onSuccess: (status) => {
      toast.success(status === "given" ? "Administração registrada" : status === "refused" ? "Recusa registrada" : "Dose pulada registrada");
      qc.invalidateQueries({ queryKey: ["med-administrations", residentId, day] });
    },
    onError: (error: any) => toast.error(error.message ?? "Não foi possível registrar"),
  });

  const recordFor = (medicationId: string, time: string) =>
    (administrations.data ?? []).find((item: any) => item.medication_id === medicationId && item.scheduled_time === time) ?? null;

  const isLate = (time: string) => {
    if (day !== todayKey()) return day < todayKey();
    const [h, m] = time.split(":").map(Number);
    const slot = new Date();
    slot.setHours(h, m + 30, 0, 0);
    return Date.now() > slot.getTime();
  };

  const exportMap = () => {
    if (!resident) return;
    const lines = (medications.data ?? []).flatMap((med: any) => [
      `${med.name} ${med.dose ?? ""} (${ROUTES.find((r) => r.value === med.route)?.label ?? med.route})${med.frequency ? ` — ${med.frequency}` : ""}`,
      ...((med.schedule_times ?? []) as string[]).map((time) => {
        const record = recordFor(med.id, time);
        return `  ${time} — ${record ? (record.status === "given" ? `administrado às ${new Date(record.administered_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : record.status === "refused" ? "recusado" : "pulado") : "pendente"}`;
      }),
      "",
    ]);
    downloadPdf(`emar-${residentLabel}-${day}`, `Mapa de medicação — ${residentLabel} (${new Date(day + "T12:00:00").toLocaleDateString("pt-BR")})`, [
      ...lines,
      `Gerado em ${new Date().toLocaleString("pt-BR")} - Care Kranich`,
    ]);
  };

  const totalSlots = (medications.data ?? []).reduce((total: number, med: any) => total + (med.schedule_times?.length ?? 0), 0);
  const doneSlots = (medications.data ?? []).reduce(
    (total: number, med: any) => total + ((med.schedule_times ?? []) as string[]).filter((time) => recordFor(med.id, time)).length,
    0,
  );

  return (
    <>
      <PageHeader
        title="Gestão medicamentosa (eMAR)"
        subtitle="Prescrições ativas, mapa de horários do dia and confirmação de administração dose a dose."
        action={
          <div className="flex items-center gap-2">
            <Pill tone="olive">eMAR</Pill>
            {resident && (
              <button onClick={exportMap} className="rounded-full border border-moss/40 bg-white/60 px-4 py-2 text-xs font-medium hover:bg-moss/15">
                Mapa em PDF
              </button>
            )}
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Active medications" value={residentId ? medications.data?.length ?? "-" : "—"} sub={residentLabel || "Select a resident"} tone="olive" />
        <Stat label="Doses do dia" value={residentId ? `${doneSlots}/${totalSlots}` : "—"} sub="Registradas / previstas" tone={doneSlots === totalSlots && totalSlots > 0 ? "moss" : "gold"} />
        <Stat label="Records today" value={residentId ? administrations.data?.length ?? "-" : "—"} sub={new Date(day + "T12:00:00").toLocaleDateString("pt-BR")} tone="moss" />
      </div>

      <Card className="mt-6">
        <div className="flex flex-wrap items-center gap-3">
          <GlassSelect
            value={residentId}
            onChange={setResidentId}
            placeholder="Select resident"
            className="min-w-64"
            options={(residents.data ?? []).map((item: any) => ({ value: item.id, label: item.preferred_name || item.full_name }))}
          />
          <GlassDatePicker value={day} onChange={setDay} />
        </div>
      </Card>

      {!resident ? (
        <div className="mt-6"><EmptyState title="Choose a resident" hint="O mapa de medicação é individual and registrado dose a dose." /></div>
      ) : (
        <>
          {canPrescribe && (
            <Card className="mt-6">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-olive" />
                <h2 className="text-lg font-semibold text-foreground">Prescribe medicamento</h2>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Medicamento *" className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm xl:col-span-2" />
                <input value={form.dose} onChange={(e) => setForm({ ...form, dose: e.target.value })} placeholder="Dose (ex.: 50mg)" className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
                <GlassSelect value={form.route} onChange={(value) => setForm({ ...form, route: value })} options={ROUTES} />
                <input value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} placeholder="Frequência (ex.: 12/12h)" className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
                <input value={form.times} onChange={(e) => setForm({ ...form, times: e.target.value })} placeholder="Horários (08:00, 20:00)" className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
                <input value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} placeholder="Instruções (ex.: com alimentos)" className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm xl:col-span-3" />
                <div className="flex items-center gap-2 xl:col-span-2">
                  <span className="text-xs text-muted-foreground">Início</span>
                  <GlassDatePicker value={form.start_date} onChange={(value) => setForm({ ...form, start_date: value })} />
                  <span className="text-xs text-muted-foreground">Fim</span>
                  <GlassDatePicker value={form.end_date} onChange={(value) => setForm({ ...form, end_date: value })} />
                </div>
                <button onClick={() => prescribe.mutate()} disabled={prescribe.isPending || !form.name.trim()} className="rounded-xl bg-olive px-4 py-2 text-sm font-semibold text-ivory disabled:opacity-50">
                  {prescribe.isPending ? "Saving..." : "Prescribe"}
                </button>
              </div>
            </Card>
          )}

          <Card className="mt-6">
            <div className="flex items-center gap-2">
              <PillIcon className="h-4 w-4 text-olive" />
              <h2 className="text-lg font-semibold text-foreground">Mapa de medicação — {residentLabel}</h2>
            </div>
            {(medications.data ?? []).length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No active medications for this resident.</p>
            ) : (
              <div className="mt-4 space-y-4">
                {(medications.data ?? []).map((med: any) => (
                  <div key={med.id} className="rounded-2xl border border-white/70 bg-white/50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-foreground">
                          {med.name} {med.dose && <span className="font-normal text-muted-foreground">· {med.dose}</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {ROUTES.find((r) => r.value === med.route)?.label ?? med.route}
                          {med.frequency ? ` · ${med.frequency}` : ""}
                          {med.instructions ? ` · ${med.instructions}` : ""}
                        </p>
                      </div>
                      {canPrescribe && (
                        <button onClick={() => window.confirm(`Suspender ${med.name}?`) && deactivate(med.id)} className="rounded-full border border-wine/30 px-2.5 py-1 text-[11px] text-wine">
                          Suspender
                        </button>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {((med.schedule_times ?? []) as string[]).map((time) => {
                        const record = recordFor(med.id, time);
                        const late = !record && isLate(time);
                        return (
                          <div
                            key={time}
                            className={`rounded-2xl border px-3 py-2 ${
                              record
                                ? record.status === "given"
                                  ? "border-moss/40 bg-moss/10"
                                  : "border-wine/30 bg-wine/5"
                                : late
                                  ? "border-wine/40 bg-wine/10"
                                  : "border-white/70 bg-white/60"
                            }`}
                          >
                            <p className="text-sm font-semibold text-foreground">
                              {time}
                              {late && !record && <span className="ml-1 text-[10px] font-bold uppercase text-wine">atrasada</span>}
                            </p>
                            {record ? (
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                {record.status === "given" ? `✓ ${new Date(record.administered_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : record.status === "refused" ? "recusado" : "pulado"}
                              </p>
                            ) : (
                              <div className="mt-1.5 flex gap-1">
                                <button title="Administrado" onClick={() => register.mutate({ medication: med, time, status: "given" })} className="rounded-full bg-moss p-1.5 text-ivory hover:opacity-90">
                                  <Check className="h-3 w-3" />
                                </button>
                                <button title="Recusado" onClick={() => register.mutate({ medication: med, time, status: "refused" })} className="rounded-full border border-wine/40 bg-white/70 p-1.5 text-wine">
                                  <XCircle className="h-3 w-3" />
                                </button>
                                <button title="Pular dose" onClick={() => register.mutate({ medication: med, time, status: "skipped" })} className="rounded-full border border-border bg-white/70 p-1.5 text-muted-foreground">
                                  <CircleSlash className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {(med.schedule_times ?? []).length === 0 && <p className="text-xs text-muted-foreground">Sem horários definidos.</p>}
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
