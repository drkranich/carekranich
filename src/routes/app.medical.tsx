import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Stethoscope } from "lucide-react";
import { toast } from "sonner";
import { Card, EmptyState, PageHeader, Pill, Stat } from "@/components/app/primitives";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/medical")({
  component: Medical,
});

function Medical() {
  const qc = useQueryClient();
  const { profile, user, isSuperAdmin } = useAuth();
  const [residentId, setResidentId] = useState("");
  const [note, setNote] = useState("");

  const medical = useQuery({
    queryKey: ["medical-workspace", profile?.tenant_id, isSuperAdmin],
    enabled: !!profile?.tenant_id || isSuperAdmin,
    queryFn: async () => {
      const db = supabase as any;
      const [residents, observations, insights, carePlans, documents, events] = await Promise.all([
        db.from("residents").select("id,tenant_id,full_name,preferred_name,date_of_birth,language,story").order("full_name").limit(200),
        db.from("twin_observations").select("id,resident_id,domain,metric,value_numeric,value_text,unit,source,observed_at,notes").order("observed_at", { ascending: false }).limit(300),
        db.from("ai_insights").select("id,resident_id,module,title,summary,severity,confidence,created_at").order("created_at", { ascending: false }).limit(200),
        db.from("care_plans").select("id,resident_id,title,status,priority,description,created_at").order("created_at", { ascending: false }).limit(200),
        db.from("documents").select("id,resident_id,title,document_type,status,created_at").in("document_type", ["medical", "prescription", "insurance"]).order("created_at", { ascending: false }).limit(200),
        db.from("events").select("id,resident_id,title,description,category,severity,occurred_at").in("category", ["medical", "clinical_note", "medication", "assessment"]).order("occurred_at", { ascending: false }).limit(200),
      ]);
      const errors = [residents, observations, insights, carePlans, documents, events].map((item) => item.error?.message).filter(Boolean);
      if (errors.length) throw new Error(errors.join(" | "));
      return {
        residents: residents.data ?? [],
        observations: observations.data ?? [],
        insights: insights.data ?? [],
        carePlans: carePlans.data ?? [],
        documents: documents.data ?? [],
        events: events.data ?? [],
      };
    },
  });

  const selectedResident = useMemo(() => {
    const residents = medical.data?.residents ?? [];
    return residents.find((item: any) => item.id === residentId) ?? residents[0] ?? null;
  }, [medical.data?.residents, residentId]);

  const scoped = (rows: any[]) => (selectedResident ? rows.filter((row) => row.resident_id === selectedResident.id) : rows);
  const observations = scoped(medical.data?.observations ?? []);
  const insights = scoped(medical.data?.insights ?? []);
  const carePlans = scoped(medical.data?.carePlans ?? []);
  const documents = scoped(medical.data?.documents ?? []);
  const events = scoped(medical.data?.events ?? []);

  const saveNote = async () => {
    if (!user || !note.trim()) return;
    const tenantId = profile?.tenant_id ?? selectedResident?.tenant_id;
    if (!tenantId) return toast.error("Select a resident with an organization before saving a clinical note.");
    const { error } = await supabase.from("events").insert({
      tenant_id: tenantId,
      resident_id: selectedResident?.id ?? null,
      actor_id: user.id,
      category: "clinical_note",
      severity: "info",
      title: "Clinical note",
      description: note.trim(),
      payload: {},
    });
    if (error) return toast.error(error.message);
    setNote("");
    toast.success("Clinical note saved");
    qc.invalidateQueries({ queryKey: ["medical-workspace"] });
  };

  return (
    <>
      <PageHeader
        title="Clinical workspace"
        subtitle="Resident clinical context from observations, care plans, documents, insights and events."
        action={<Pill tone={medical.isError ? "wine" : "olive"}>{medical.isError ? "Read error" : "Live clinical records"}</Pill>}
      />

      {medical.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading clinical workspace...</p>
      ) : medical.isError ? (
        <Card className="border-wine/25 bg-wine/5">
          <p className="font-medium text-wine">Could not load clinical workspace.</p>
          <p className="mt-2 text-sm text-muted-foreground">{(medical.error as Error).message}</p>
        </Card>
      ) : !selectedResident ? (
        <EmptyState title="No residents yet" hint="Create a resident before using the medical workspace." />
      ) : (
        <>
          <Card className="mb-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Resident</p>
                <h2 className="text-2xl font-semibold text-foreground">{selectedResident.preferred_name || selectedResident.full_name}</h2>
              </div>
              <select value={selectedResident.id} onChange={(event) => setResidentId(event.target.value)} className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm">
                {(medical.data?.residents ?? []).map((resident: any) => (
                  <option key={resident.id} value={resident.id}>{resident.preferred_name || resident.full_name}</option>
                ))}
              </select>
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-4">
            <Stat label="Observations" value={observations.length} sub="Twin observations" tone="olive" />
            <Stat label="Care plans" value={carePlans.length} sub="Clinical plans" tone="moss" />
            <Stat label="Documents" value={documents.length} sub="Medical/prescription files" tone="gold" />
            <Stat label="Insights" value={insights.length} sub="AI insight records" tone="wine" />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
            <Card>
              <div className="flex items-center gap-3">
                <Stethoscope className="h-5 w-5 text-olive" />
                <h2 className="text-xl font-semibold text-foreground">Latest observations</h2>
              </div>
              <RecordList
                rows={observations}
                empty="No observations for this resident."
                render={(row) => `${row.metric}: ${row.value_numeric ?? row.value_text ?? "-"} ${row.unit ?? ""}`}
              />
            </Card>

            <Card>
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-olive" />
                <h2 className="text-xl font-semibold text-foreground">Medical documents</h2>
              </div>
              <RecordList rows={documents} empty="No medical documents." render={(row) => `${row.title} · ${row.document_type}`} />
            </Card>

            <Card>
              <h2 className="text-xl font-semibold text-foreground">Clinical notes</h2>
              <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} placeholder="Document assessment, medication change or family update..." className="mt-4 w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
              <button onClick={saveNote} className="mt-3 rounded-full bg-olive px-4 py-2 text-xs text-ivory">Save note</button>
              <RecordList rows={events} empty="No clinical events." render={(row) => `${row.title}: ${row.description ?? ""}`} />
            </Card>

            <Card>
              <h2 className="text-xl font-semibold text-foreground">AI clinical insights</h2>
              <RecordList rows={insights} empty="No AI insights." render={(row) => `${row.title}: ${row.summary}`} />
            </Card>
          </div>
        </>
      )}
    </>
  );
}

function RecordList({ rows, empty, render }: { rows: any[]; empty: string; render: (row: any) => string }) {
  return (
    <div className="mt-4 space-y-3">
      {rows.slice(0, 8).map((row) => (
        <div key={row.id} className="rounded-2xl border border-border/60 bg-cream/40 p-3">
          <p className="text-sm text-foreground">{render(row)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{new Date(row.observed_at ?? row.created_at ?? row.occurred_at).toLocaleString()}</p>
        </div>
      ))}
      {rows.length === 0 && <p className="text-sm text-muted-foreground">{empty}</p>}
    </div>
  );
}
