import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2, Clock, LogIn, LogOut, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Card, EmptyState, PageHeader, Pill, Stat } from "@/components/app/primitives";
import { GlassSelect } from "@/components/app/GlassSelect";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/app/caregiver")({ component: CaregiverApp });

function getPosition(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  });
}

function elapsed(from: string) {
  const ms = Date.now() - new Date(from).getTime();
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  return `${hours}h ${String(minutes).padStart(2, "0")}min`;
}

function CaregiverApp() {
  const { profile, user, hasAnyRole, isSuperAdmin } = useAuth();
  const qc = useQueryClient();
  const canUse = hasAnyRole(["caregiver", "nurse", "doctor", "clinic_admin", "super_admin"]);
  const [residentId, setResidentId] = useState("");
  const [notes, setNotes] = useState("");
  if (!canUse) return <Navigate to="/app" />;

  const residents = useQuery({
    queryKey: ["caregiver-residents", profile?.tenant_id],
    enabled: !!profile?.tenant_id || isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("residents")
        .select("id, tenant_id, full_name, preferred_name")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const shifts = useQuery({
    queryKey: ["caregiver-shifts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("caregiver_shifts")
        .select("*")
        .eq("caregiver_id", user!.id)
        .order("started_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });

  const tasks = useQuery({
    queryKey: ["caregiver-tasks-today", profile?.tenant_id, user?.id],
    enabled: !!profile?.tenant_id || isSuperAdmin,
    queryFn: async () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      const { data, error } = await (supabase as any)
        .from("care_tasks")
        .select("id,title,status,priority,due_at,resident_id")
        .in("status", ["pending"])
        .gte("due_at", start.toISOString())
        .lte("due_at", end.toISOString())
        .order("due_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const activeShift = (shifts.data ?? []).find((shift: any) => !shift.ended_at) ?? null;

  const checkIn = useMutation({
    mutationFn: async () => {
      const selectedResident = (residents.data ?? []).find((item: any) => item.id === residentId) as any;
      const tenantId =
        profile?.tenant_id ??
        selectedResident?.tenant_id ??
        ((residents.data ?? [])[0] as any)?.tenant_id ??
        null;
      if (!user || !tenantId) {
        throw new Error("Selecione um residente do plantão para registrar o check-in.");
      }
      const position = await getPosition();
      const { error } = await (supabase as any).from("caregiver_shifts").insert({
        tenant_id: tenantId,
        caregiver_id: user.id,
        resident_id: residentId || null,
        checkin_latitude: position?.coords.latitude ?? null,
        checkin_longitude: position?.coords.longitude ?? null,
      });
      if (error) throw error;
      return !!position;
    },
    onSuccess: (hasGps) => {
      toast.success(hasGps ? "Check-in registrado com localização" : "Check-in registrado (sem GPS)");
      qc.invalidateQueries({ queryKey: ["caregiver-shifts", user?.id] });
    },
    onError: (error: any) => toast.error(error.message ?? "Não foi possível fazer check-in"),
  });

  const checkOut = useMutation({
    mutationFn: async () => {
      if (!activeShift) throw new Error("Nenhum plantão ativo.");
      const position = await getPosition();
      const { error } = await (supabase as any)
        .from("caregiver_shifts")
        .update({
          ended_at: new Date().toISOString(),
          checkout_latitude: position?.coords.latitude ?? null,
          checkout_longitude: position?.coords.longitude ?? null,
          notes: notes.trim() || null,
        })
        .eq("id", activeShift.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Check-out registrado — bom descanso!");
      setNotes("");
      qc.invalidateQueries({ queryKey: ["caregiver-shifts", user?.id] });
    },
    onError: (error: any) => toast.error(error.message ?? "Não foi possível fazer check-out"),
  });

  const completeTask = async (taskId: string) => {
    const { error } = await (supabase as any)
      .from("care_tasks")
      .update({ status: "done", completed_at: new Date().toISOString(), completed_by: user?.id })
      .eq("id", taskId);
    if (error) toast.error(error.message);
    else {
      toast.success("Tarefa concluída");
      qc.invalidateQueries({ queryKey: ["caregiver-tasks-today", profile?.tenant_id, user?.id] });
    }
  };

  const residentName = (id: string | null) => {
    const resident = (residents.data ?? []).find((item: any) => item.id === id);
    return resident ? resident.preferred_name || resident.full_name : null;
  };

  return (
    <>
      <PageHeader
        title="App do cuidador"
        subtitle="Plantões com check-in/check-out geolocalizado, tarefas do dia e registro rápido — pensado para o celular."
        action={<Pill tone={activeShift ? "moss" : "muted"}>{activeShift ? "Em plantão" : "Fora de plantão"}</Pill>}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Stat
          label="Plantão atual"
          value={activeShift ? elapsed(activeShift.started_at) : "—"}
          sub={activeShift ? `Início ${new Date(activeShift.started_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "Faça check-in para começar"}
          tone={activeShift ? "moss" : "olive"}
        />
        <Stat label="Tarefas de hoje" value={tasks.data?.length ?? "-"} sub="Pendentes com vencimento hoje" tone="gold" />
        <Stat label="Plantões registrados" value={shifts.data?.length ?? "-"} sub="Últimos 30" tone="olive" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-olive/10 text-olive">
              <Clock className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Plantão</h2>
              <p className="text-xs text-muted-foreground">Check-in e check-out com localização e observações.</p>
            </div>
          </div>

          {activeShift ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-moss/30 bg-moss/5 p-4">
                <p className="text-sm font-medium text-foreground">
                  Em plantão há {elapsed(activeShift.started_at)}
                  {activeShift.resident_id && residentName(activeShift.resident_id) ? ` · ${residentName(activeShift.resident_id)}` : ""}
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {activeShift.checkin_latitude
                    ? `Check-in em ${activeShift.checkin_latitude.toFixed(5)}, ${activeShift.checkin_longitude.toFixed(5)}`
                    : "Check-in sem GPS"}
                </p>
              </div>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder="Observações do plantão (opcional): intercorrências, entregas, recados..."
                className="w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm"
              />
              <button
                onClick={() => checkOut.mutate()}
                disabled={checkOut.isPending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-wine px-4 py-3 text-sm font-semibold text-ivory disabled:opacity-50"
              >
                <LogOut className="h-4 w-4" />
                {checkOut.isPending ? "Registrando..." : "Fazer check-out"}
              </button>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <GlassSelect
                value={residentId}
                onChange={setResidentId}
                placeholder="Residente do plantão (opcional)"
                options={[
                  { value: "", label: "Sem residente específico" },
                  ...(residents.data ?? []).map((resident: any) => ({
                    value: resident.id,
                    label: resident.preferred_name || resident.full_name,
                  })),
                ]}
              />
              <button
                onClick={() => checkIn.mutate()}
                disabled={checkIn.isPending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-olive px-4 py-3 text-sm font-semibold text-ivory disabled:opacity-50"
              >
                <LogIn className="h-4 w-4" />
                {checkIn.isPending ? "Registrando..." : "Fazer check-in"}
              </button>
              <p className="text-xs leading-5 text-muted-foreground">
                O navegador vai pedir sua localização para registrar onde o plantão começou. Se negar, o check-in é registrado sem GPS.
              </p>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-xl font-semibold text-foreground">Tarefas de hoje</h2>
          {(tasks.data ?? []).length === 0 ? (
            <div className="mt-4"><EmptyState title="Nenhuma tarefa pendente hoje" hint="As tarefas do plano de cuidado com vencimento hoje aparecem aqui." /></div>
          ) : (
            <div className="mt-4 space-y-2">
              {(tasks.data ?? []).map((task: any) => (
                <div key={task.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/50 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{task.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {task.due_at ? new Date(task.due_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "Sem hora"}
                      {residentName(task.resident_id) ? ` · ${residentName(task.resident_id)}` : ""}
                      {task.priority === "high" ? " · prioridade alta" : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => completeTask(task.id)}
                    className="flex-none rounded-full bg-olive px-3 py-1.5 text-xs font-semibold text-ivory hover:opacity-90"
                  >
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Concluir
                    </span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="text-xl font-semibold text-foreground">Histórico de plantões</h2>
        {(shifts.data ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Nenhum plantão registrado ainda.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {(shifts.data ?? []).map((shift: any) => (
              <div key={shift.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/70 bg-white/50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {new Date(shift.started_at).toLocaleDateString("pt-BR")} ·{" "}
                    {new Date(shift.started_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    {shift.ended_at ? ` → ${new Date(shift.ended_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : " (em andamento)"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {residentName(shift.resident_id) ?? "Sem residente"}
                    {shift.notes ? ` · ${shift.notes}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {shift.checkin_latitude && <Pill tone="olive">GPS in</Pill>}
                  {shift.checkout_latitude && <Pill tone="moss">GPS out</Pill>}
                  <Pill tone={shift.ended_at ? "muted" : "moss"}>{shift.ended_at ? "encerrado" : "ativo"}</Pill>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
