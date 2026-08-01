import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarClock, DoorOpen, ListPlus, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Card, EmptyState, PageHeader, Pill, Stat } from "@/components/app/primitives";
import { GlassSelect } from "@/components/app/GlassSelect";
import { GlassDatePicker, GlassDateTimePicker } from "@/components/app/GlassDatePicker";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, ROLE_LABELS, type AppRole } from "@/hooks/use-auth";

export const Route = createFileRoute("/app/schedule")({ component: Schedule });

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Scheduled",
  confirmed: "Confirmed",
  done: "Served",
  no_show: "No-show",
  canceled: "Canceled",
};

const KIND_LABELS: Record<string, string> = {
  consulta: "Consultation",
  encaixe: "Fit-in",
  block: "Block",
  vacation: "Vacation",
};

const statusTone = (status: string) =>
  status === "done" ? "moss" : status === "confirmed" ? "olive" : status === "canceled" || status === "no_show" ? "wine" : "gold";

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function Schedule() {
  const { profile, user, hasAnyRole, isSuperAdmin } = useAuth();
  const qc = useQueryClient();
  const canManage = hasAnyRole(["caregiver", "nurse", "doctor", "clinic_admin", "super_admin"]);
  const [day, setDay] = useState(todayKey());
  const [professionalFilter, setProfessionalFilter] = useState("all");
  const [form, setForm] = useState({ professional_id: "", room_id: "", patient_name: "", kind: "consulta", starts_at: "", duration: "30", notes: "" });
  const [newRoom, setNewRoom] = useState("");
  const [wait, setWait] = useState({ patient_name: "", phone: "", notes: "" });
  if (!canManage) return <Navigate to="/app" />;

  const tenantsList = useQuery({
    queryKey: ["schedule-tenants", isSuperAdmin],
    enabled: isSuperAdmin && !profile?.tenant_id,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("tenants").select("id,name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const effTenant = profile?.tenant_id ?? ((tenantsList.data ?? [])[0] as any)?.id ?? null;

  const team = useQuery({
    queryKey: ["schedule-team", profile?.tenant_id],
    enabled: !!profile?.tenant_id || isSuperAdmin,
    queryFn: async () => {
      const db = supabase as any;
      const [{ data: roles, error: e1 }, { data: profiles, error: e2 }] = await Promise.all([
        db.from("user_roles").select("user_id, role").in("role", ["doctor", "nurse", "caregiver", "clinic_admin"]),
        db.from("profiles").select("id, full_name, preferred_name"),
      ]);
      if (e1 || e2) throw new Error(e1?.message ?? e2?.message);
      const nameOf = new Map((profiles ?? []).map((p: any) => [p.id, p.preferred_name || p.full_name || "Professional"]));
      const seen = new Set<string>();
      return (roles ?? [])
        .filter((r: any) => (seen.has(r.user_id) ? false : (seen.add(r.user_id), true)))
        .map((r: any) => ({ id: r.user_id, name: nameOf.get(r.user_id) ?? "Professional", role: r.role as AppRole }));
    },
  });

  const rooms = useQuery({
    queryKey: ["clinic-rooms", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("clinic_rooms").select("*").eq("active", true).order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const appointments = useQuery({
    queryKey: ["appointments", day, profile?.tenant_id],
    queryFn: async () => {
      const start = new Date(`${day}T00:00:00`).toISOString();
      const end = new Date(`${day}T23:59:59.999`).toISOString();
      const { data, error } = await (supabase as any)
        .from("appointments")
        .select("*")
        .gte("starts_at", start)
        .lte("starts_at", end)
        .order("starts_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const waitlist = useQuery({
    queryKey: ["schedule-waitlist", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("schedule_waitlist")
        .select("*")
        .in("status", ["waiting", "called"])
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const createAppointment = useMutation({
    mutationFn: async () => {
      if (!form.professional_id) throw new Error("Choose the professional.");
      if (!form.starts_at) throw new Error("Choose date and time.");
      if (form.kind !== "block" && form.kind !== "vacation" && !form.patient_name.trim()) throw new Error("Enter the patient.");
      const starts = new Date(form.starts_at);
      const ends = new Date(starts.getTime() + Number(form.duration || 30) * 60000);
      const { error } = await (supabase as any).from("appointments").insert({
        tenant_id: effTenant,
        professional_id: form.professional_id,
        room_id: form.room_id || null,
        patient_name: form.patient_name.trim() || null,
        kind: form.kind,
        starts_at: starts.toISOString(),
        ends_at: ends.toISOString(),
        notes: form.notes.trim() || null,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Appointment created");
      setForm({ professional_id: "", room_id: "", patient_name: "", kind: "consulta", starts_at: "", duration: "30", notes: "" });
      qc.invalidateQueries({ queryKey: ["appointments", day, profile?.tenant_id] });
    },
    onError: (error: any) => toast.error(error.message ?? "Could not schedule"),
  });

  const setStatus = async (id: string, status: string) => {
    const { error } = await (supabase as any).from("appointments").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["appointments", day, profile?.tenant_id] });
  };

  const addRoom = async () => {
    if (!newRoom.trim()) return;
    if (!effTenant) { toast.error("Select the organization before creating a room."); return; }
    const { error } = await (supabase as any).from("clinic_rooms").insert({ tenant_id: effTenant, name: newRoom.trim() });
    if (error) toast.error(error.message);
    else {
      setNewRoom("");
      qc.invalidateQueries({ queryKey: ["clinic-rooms", profile?.tenant_id] });
    }
  };

  const addWaitlist = async () => {
    if (!wait.patient_name.trim()) return toast.error("Enter the patient name.");
    const { error } = await (supabase as any).from("schedule_waitlist").insert({
      tenant_id: effTenant,
      patient_name: wait.patient_name.trim(),
      phone: wait.phone.trim() || null,
      notes: wait.notes.trim() || null,
      created_by: user?.id,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Added to waitlist");
      setWait({ patient_name: "", phone: "", notes: "" });
      qc.invalidateQueries({ queryKey: ["schedule-waitlist", profile?.tenant_id] });
    }
  };

  const setWaitStatus = async (id: string, status: string, patientName?: string) => {
    const { error } = await (supabase as any).from("schedule_waitlist").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    if (status === "scheduled" && patientName) {
      setForm((current) => ({ ...current, patient_name: patientName, kind: "encaixe" }));
      toast.success("Fill the fit-in time in the form above");
    }
    qc.invalidateQueries({ queryKey: ["schedule-waitlist", profile?.tenant_id] });
  };

  const professionals = team.data ?? [];
  const visibleProfessionals =
    professionalFilter === "all" ? professionals : professionals.filter((p: any) => p.id === professionalFilter);
  const apptsFor = (professionalId: string) =>
    (appointments.data ?? []).filter((a: any) => a.professional_id === professionalId);
  const roomName = (id: string | null) => (rooms.data ?? []).find((r: any) => r.id === id)?.name ?? null;

  return (
    <>
      <PageHeader
        title="Smart scheduling"
        subtitle="Multiple professionals, rooms, fit-ins, blocks and waitlist - in real time."
        action={<Pill tone="olive">Clinical module</Pill>}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Appointments today" value={appointments.data?.length ?? "-"} sub={new Date(`${day}T12:00:00`).toLocaleDateString("en-US")} tone="olive" />
        <Stat label="Professionals" value={professionals.length} sub="With active schedule" tone="moss" />
        <Stat label="Rooms" value={rooms.data?.length ?? "-"} sub="Registered" tone="gold" />
        <Stat label="Waitlist" value={waitlist.data?.length ?? "-"} sub="Waiting for fit-in" tone="wine" />
      </div>

      <Card className="mt-6">
        <div className="flex flex-wrap items-center gap-2">
          <GlassDatePicker value={day} onChange={setDay} />
          <GlassSelect
            value={professionalFilter}
            onChange={setProfessionalFilter}
            className="w-56"
            options={[{ value: "all", label: "All professionals" }, ...professionals.map((p: any) => ({ value: p.id, label: p.name }))]}
          />
          <div className="ml-auto flex items-center gap-2">
            <input
              value={newRoom}
              onChange={(e) => setNewRoom(e.target.value)}
              placeholder="New room (e.g. Office 2)"
              className="rounded-full border border-white/70 bg-white/55 px-4 py-1.5 text-xs shadow-soft backdrop-blur-xl outline-none"
            />
            <button onClick={addRoom} className="rounded-full border border-olive/30 bg-white/60 px-3 py-1.5 text-xs text-olive hover:bg-olive hover:text-ivory">
              <span className="inline-flex items-center gap-1"><DoorOpen className="h-3.5 w-3.5" /> Add room</span>
            </button>
          </div>
        </div>
      </Card>

      <Card className="mt-4">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-olive" />
          <h2 className="text-lg font-semibold text-foreground">New appointment</h2>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <GlassSelect
            value={form.professional_id}
            onChange={(value) => setForm({ ...form, professional_id: value })}
            placeholder="Professional *"
            options={professionals.map((p: any) => ({ value: p.id, label: `${p.name} (${ROLE_LABELS[p.role] ?? p.role})` }))}
          />
          <GlassSelect
            value={form.room_id}
            onChange={(value) => setForm({ ...form, room_id: value })}
            placeholder="Room"
            options={[{ value: "", label: "No room" }, ...(rooms.data ?? []).map((r: any) => ({ value: r.id, label: r.name }))]}
          />
          <GlassSelect
            value={form.kind}
            onChange={(value) => setForm({ ...form, kind: value })}
            options={Object.entries(KIND_LABELS).map(([value, label]) => ({ value, label }))}
          />
          <input
            value={form.patient_name}
            onChange={(e) => setForm({ ...form, patient_name: e.target.value })}
            placeholder={form.kind === "block" || form.kind === "vacation" ? "Reason (optional)" : "Patient *"}
            className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm"
          />
          <GlassDateTimePicker value={form.starts_at} onChange={(value) => setForm({ ...form, starts_at: value })} />
          <div className="flex items-center gap-2">
            <input
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: e.target.value.replace(/\D/g, "") })}
              placeholder="30"
              className="w-16 rounded-xl border border-border bg-ivory px-3 py-2 text-center text-sm"
            />
            <span className="text-xs text-muted-foreground">min</span>
            <button
              onClick={() => createAppointment.mutate()}
              disabled={createAppointment.isPending}
              className="ml-auto rounded-full bg-olive px-4 py-2 text-xs font-semibold text-ivory disabled:opacity-50"
            >
              {createAppointment.isPending ? "Scheduling..." : "Schedule"}
            </button>
          </div>
        </div>
      </Card>

      <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {visibleProfessionals.map((professional: any) => {
          const list = apptsFor(professional.id);
          return (
            <Card key={professional.id}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-olive/10 text-olive"><UserRound className="h-4 w-4" /></span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{professional.name}</p>
                    <p className="text-[11px] text-muted-foreground">{ROLE_LABELS[professional.role as AppRole] ?? professional.role}</p>
                  </div>
                </div>
                <Pill tone="muted">{list.length} today</Pill>
              </div>
              <div className="mt-3 space-y-2">
                {list.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">Schedule is open for this day.</p>}
                {list.map((appointment: any) => (
                  <div
                    key={appointment.id}
                    className={`rounded-2xl border px-3 py-2.5 ${
                      appointment.kind === "block" || appointment.kind === "vacation"
                        ? "border-border/60 bg-cream/50"
                        : "border-white/70 bg-white/50"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {new Date(appointment.starts_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                        {" - "}
                        {new Date(appointment.ends_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                        {" - "}
                        {appointment.kind === "block" || appointment.kind === "vacation"
                          ? KIND_LABELS[appointment.kind]
                          : appointment.patient_name}
                      </p>
                      <div className="flex items-center gap-1.5">
                        {appointment.kind === "encaixe" && <Pill tone="gold">fit-in</Pill>}
                        {roomName(appointment.room_id) && <Pill tone="muted">{roomName(appointment.room_id)}</Pill>}
                        <Pill tone={statusTone(appointment.status)}>{STATUS_LABELS[appointment.status]}</Pill>
                      </div>
                    </div>
                    {appointment.kind !== "block" && appointment.kind !== "vacation" && appointment.status !== "done" && appointment.status !== "canceled" && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {appointment.status === "scheduled" && (
                          <button onClick={() => setStatus(appointment.id, "confirmed")} className="rounded-full border border-olive/30 bg-white/60 px-2.5 py-1 text-[11px] text-olive">Confirm</button>
                        )}
                        <button onClick={() => setStatus(appointment.id, "done")} className="rounded-full bg-moss px-2.5 py-1 text-[11px] text-ivory">Served</button>
                        <button onClick={() => setStatus(appointment.id, "no_show")} className="rounded-full border border-gold/40 bg-white/60 px-2.5 py-1 text-[11px]">No-show</button>
                        <button onClick={() => setStatus(appointment.id, "canceled")} className="rounded-full border border-wine/30 px-2.5 py-1 text-[11px] text-wine">Cancel</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
        {visibleProfessionals.length === 0 && (
          <div className="lg:col-span-2 xl:col-span-3"><EmptyState title="No professional on the team" hint="Invite professionals to the organization to build the schedule." /></div>
        )}
      </div>

      <Card className="mt-6">
        <div className="flex items-center gap-2">
          <ListPlus className="h-4 w-4 text-olive" />
          <h2 className="text-lg font-semibold text-foreground">Waitlist</h2>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <input value={wait.patient_name} onChange={(e) => setWait({ ...wait, patient_name: e.target.value })} placeholder="Patient *" className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
          <input value={wait.phone} onChange={(e) => setWait({ ...wait, phone: e.target.value })} placeholder="Phone" className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
          <input value={wait.notes} onChange={(e) => setWait({ ...wait, notes: e.target.value })} placeholder="Note (e.g. prefers morning)" className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
          <button onClick={addWaitlist} className="rounded-xl bg-olive px-4 py-2 text-sm text-ivory">Add to waitlist</button>
        </div>
        {(waitlist.data ?? []).length > 0 && (
          <div className="mt-4 space-y-2">
            {(waitlist.data ?? []).map((item: any, index: number) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/70 bg-white/50 px-4 py-2.5">
                <p className="text-sm text-foreground">
                  <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-olive/10 text-[11px] font-bold text-olive">{index + 1}</span>
                  {item.patient_name}
                  {item.phone ? ` - ${item.phone}` : ""}
                  {item.notes ? ` - ${item.notes}` : ""}
                </p>
                <div className="flex items-center gap-1.5">
                  {item.status === "waiting" ? (
                    <button onClick={() => setWaitStatus(item.id, "called")} className="rounded-full border border-olive/30 bg-white/60 px-2.5 py-1 text-[11px] text-olive">Call</button>
                  ) : (
                    <Pill tone="gold">called</Pill>
                  )}
                  <button onClick={() => setWaitStatus(item.id, "scheduled", item.patient_name)} className="rounded-full bg-olive px-2.5 py-1 text-[11px] text-ivory">Fit in</button>
                  <button onClick={() => setWaitStatus(item.id, "canceled")} className="rounded-full border border-wine/30 px-2.5 py-1 text-[11px] text-wine">Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <p className="mt-6 text-xs leading-5 text-muted-foreground">
        Automatic reminders through WhatsApp, SMS and email will enter the integrations phase alongside Stripe and Google APIs.
      </p>
    </>
  );
}
