import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, ShieldCheck } from "lucide-react";
import { Card, EmptyState, PageHeader, Pill, Stat } from "@/components/app/primitives";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/academy")({ component: Academy });

function Academy() {
  const { profile, isSuperAdmin } = useAuth();

  const academy = useQuery({
    queryKey: ["academy-real-records", profile?.tenant_id, isSuperAdmin],
    enabled: !!profile?.tenant_id || isSuperAdmin,
    queryFn: async () => {
      const db = supabase as any;
      const [documents, identities, roles] = await Promise.all([
        db.from("documents").select("id,title,document_type,status,file_size,created_at").in("document_type", ["certification", "training", "license"]).order("created_at", { ascending: false }).limit(200),
        db.from("identity_verifications").select("id,user_id,status,required,created_at,reviewed_at").order("created_at", { ascending: false }).limit(200),
        db.from("user_roles").select("id,user_id,role,tenant_id").in("role", ["caregiver", "nurse", "doctor"]).limit(400),
      ]);
      const errors = [documents, identities, roles].map((item) => item.error?.message).filter(Boolean);
      if (errors.length) throw new Error(errors.join(" | "));
      return {
        documents: documents.data ?? [],
        identities: identities.data ?? [],
        roles: roles.data ?? [],
      };
    },
  });

  const certificates = academy.data?.documents ?? [];
  const verified = (academy.data?.identities ?? []).filter((item: any) => item.status === "verified").length;

  return (
    <>
      <PageHeader
        title="Caregiver academy"
        subtitle="Certification and training records from uploaded documents, identity checks and future learning modules."
        action={<Pill tone={academy.isError ? "wine" : "olive"}>{academy.isError ? "Read error" : "Real records"}</Pill>}
      />

      {academy.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading academy records...</p>
      ) : academy.isError ? (
        <Card className="border-wine/25 bg-wine/5">
          <p className="font-medium text-wine">Could not load academy records.</p>
          <p className="mt-2 text-sm text-muted-foreground">{(academy.error as Error).message}</p>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Stat label="Care staff roles" value={academy.data?.roles.length ?? 0} sub="Caregiver/nurse/doctor" tone="olive" />
            <Stat label="Certificates" value={certificates.length} sub="Uploaded documents" tone="gold" />
            <Stat label="Verified identities" value={verified} sub="Identity table" tone="moss" />
            <Stat label="LMS modules" value="0" sub="Ready for learning schema" tone="wine" />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
            <Card>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-olive/10 text-olive">
                  <GraduationCap className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Certification vault</h2>
                  <p className="text-xs text-muted-foreground">Only uploaded certification/training/license files appear here.</p>
                </div>
              </div>
              {certificates.length === 0 ? (
                <div className="mt-5">
                  <EmptyState title="No certifications uploaded" hint="Upload certification documents in Documents to populate Academy." />
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {certificates.map((doc: any) => (
                    <div key={doc.id} className="rounded-2xl border border-border/60 bg-cream/40 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-foreground">{doc.title}</p>
                        <Pill tone="olive">{doc.document_type}</Pill>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {doc.status} · {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-moss/10 text-moss">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">What is still needed</h2>
                  <p className="text-xs text-muted-foreground">Learning depth expands with module, attempt and certificate records.</p>
                </div>
              </div>
              <div className="mt-5 space-y-2 text-sm text-muted-foreground">
                <p className="rounded-2xl border border-border/60 bg-cream/40 p-3">Create LMS tables for modules, lessons, attempts and certificates.</p>
                <p className="rounded-2xl border border-border/60 bg-cream/40 p-3">Attach certificate expiration dates to uploaded documents.</p>
                <p className="rounded-2xl border border-border/60 bg-cream/40 p-3">Require verified identity before certifications unlock platform badges.</p>
              </div>
            </Card>
          </div>
        </>
      )}
    </>
  );
}
