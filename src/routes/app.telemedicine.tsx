import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Video } from "lucide-react";
import { toast } from "sonner";
import { Card, EmptyState, PageHeader, Pill } from "@/components/app/primitives";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/telemedicine")({
  component: Telemedicine,
});

function Telemedicine() {
  const qc = useQueryClient();
  const { profile, user, isSuperAdmin } = useAuth();
  const [subject, setSubject] = useState("Telemedicine request");
  const [message, setMessage] = useState("");

  const telemed = useQuery({
    queryKey: ["telemedicine-real", profile?.tenant_id, isSuperAdmin],
    enabled: !!profile?.tenant_id || isSuperAdmin,
    queryFn: async () => {
      const db = supabase as any;
      const [threads, events, doctors] = await Promise.all([
        db.from("inbox_threads").select("id,subject,status,priority,source,last_message_at,created_at").eq("source", "telemedicine").order("last_message_at", { ascending: false }).limit(100),
        db.from("events").select("id,title,description,category,severity,occurred_at").eq("category", "telemedicine").order("occurred_at", { ascending: false }).limit(100),
        db.from("user_roles").select("user_id,role,tenant_id").eq("role", "doctor").limit(200),
      ]);
      const errors = [threads, events, doctors].map((item) => item.error?.message).filter(Boolean);
      if (errors.length) throw new Error(errors.join(" | "));
      return { threads: threads.data ?? [], events: events.data ?? [], doctors: doctors.data ?? [] };
    },
  });

  const createRequest = async () => {
    if (!profile?.tenant_id || !user || !subject.trim()) {
      return toast.error("Create or join an organization before opening a telemedicine request.");
    }
    const { data: thread, error: threadError } = await (supabase as any)
      .from("inbox_threads")
      .insert({
        tenant_id: profile.tenant_id,
        subject: subject.trim(),
        source: "telemedicine",
        status: "open",
        priority: "normal",
        created_by: user.id,
      })
      .select("id")
      .single();
    if (threadError) return toast.error(threadError.message);
    const { error: messageError } = await (supabase as any).from("inbox_messages").insert({
      thread_id: thread.id,
      sender_id: user.id,
      sender_label: "Telemedicine",
      body: message.trim() || "Telemedicine request created.",
      channel: "in_app",
    });
    if (messageError) return toast.error(messageError.message);
    toast.success("Telemedicine request created");
    setMessage("");
    qc.invalidateQueries({ queryKey: ["telemedicine-real"] });
  };

  return (
    <>
      <PageHeader
        title="Telemedicine"
        subtitle="Telemedicine requests and clinical events from real inbox/event records. Video visits can be connected after provider setup."
        action={<Pill tone={telemed.isError ? "wine" : "olive"}>{telemed.isError ? "Read error" : "Inbox-backed"}</Pill>}
      />

      {telemed.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading telemedicine records...</p>
      ) : telemed.isError ? (
        <Card className="border-wine/25 bg-wine/5">
          <p className="font-medium text-wine">Could not load telemedicine.</p>
          <p className="mt-2 text-sm text-muted-foreground">{(telemed.error as Error).message}</p>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
          <Card>
            <div className="flex items-center gap-3">
              <Video className="h-5 w-5 text-olive" />
              <h2 className="text-xl font-semibold text-foreground">Request consultation</h2>
            </div>
            <div className="mt-4 space-y-3">
              <input value={subject} onChange={(event) => setSubject(event.target.value)} className="w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
              <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={4} placeholder="Reason, symptoms, availability..." className="w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
              <button onClick={createRequest} disabled={!profile?.tenant_id} className="w-full rounded-xl bg-olive px-4 py-2 text-sm text-ivory disabled:opacity-50">Create inbox request</button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">{telemed.data?.doctors.length ?? 0} doctor role records visible.</p>
            <div className="mt-4 rounded-2xl border border-baby/45 bg-baby/18 p-4">
              <Pill tone="gold">Google Meet planned</Pill>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Future integration: create Google Meet links automatically for approved telemedicine requests.
              </p>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <MessageCircle className="h-5 w-5 text-olive" />
              <h2 className="text-xl font-semibold text-foreground">Telemedicine threads</h2>
            </div>
            {(telemed.data?.threads ?? []).length === 0 ? (
              <div className="mt-5">
                <EmptyState title="No telemedicine requests" hint="Create a consultation request to start a real inbox thread." />
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {(telemed.data?.threads ?? []).map((thread: any) => (
                  <div key={thread.id} className="rounded-2xl border border-border/60 bg-cream/40 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-foreground">{thread.subject}</p>
                      <Pill tone={thread.status === "closed" ? "muted" : "olive"}>{thread.status}</Pill>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{new Date(thread.last_message_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="lg:col-span-2">
            <h2 className="text-xl font-semibold text-foreground">Telemedicine events</h2>
            <div className="mt-4 space-y-3">
              {(telemed.data?.events ?? []).map((event: any) => (
                <div key={event.id} className="rounded-2xl border border-border/60 bg-cream/40 p-4">
                  <p className="font-medium text-foreground">{event.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{event.description ?? "No description."}</p>
                </div>
              ))}
              {(telemed.data?.events ?? []).length === 0 && <p className="text-sm text-muted-foreground">No telemedicine events recorded.</p>}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
