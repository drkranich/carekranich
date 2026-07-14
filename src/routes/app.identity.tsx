import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Card, PageHeader, Pill, Stat } from "@/components/app/primitives";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/app/identity")({ component: Identity });

function Identity() {
  const { profile, user, isSuperAdmin } = useAuth();
  const qc = useQueryClient();
  const checks = useQuery({
    queryKey: ["identity-verifications", profile?.tenant_id, user?.id, isSuperAdmin],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("identity_verifications").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const start = async () => {
    if (!user) return;
    const { error } = await (supabase as any).from("identity_verifications").upsert(
      {
        tenant_id: profile?.tenant_id,
        user_id: user.id,
        subject_type: profile?.user_kind === "clinic" ? "company_admin" : "person",
        provider: "stripe_identity",
        status: "pending_provider_session",
        required: true,
        metadata: {
          next_step: "Create Stripe Identity verification_session on trusted server and redirect user.",
        },
      },
      { onConflict: "user_id,provider" },
    );
    if (error) toast.error(error.message);
    else {
      toast.success("Verification requirement recorded");
      qc.invalidateQueries({ queryKey: ["identity-verifications", profile?.tenant_id, user?.id, isSuperAdmin] });
    }
  };

  const markVerified = async (id: string) => {
    const { error } = await (supabase as any).rpc("review_identity_verification", {
      _verification_id: id,
      _status: "verified",
    });
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["identity-verifications", profile?.tenant_id, user?.id, isSuperAdmin] });
  };

  return (
    <>
      <PageHeader
        title="Facial verification"
        subtitle="Every person or company admin must pass provider-based face/liveness verification. Raw biometric images are not stored in Care Kranich."
        action={<Pill tone="olive">Stripe Identity ready</Pill>}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Checks" value={checks.data?.length ?? "-"} sub="Visible by permission" tone="olive" />
        <Stat label="Verified" value={(checks.data ?? []).filter((c: any) => c.status === "verified").length} sub="Approved identity" tone="moss" />
        <Stat label="Pending" value={(checks.data ?? []).filter((c: any) => c.status !== "verified").length} sub="Needs provider session" tone="gold" />
      </div>
      <Card className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">My verification</h2>
            <p className="mt-1 text-sm text-muted-foreground">This records the requirement now; the actual liveness session must be issued by a trusted Stripe Identity server endpoint.</p>
          </div>
          <button onClick={start} className="inline-flex items-center gap-2 rounded-full bg-olive px-4 py-2 text-sm text-ivory">
            <Camera className="h-4 w-4" />
            Start verification
          </button>
        </div>
      </Card>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {(checks.data ?? []).map((check: any) => (
          <Card key={check.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-foreground">{check.subject_type}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{check.provider} · {check.provider_session_id ?? "no provider session yet"}</p>
              </div>
              <Pill tone={check.status === "verified" ? "moss" : "gold"}>{check.status}</Pill>
            </div>
            <p className="mt-4 text-sm leading-6 text-foreground/80">{check.metadata?.next_step ?? "Awaiting verification provider result."}</p>
            {isSuperAdmin && check.status !== "verified" && (
              <button onClick={() => markVerified(check.id)} className="mt-4 inline-flex items-center gap-2 rounded-full bg-olive px-3 py-1.5 text-xs text-ivory">
                <ShieldCheck className="h-3 w-3" />
                Mark verified
              </button>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}
