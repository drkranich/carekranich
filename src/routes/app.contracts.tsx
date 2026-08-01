import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CrudActions } from "@/components/app/CrudActions";
import { Card, EmptyState, PageHeader, Pill } from "@/components/app/primitives";
import { GlassSelect } from "@/components/app/GlassSelect";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { downloadPdf } from "@/lib/pdf";

export const Route = createFileRoute("/app/contracts")({ component: Contracts });

const contractTypeOptions = [
  { value: "subscription", label: "Subscription" },
  { value: "clinic", label: "Clinic" },
  { value: "provider", label: "Provider" },
  { value: "employment", label: "Staff member" },
];

async function sha256Hex(text: string) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function detectIp(): Promise<string> {
  try {
    const response = await fetch("https://api.ipify.org?format=json");
    const json = await response.json();
    return json.ip ?? "unknown";
  } catch {
    return "unknown";
  }
}

function Contracts() {
  const { isAdmin, isSuperAdmin, profile, user, displayName } = useAuth();
  const qc = useQueryClient();
  const [draft, setDraft] = useState({ title: "", body: "", contract_type: "subscription" });
  const [editingContract, setEditingContract] = useState<any | null>(null);
  if (!isAdmin && !isSuperAdmin) return <Navigate to="/app" />;

  const contracts = useQuery({
    queryKey: ["contracts", profile?.tenant_id, isSuperAdmin],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("contracts").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const signatures = useQuery({
    queryKey: ["contract-signatures", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("contract_signatures")
        .select("id,contract_id,signer_name,signer_email,ip_address,content_hash,signed_at")
        .order("signed_at", { ascending: false })
        .limit(500);
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
      toast.success("Contract salvo");
      setDraft({ title: "", body: "", contract_type: "subscription" });
      qc.invalidateQueries({ queryKey: ["contracts", profile?.tenant_id, isSuperAdmin] });
    },
    onError: (error: any) => toast.error(error.message ?? "Could not save the contract"),
  });

  const sign = useMutation({
    mutationFn: async (contract: any) => {
      if (!user) throw new Error("Session expired.");
      const [hash, ip] = await Promise.all([sha256Hex(`${contract.id}\n${contract.title}\n${contract.body}`), detectIp()]);
      const { error } = await (supabase as any).from("contract_signatures").insert({
        tenant_id: contract.tenant_id ?? profile?.tenant_id,
        contract_id: contract.id,
        signer_id: user.id,
        signer_name: displayName || user.email,
        signer_email: user.email,
        ip_address: ip,
        user_agent: navigator.userAgent.slice(0, 250),
        content_hash: hash,
      });
      if (error) throw error;
      await (supabase as any).from("contracts").update({ status: "signed" }).eq("id", contract.id);
      return { hash, ip };
    },
    onSuccess: ({ hash }) => {
      toast.success(`Contract signed — hash ${hash.slice(0, 12)}...`);
      qc.invalidateQueries({ queryKey: ["contracts", profile?.tenant_id, isSuperAdmin] });
      qc.invalidateQueries({ queryKey: ["contract-signatures", profile?.tenant_id] });
    },
    onError: (error: any) => toast.error(error.message ?? "Could not sign"),
  });

  const setStatus = async (id: string, status: string) => {
    const { data, error } = await (supabase as any)
      .from("contracts")
      .update({ status })
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (error) toast.error(error.message);
    else if (!data) toast.error("Contract was not updated. Check your permissions.");
    else qc.invalidateQueries({ queryKey: ["contracts", profile?.tenant_id, isSuperAdmin] });
  };

  const saveContractEdit = async () => {
    if (!editingContract?.title?.trim() || !editingContract?.body?.trim()) {
      toast.error("Enter the contract title and body.");
      return;
    }
    const { data, error } = await (supabase as any)
      .from("contracts")
      .update({
        title: editingContract.title.trim(),
        body: editingContract.body.trim(),
        contract_type: editingContract.contract_type,
      })
      .eq("id", editingContract.id)
      .select("id")
      .maybeSingle();
    if (error) return toast.error(error.message);
    if (!data) return toast.error("Contract was not edited. Check your permissions.");
    toast.success("Contract atualizado");
    setEditingContract(null);
    qc.invalidateQueries({ queryKey: ["contracts", profile?.tenant_id, isSuperAdmin] });
  };

  const shareContract = async (contract: any) => {
    const text = [`Contract: ${contract.title}`, `Status: ${contract.status}`, "", contract.body].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Contract copied for sharing");
    } catch {
      window.prompt("Copy the contract:", text);
    }
  };

  const deleteContract = async (contract: any) => {
    if (!window.confirm(`Permanently delete "${contract.title}"?`)) return;
    const { data, error } = await (supabase as any)
      .from("contracts")
      .delete()
      .eq("id", contract.id)
      .select("id")
      .maybeSingle();
    if (error) return toast.error(error.message);
    if (!data) return toast.error("Contract was not deleted. Check your permissions.");
    toast.success("Contract deleted");
    qc.invalidateQueries({ queryKey: ["contracts", profile?.tenant_id, isSuperAdmin] });
  };

  const exportSignedPdf = (contract: any, signature: any) => {
    downloadPdf(`${contract.title}-signed.pdf`, contract.title, [
      contract.body,
      "",
      "----------------------------------------",
      "ELECTRONIC SIGNATURE RECEIPT",
      `Signed by: ${signature.signer_name ?? "-"} (${signature.signer_email ?? "-"})`,
      `Date/time: ${new Date(signature.signed_at).toLocaleString("en-US")}`,
      `IP address: ${signature.ip_address ?? "-"}`,
      `Content SHA-256 hash: ${signature.content_hash}`,
      "This document integrity can be verified by comparing the hash above with the original content.",
    ]);
  };

  const signaturesFor = (contractId: string) =>
    (signatures.data ?? []).filter((item: any) => item.contract_id === contractId);

  return (
    <>
      <PageHeader
        title="Contracts"
        subtitle="Create, approve, sign electronically with IP and cryptographic hash, and export contracts as PDF."
        action={<Pill tone="olive">Subscription with IP + SHA-256</Pill>}
      />
      <Card>
        <h2 className="text-xl font-semibold text-foreground">New contract</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_180px]">
          <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Contract title" className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
          <GlassSelect
            value={draft.contract_type}
            onChange={(value) => setDraft({ ...draft, contract_type: value })}
            options={contractTypeOptions}
          />
        </div>
        <textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} rows={5} placeholder="Contract terms..." className="mt-3 w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
        <button onClick={() => save.mutate()} disabled={!draft.title || !draft.body} className="mt-3 rounded-full bg-olive px-4 py-2 text-sm text-ivory disabled:opacity-50">Save contract</button>
      </Card>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {(contracts.data ?? []).map((contract: any) => {
          const sigs = signaturesFor(contract.id);
          return (
            <Card key={contract.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{contract.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{contract.contract_type} · {new Date(contract.created_at).toLocaleDateString("en-US")}</p>
                </div>
                <Pill tone={contract.status === "signed" ? "moss" : contract.status === "active" ? "olive" : "gold"}>{contract.status}</Pill>
              </div>
              {editingContract?.id === contract.id ? (
                <div className="mt-4 space-y-3">
                  <input
                    value={editingContract.title}
                    onChange={(event) => setEditingContract({ ...editingContract, title: event.target.value })}
                    className="w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm"
                  />
                  <GlassSelect
                    value={editingContract.contract_type}
                    onChange={(value) => setEditingContract({ ...editingContract, contract_type: value })}
                    options={contractTypeOptions}
                  />
                  <textarea
                    value={editingContract.body}
                    onChange={(event) => setEditingContract({ ...editingContract, body: event.target.value })}
                    rows={5}
                    className="w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm"
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setEditingContract(null)} className="rounded-full border border-border px-3 py-1.5 text-xs">Cancel</button>
                    <button onClick={saveContractEdit} className="rounded-full bg-olive px-3 py-1.5 text-xs text-ivory">Save changes</button>
                  </div>
                </div>
              ) : (
                <p className="mt-4 line-clamp-4 text-sm leading-6 text-foreground/80">{contract.body}</p>
              )}

              {sigs.length > 0 && (
                <div className="mt-4 space-y-2 rounded-2xl border border-moss/25 bg-moss/5 p-3">
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground">Registered subscriptions</p>
                  {sigs.map((signature: any) => (
                    <div key={signature.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="min-w-0 truncate text-foreground">
                        {signature.signer_name ?? signature.signer_email} · {new Date(signature.signed_at).toLocaleString("en-US")} · IP {signature.ip_address}
                      </span>
                      <button
                        onClick={() => exportSignedPdf(contract, signature)}
                        className="rounded-full border border-border bg-white/55 px-2.5 py-1 text-[11px] hover:bg-cream"
                      >
                        Comprovante PDF
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => sign.mutate(contract)}
                  disabled={sign.isPending}
                  className="rounded-full bg-moss px-3 py-1.5 text-xs font-semibold text-ivory disabled:opacity-50"
                >
                  {sign.isPending ? "Signing..." : "Sign electronically"}
                </button>
                <button onClick={() => downloadPdf(`${contract.title}.pdf`, contract.title, [contract.body])} className="rounded-full border border-border px-3 py-1.5 text-xs">Generate PDF</button>
                <button onClick={() => setStatus(contract.id, "active")} className="rounded-full bg-olive px-3 py-1.5 text-xs text-ivory">Approve</button>
                <button onClick={() => setStatus(contract.id, "void")} className="rounded-full border border-wine/25 px-3 py-1.5 text-xs text-wine">Void</button>
              </div>
              <CrudActions
                className="mt-3"
                onEdit={() => setEditingContract(contract)}
                onArchive={() => setStatus(contract.id, contract.status === "archived" ? "draft" : "archived")}
                archiveLabel={contract.status === "archived" ? "Restore" : "Archive"}
                onShare={() => shareContract(contract)}
                onDelete={() => deleteContract(contract)}
              />
            </Card>
          );
        })}
      </div>
      {contracts.data?.length === 0 && <div className="mt-6"><EmptyState title="No contracts yet" hint="Create the first contract, sign it electronically and export it as PDF." /></div>}
    </>
  );
}
