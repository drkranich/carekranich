import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Card, EmptyState, PageHeader, Pill } from "@/components/app/primitives";
import { GlassSelect } from "@/components/app/GlassSelect";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { downloadPdf } from "@/lib/pdf";

export const Route = createFileRoute("/app/contracts")({ component: Contracts });

const contractTypeOptions = [
  { value: "subscription", label: "Assinatura" },
  { value: "clinic", label: "Clínica" },
  { value: "provider", label: "Prestador" },
  { value: "employment", label: "Funcionário" },
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
    return json.ip ?? "desconhecido";
  } catch {
    return "desconhecido";
  }
}

function Contracts() {
  const { isAdmin, isSuperAdmin, profile, user, displayName } = useAuth();
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
      toast.success("Contrato salvo");
      setDraft({ title: "", body: "", contract_type: "subscription" });
      qc.invalidateQueries({ queryKey: ["contracts", profile?.tenant_id, isSuperAdmin] });
    },
    onError: (error: any) => toast.error(error.message ?? "Não foi possível salvar o contrato"),
  });

  const sign = useMutation({
    mutationFn: async (contract: any) => {
      if (!user) throw new Error("Sessão expirada.");
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
      toast.success(`Contrato assinado — hash ${hash.slice(0, 12)}...`);
      qc.invalidateQueries({ queryKey: ["contracts", profile?.tenant_id, isSuperAdmin] });
      qc.invalidateQueries({ queryKey: ["contract-signatures", profile?.tenant_id] });
    },
    onError: (error: any) => toast.error(error.message ?? "Não foi possível assinar"),
  });

  const setStatus = async (id: string, status: string) => {
    const { error } = await (supabase as any).from("contracts").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["contracts", profile?.tenant_id, isSuperAdmin] });
  };

  const exportSignedPdf = (contract: any, signature: any) => {
    downloadPdf(`${contract.title}-assinado.pdf`, contract.title, [
      contract.body,
      "",
      "----------------------------------------",
      "COMPROVANTE DE ASSINATURA ELETRÔNICA",
      `Assinado por: ${signature.signer_name ?? "-"} (${signature.signer_email ?? "-"})`,
      `Data/hora: ${new Date(signature.signed_at).toLocaleString("pt-BR")}`,
      `Endereço IP: ${signature.ip_address ?? "-"}`,
      `Hash SHA-256 do conteúdo: ${signature.content_hash}`,
      "A integridade deste documento pode ser verificada comparando o hash acima com o conteúdo original.",
    ]);
  };

  const signaturesFor = (contractId: string) =>
    (signatures.data ?? []).filter((item: any) => item.contract_id === contractId);

  return (
    <>
      <PageHeader
        title="Contratos"
        subtitle="Crie, aprove, assine eletronicamente (com IP e hash criptográfico) e exporte contratos em PDF."
        action={<Pill tone="olive">Assinatura com IP + SHA-256</Pill>}
      />
      <Card>
        <h2 className="text-xl font-semibold text-foreground">Novo contrato</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_180px]">
          <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Título do contrato" className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
          <GlassSelect
            value={draft.contract_type}
            onChange={(value) => setDraft({ ...draft, contract_type: value })}
            options={contractTypeOptions}
          />
        </div>
        <textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} rows={5} placeholder="Termos do contrato..." className="mt-3 w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
        <button onClick={() => save.mutate()} disabled={!draft.title || !draft.body} className="mt-3 rounded-full bg-olive px-4 py-2 text-sm text-ivory disabled:opacity-50">Salvar contrato</button>
      </Card>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {(contracts.data ?? []).map((contract: any) => {
          const sigs = signaturesFor(contract.id);
          return (
            <Card key={contract.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{contract.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{contract.contract_type} · {new Date(contract.created_at).toLocaleDateString("pt-BR")}</p>
                </div>
                <Pill tone={contract.status === "signed" ? "moss" : contract.status === "active" ? "olive" : "gold"}>{contract.status}</Pill>
              </div>
              <p className="mt-4 line-clamp-4 text-sm leading-6 text-foreground/80">{contract.body}</p>

              {sigs.length > 0 && (
                <div className="mt-4 space-y-2 rounded-2xl border border-moss/25 bg-moss/5 p-3">
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground">Assinaturas registradas</p>
                  {sigs.map((signature: any) => (
                    <div key={signature.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="min-w-0 truncate text-foreground">
                        {signature.signer_name ?? signature.signer_email} · {new Date(signature.signed_at).toLocaleString("pt-BR")} · IP {signature.ip_address}
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
                  {sign.isPending ? "Assinando..." : "Assinar eletronicamente"}
                </button>
                <button onClick={() => downloadPdf(`${contract.title}.pdf`, contract.title, [contract.body])} className="rounded-full border border-border px-3 py-1.5 text-xs">Gerar PDF</button>
                <button onClick={() => setStatus(contract.id, "active")} className="rounded-full bg-olive px-3 py-1.5 text-xs text-ivory">Aprovar</button>
                <button onClick={() => setStatus(contract.id, "void")} className="rounded-full border border-wine/25 px-3 py-1.5 text-xs text-wine">Anular</button>
              </div>
            </Card>
          );
        })}
      </div>
      {contracts.data?.length === 0 && <div className="mt-6"><EmptyState title="Ainda não há contratos" hint="Crie o primeiro contrato, assine eletronicamente e exporte em PDF." /></div>}
    </>
  );
}
