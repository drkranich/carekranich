import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Card, EmptyState, PageHeader, Pill } from "@/components/app/primitives";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { downloadPdf } from "@/lib/pdf";

export const Route = createFileRoute("/app/contracts")({ component: Contracts });

function Contracts() {
  const { isAdmin, isSuperAdmin, profile, user } = useAuth();
  const qc = useQueryClient();
  const [draft, setDraft] = useState({ title: "", body: "", contract_type: "subscription" });
  if (!isAdmin && !isSuperAdmin) return <Navigate to="/app" />;

  const contracts = useQuery({
    queryKey: ["contracts", profile?.tenant_id, isSuperAdmin],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("contracts").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("contracts").insert({
        tenant_id: profile?.tenant_id,
        title: draft.title,
        body: draft.body,
        contract_type: draft.contract_type,
        created_by: user?.id,
        status: "draft",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Contract saved");
      setDraft({ title: "", body: "", contract_type: "subscription" });
      qc.invalidateQueries({ queryKey: ["contracts", profile?.tenant_id, isSuperAdmin] });
    },
    onError: (error: any) => toast.error(error.message ?? "Could not save contract"),
  });

  const setStatus = async (id: string, status: string) => {
    const { error } = await (supabase as any).from("contracts").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["contracts", profile?.tenant_id, isSuperAdmin] });
  };

  return (
    <>
      <PageHeader title="Contracts" subtitle="Create, edit, approve and export subscription or service contracts as real PDFs." action={<Pill tone="olive">Payment-linked</Pill>} />
      <Card>
        <h2 className="text-xl font-semibold text-foreground">New contract</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_180px]">
          <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Contract title" className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
          <select value={draft.contract_type} onChange={(e) => setDraft({ ...draft, contract_type: e.target.value })} className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm">
            <option value="subscription">Subscription</option>
            <option value="clinic">Clinic</option>
            <option value="provider">Provider</option>
            <option value="employment">Employee</option>
          </select>
        </div>
        <textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} rows={5} placeholder="Contract terms..." className="mt-3 w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
        <button onClick={() => save.mutate()} disabled={!draft.title || !draft.body} className="mt-3 rounded-full bg-olive px-4 py-2 text-sm text-ivory disabled:opacity-50">Save contract</button>
      </Card>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {(contracts.data ?? []).map((contract: any) => (
          <Card key={contract.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{contract.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{contract.contract_type} · {new Date(contract.created_at).toLocaleDateString()}</p>
              </div>
              <Pill tone={contract.status === "active" ? "moss" : "gold"}>{contract.status}</Pill>
            </div>
            <p className="mt-4 line-clamp-4 text-sm leading-6 text-foreground/80">{contract.body}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => downloadPdf(`${contract.title}.pdf`, contract.title, [contract.body])} className="rounded-full border border-border px-3 py-1.5 text-xs">Generate PDF</button>
              <button onClick={() => setStatus(contract.id, "active")} className="rounded-full bg-olive px-3 py-1.5 text-xs text-ivory">Approve</button>
              <button onClick={() => setStatus(contract.id, "void")} className="rounded-full border border-wine/25 px-3 py-1.5 text-xs text-wine">Void</button>
            </div>
          </Card>
        ))}
      </div>
      {contracts.data?.length === 0 && <div className="mt-6"><EmptyState title="No contracts yet" hint="Create the first contract and export it as PDF." /></div>}
    </>
  );
}
