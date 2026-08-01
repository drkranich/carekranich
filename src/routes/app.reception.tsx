import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, CheckCircle2, TicketCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Card, EmptyState, PageHeader, Pill, Stat } from "@/components/app/primitives";
import { GlassSelect } from "@/components/app/GlassSelect";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/reception")({ component: Reception });

type CheckinRow = {
  id: string;
  tenant_id: string;
  unit_id: string | null;
  patient_id: string | null;
  method: string;
  ticket_number: string | null;
  priority: boolean;
  pending: string[];
  status: string;
  arrived_at: string;
  called_at: string | null;
  completed_at: string | null;
};

const PENDING_OPTIONS = [
  "Consent form",
  "Fasting confirmation",
  "Identity document",
  "Medical order",
  "Payment",
  "Insurance authorization",
];

const METHODS = [
  { value: "presencial", label: "In person (front desk)" },
  { value: "qr", label: "QR Code" },
  { value: "tablet", label: "Tablet / kiosk" },
];

const glassInput =
  "w-full rounded-2xl border border-white/70 bg-white/55 px-4 py-2.5 text-sm shadow-soft backdrop-blur-xl outline-none focus:border-olive/40";

function minutesSince(iso: string) {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

function Reception() {
  const qc = useQueryClient();
  const { profile, user, isSuperAdmin } = useAuth();
  const tenantId = profile?.tenant_id ?? null;
  const [draft, setDraft] = useState({ patient_id: "", unit_id: "", method: "presencial", priority: false });
  const [pending, setPending] = useState<string[]>([]);

  const startOfDay = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);

  const checkins = useQuery({
    queryKey: ["reception-checkins", tenantId],
    enabled: !!tenantId || isSuperAdmin,
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("checkins")
        .select("*")
        .gte("arrived_at", startOfDay)
        .order("priority", { ascending: false })
        .order("arrived_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CheckinRow[];
    },
  });

  const patients = useQuery({
    queryKey: ["reception-patients", tenantId],
    enabled: !!tenantId || isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("patients")
        .select("id,full_name,social_name")
        .eq("status", "active")
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; full_name: string; social_name: string | null }>;
    },
  });

  const units = useQuery({
    queryKey: ["reception-units", tenantId],
    enabled: !!tenantId || isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("clinic_units")
        .select("id,name")
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string }>;
    },
  });

  const patientName = (id: string | null) => {
    const p = (patients.data ?? []).find((x) => x.id === id);
    return p ? p.social_name || p.full_name : "Patient";
  };

  const create = useMutation({
    mutationFn: async () => {
      if (!draft.patient_id) throw new Error("Select the patient.");
      const todayCount = (checkins.data ?? []).length;
      const prefix = draft.priority ? "P" : "N";
      const ticket = `${prefix}${String(todayCount + 1).padStart(3, "0")}`;
      const { error } = await (supabase as any).from("checkins").insert({
        tenant_id: tenantId,
        unit_id: draft.unit_id || null,
        patient_id: draft.patient_id,
        method: draft.method,
        priority: draft.priority,
        pending,
        ticket_number: ticket,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
      return ticket;
    },
    onSuccess: (ticket) => {
      toast.success(`Check-in completed - ticket ${ticket}`);
      setDraft({ patient_id: "", unit_id: "", method: "presencial", priority: false });
      setPending([]);
      qc.invalidateQueries({ queryKey: ["reception-checkins"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not complete check-in"),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const patch: Record<string, unknown> = { status };
      if (status === "in_service") patch.called_at = new Date().toISOString();
      if (status === "done" || status === "no_show") patch.completed_at = new Date().toISOString();
      const { error } = await (supabase as any).from("checkins").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reception-checkins"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const resolvePending = useMutation({
    mutationFn: async ({ row, item }: { row: CheckinRow; item: string }) => {
      const next = (row.pending ?? []).filter((p) => p !== item);
      const { error } = await (supabase as any).from("checkins").update({ pending: next }).eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reception-checkins"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const rows = checkins.data ?? [];
  const waiting = rows.filter((r) => r.status === "waiting");
  const inService = rows.filter((r) => r.status === "in_service");
  const done = rows.filter((r) => r.status === "done");
  const avgWait = waiting.length
    ? Math.round(waiting.reduce((acc, r) => acc + minutesSince(r.arrived_at), 0) / waiting.length)
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reception and check-in"
        subtitle="Daily queue, tickets, priorities and pending items before releasing each patient."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Waiting" value={waiting.length} tone="olive" sub="patients in queue" />
        <Stat label="In service" value={inService.length} tone="moss" sub="called now" />
        <Stat label="Served today" value={done.length} tone="gold" sub="completed check-ins" />
        <Stat label="Average wait" value={`${avgWait} min`} tone="wine" sub="current queue" />
      </div>

      <Card className="space-y-4 p-6">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <UserPlus className="h-4 w-4" /> New check-in
        </h3>
        <div className="grid gap-3 md:grid-cols-4">
          <GlassSelect
            value={draft.patient_id}
            onChange={(v) => setDraft({ ...draft, patient_id: v })}
            placeholder="Patient"
            options={(patients.data ?? []).map((p) => ({ value: p.id, label: p.social_name || p.full_name }))}
          />
          <GlassSelect
            value={draft.unit_id}
            onChange={(v) => setDraft({ ...draft, unit_id: v })}
            placeholder="Unit"
            options={[
              { value: "", label: "No unit" },
              ...(units.data ?? []).map((u) => ({ value: u.id, label: u.name })),
            ]}
          />
          <GlassSelect
            value={draft.method}
            onChange={(v) => setDraft({ ...draft, method: v })}
            options={METHODS}
          />
          <button
            type="button"
            onClick={() => setDraft({ ...draft, priority: !draft.priority })}
            className={`rounded-2xl border px-4 py-2.5 text-sm font-medium transition ${
              draft.priority
                ? "border-wine bg-wine text-ivory shadow-soft"
                : "border-white/70 bg-white/55 text-foreground backdrop-blur-xl"
            }`}
          >
            {draft.priority ? "Priority enabled" : "Mark priority"}
          </button>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Pending items to resolve before releasing the patient
          </p>
          <div className="flex flex-wrap gap-2">
            {PENDING_OPTIONS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() =>
                  setPending((prev) =>
                    prev.includes(item) ? prev.filter((p) => p !== item) : [...prev, item],
                  )
                }
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  pending.includes(item)
                    ? "border-terracotta bg-terracotta/15 text-terracotta"
                    : "border-white/70 bg-white/55 text-muted-foreground backdrop-blur-xl"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => create.mutate()}
          disabled={create.isPending}
          className="inline-flex items-center gap-2 rounded-full bg-olive px-5 py-2 text-sm font-medium text-ivory shadow-soft hover:opacity-90 disabled:opacity-60"
        >
          <TicketCheck className="h-4 w-4" /> {create.isPending ? "Generating ticket..." : "Check in and generate ticket"}
        </button>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3 p-6">
          <h3 className="text-sm font-semibold text-foreground">Waiting queue</h3>
          {waiting.length === 0 && <p className="text-sm text-muted-foreground">No one is waiting.</p>}
          {waiting.map((row) => (
            <div key={row.id} className="space-y-2 rounded-2xl border border-white/70 bg-white/45 p-4 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className={`flex h-10 w-14 items-center justify-center rounded-xl font-display text-lg ${row.priority ? "bg-wine text-ivory" : "bg-olive/15 text-olive"}`}>
                    {row.ticket_number ?? "-"}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{patientName(row.patient_id)}</p>
                    <p className="text-xs text-muted-foreground">
                      Arrived {minutesSince(row.arrived_at)} min ago · {METHODS.find((m) => m.value === row.method)?.label ?? row.method}
                    </p>
                  </div>
                </div>
                {row.priority && <Pill tone="wine">Priority</Pill>}
              </div>
              {(row.pending ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {(row.pending ?? []).map((item) => (
                    <button
                      key={item}
                      onClick={() => resolvePending.mutate({ row, item })}
                      title="Click to mark as resolved"
                      className="rounded-full border border-terracotta/40 bg-terracotta/10 px-2.5 py-1 text-xs text-terracotta hover:bg-terracotta/20"
                    >
                      {item} x
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setStatus.mutate({ id: row.id, status: "in_service" })}
                  disabled={(row.pending ?? []).length > 0}
                  title={(row.pending ?? []).length > 0 ? "Resolve pending items before calling" : undefined}
                  className="inline-flex items-center gap-1 rounded-full bg-olive px-4 py-1.5 text-xs font-medium text-ivory shadow-soft hover:opacity-90 disabled:opacity-40"
                >
                  <BellRing className="h-3.5 w-3.5" /> Call
                </button>
                <button
                  onClick={() => setStatus.mutate({ id: row.id, status: "no_show" })}
                  className="rounded-full border border-white/70 bg-white/55 px-4 py-1.5 text-xs backdrop-blur-xl"
                >
                  No-show
                </button>
              </div>
            </div>
          ))}
        </Card>

        <Card className="space-y-3 p-6">
          <h3 className="text-sm font-semibold text-foreground">In service</h3>
          {inService.length === 0 && <p className="text-sm text-muted-foreground">No patient currently in service.</p>}
          {inService.map((row) => (
            <div key={row.id} className="flex items-center justify-between gap-2 rounded-2xl border border-white/70 bg-white/45 p-4 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-14 items-center justify-center rounded-xl bg-moss/15 font-display text-lg text-moss">
                  {row.ticket_number ?? "-"}
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">{patientName(row.patient_id)}</p>
                  <p className="text-xs text-muted-foreground">
                    Called {row.called_at ? `${minutesSince(row.called_at)} min ago` : "now"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setStatus.mutate({ id: row.id, status: "done" })}
                className="inline-flex items-center gap-1 rounded-full bg-moss px-4 py-1.5 text-xs font-medium text-ivory shadow-soft hover:opacity-90"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Complete
              </button>
            </div>
          ))}

          {done.length > 0 && (
            <>
              <h3 className="pt-2 text-sm font-semibold text-foreground">Completed today</h3>
              {done.slice(0, 8).map((row) => (
                <div key={row.id} className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{row.ticket_number} · {patientName(row.patient_id)}</span>
                  <span>{row.completed_at ? new Date(row.completed_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                </div>
              ))}
            </>
          )}
        </Card>
      </div>

      {rows.length === 0 && (
        <EmptyState
          title="No check-ins today"
          hint="Create the first check-in above to start today's queue."
        />
      )}
    </div>
  );
}
