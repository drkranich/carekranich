import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, FileDown, HeartHandshake, ShoppingCart } from "lucide-react";
import { Card, EmptyState, PageHeader, Pill, Stat } from "@/components/app/primitives";
import { GlassSelect } from "@/components/app/GlassSelect";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { downloadPdf } from "@/lib/pdf";

export const Route = createFileRoute("/app/patient-portal")({ component: PatientPortal });

function brl(cents: number | null | undefined) {
  return ((cents ?? 0) / 100).toLocaleString("en-US", { style: "currency", currency: "BRL" });
}

const ORDER_LABEL: Record<string, string> = {
  cart: "In progress",
  quote: "Quote available",
  ordered: "Order confirmed",
  paid: "Paid",
  canceled: "Canceled",
};

function PatientPortal() {
  const { user } = useAuth();
  const [profileId, setProfileId] = useState("");

  const myPatients = useQuery({
    queryKey: ["portal-patients", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const db = supabase as any;
      const [own, authorized] = await Promise.all([
        db.from("patients").select("*").eq("user_id", user!.id),
        db
          .from("patient_authorizations")
          .select("patient_id, relationship, status, valid_until")
          .eq("granted_to", user!.id)
          .eq("status", "active"),
      ]);
      if (own.error) throw own.error;
      const ownList = own.data ?? [];
      const authIds = (authorized.data ?? []).map((a: any) => a.patient_id);
      let authList: any[] = [];
      if (authIds.length) {
        const { data } = await db.from("patients").select("*").in("id", authIds);
        authList = (data ?? []).map((p: any) => ({
          ...p,
          _relationship: (authorized.data ?? []).find((a: any) => a.patient_id === p.id)?.relationship,
        }));
      }
      return [...ownList, ...authList.filter((p) => !ownList.some((o: any) => o.id === p.id))];
    },
  });

  const selected =
    (myPatients.data ?? []).find((p: any) => p.id === profileId) ?? (myPatients.data ?? [])[0] ?? null;

  const orders = useQuery({
    queryKey: ["portal-orders", selected?.id],
    enabled: !!selected,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("exam_orders")
        .select("*")
        .eq("patient_id", selected!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const appointments = useQuery({
    queryKey: ["portal-appointments", selected?.id],
    enabled: !!selected,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("appointments")
        .select("id,starts_at,ends_at,kind,status,patient_name,room_id")
        .eq("patient_id", selected!.id)
        .order("starts_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const upcoming = useMemo(
    () => (appointments.data ?? []).filter((a: any) => new Date(a.starts_at) >= new Date() && a.status !== "canceled"),
    [appointments.data],
  );

  const exportSummary = () => {
    if (!selected) return;
    downloadPdf(`portal-${selected.full_name}.pdf`, `Summary - ${selected.social_name || selected.full_name}`, [
      `Insurance: ${selected.insurance_plan ?? "Private"}`,
      "",
      "Upcoming appointments:",
      ...upcoming.map((a: any) => `- ${new Date(a.starts_at).toLocaleString("en-US")} - ${a.kind}`),
      "",
      "Exam orders:",
      ...(orders.data ?? []).map(
        (o: any) => `- ${new Date(o.created_at).toLocaleDateString("en-US")} - ${ORDER_LABEL[o.status] ?? o.status} - ${brl(o.total_cents)}`,
      ),
    ]);
  };

  if (!myPatients.isLoading && (myPatients.data ?? []).length === 0) {
    return (
      <>
        <PageHeader
          title="Patient portal"
          subtitle="Track appointments, exam orders and quotes - yours and those of people you care for."
        />
        <EmptyState
          title="No patient profile linked to your account"
          hint="Ask the clinic to link your patient record to your email, or to register a family authorization under Patients > Authorizations."
        />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patient portal"
        subtitle="Appointments, orders and quotes - yours and those of authorized family members you follow."
        action={
          <button onClick={exportSummary} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white/55 px-4 py-2 text-xs">
            <FileDown className="h-3.5 w-3.5" /> PDF summary
          </button>
        }
      />

      {(myPatients.data ?? []).length > 1 && (
        <Card className="p-5">
          <div className="flex flex-wrap items-center gap-3">
            <HeartHandshake className="h-5 w-5 text-olive" />
            <p className="text-sm text-muted-foreground">You are viewing the profile of:</p>
            <GlassSelect
              value={selected?.id ?? ""}
              onChange={setProfileId}
              className="min-w-72"
              options={(myPatients.data ?? []).map((p: any) => ({
                value: p.id,
                label: `${p.social_name || p.full_name}${p._relationship ? ` (${p._relationship})` : " (you)"}`,
              }))}
            />
          </div>
        </Card>
      )}

      {selected && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Stat label="Upcoming appointments" value={upcoming.length} sub="Confirmed and scheduled" tone="olive" />
            <Stat label="Exam orders" value={(orders.data ?? []).length} sub="Full history" tone="moss" />
            <Stat
              label="Open quotes"
              value={(orders.data ?? []).filter((o: any) => o.status === "quote").length}
              sub="Waiting for your decision"
              tone="gold"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="space-y-3 p-6">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <CalendarDays className="h-4 w-4" /> Appointments
              </h3>
              {(appointments.data ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">No appointments yet.</p>
              )}
              {(appointments.data ?? []).map((a: any) => {
                const future = new Date(a.starts_at) >= new Date();
                return (
                  <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/70 bg-white/50 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {new Date(a.starts_at).toLocaleDateString("en-US")} -{" "}
                        {new Date(a.starts_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                      <p className="text-xs text-muted-foreground">{a.kind}</p>
                    </div>
                    <Pill tone={a.status === "canceled" ? "wine" : future ? "moss" : "muted"}>
                      {a.status === "canceled" ? "canceled" : future ? "scheduled" : "completed"}
                    </Pill>
                  </div>
                );
              })}
            </Card>

            <Card className="space-y-3 p-6">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <ShoppingCart className="h-4 w-4" /> Orders and quotes
              </h3>
              {(orders.data ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">No exam orders yet.</p>
              )}
              {(orders.data ?? []).map((o: any) => (
                <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/70 bg-white/50 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{brl(o.total_cents)}</p>
                    <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("en-US")}</p>
                  </div>
                  <Pill tone={o.status === "paid" || o.status === "ordered" ? "moss" : o.status === "canceled" ? "wine" : "gold"}>
                    {ORDER_LABEL[o.status] ?? o.status}
                  </Pill>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                Exam results appear here as soon as the laboratory releases them.
              </p>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
