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

function roomUrl(threadId: string) {
  return `https://meet.jit.si/carekranich-${threadId.slice(0, 13)}`;
}

function Telemedicine() {
  const qc = useQueryClient();
  const { profile, user, isSuperAdmin } = useAuth();
  const [subject, setSubject] = useState("Consulta de telemedicina");
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
      return toast.error("Crie ou entre em uma organização antes de abrir uma solicitação de telemedicina.");
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
      sender_label: "Telemedicina",
      body: message.trim() || "Solicitação de telemedicina criada.",
      channel: "in_app",
    });
    if (messageError) return toast.error(messageError.message);
    toast.success("Solicitação de telemedicina criada");
    setMessage("");
    qc.invalidateQueries({ queryKey: ["telemedicine-real"] });
  };

  const startVideoCall = async (thread: any) => {
    const url = roomUrl(thread.id);
    if (user) {
      await (supabase as any).from("inbox_messages").insert({
        thread_id: thread.id,
        sender_id: user.id,
        sender_label: "Telemedicina",
        body: `Sala de vídeo criada: ${url}`,
        channel: "in_app",
      });
      qc.invalidateQueries({ queryKey: ["telemedicine-real"] });
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <PageHeader
        title="Telemedicina"
        subtitle="Solicitações e eventos clínicos reais, com sala de vídeo instantânea por consulta."
        action={<Pill tone={telemed.isError ? "wine" : "olive"}>{telemed.isError ? "Erro de leitura" : "Vídeo integrado"}</Pill>}
      />

      {telemed.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando registros de telemedicina...</p>
      ) : telemed.isError ? (
        <Card className="border-wine/25 bg-wine/5">
          <p className="font-medium text-wine">Não foi possível carregar a telemedicina.</p>
          <p className="mt-2 text-sm text-muted-foreground">{(telemed.error as Error).message}</p>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
          <Card>
            <div className="flex items-center gap-3">
              <Video className="h-5 w-5 text-olive" />
              <h2 className="text-xl font-semibold text-foreground">Solicitar consulta</h2>
            </div>
            <div className="mt-4 space-y-3">
              <input value={subject} onChange={(event) => setSubject(event.target.value)} className="w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
              <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={4} placeholder="Motivo, sintomas, disponibilidade..." className="w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
              <button onClick={createRequest} disabled={!profile?.tenant_id} className="w-full rounded-xl bg-olive px-4 py-2 text-sm text-ivory disabled:opacity-50">Criar solicitação</button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">{telemed.data?.doctors.length ?? 0} médicos visíveis na plataforma.</p>
            <div className="mt-4 rounded-2xl border border-baby/45 bg-baby/18 p-4">
              <Pill tone="gold">Google Meet planejado</Pill>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                As salas atuais usam vídeo seguro instantâneo (Jitsi) sem necessidade de conta. A criação automática de
                links do Google Meet será conectada quando as credenciais da API Google forem configuradas.
              </p>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <MessageCircle className="h-5 w-5 text-olive" />
              <h2 className="text-xl font-semibold text-foreground">Consultas de telemedicina</h2>
            </div>
            {(telemed.data?.threads ?? []).length === 0 ? (
              <div className="mt-5">
                <EmptyState title="Nenhuma solicitação de telemedicina" hint="Crie uma solicitação de consulta para iniciar uma conversa real." />
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {(telemed.data?.threads ?? []).map((thread: any) => (
                  <div key={thread.id} className="rounded-2xl border border-border/60 bg-cream/40 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-foreground">{thread.subject}</p>
                      <div className="flex items-center gap-2">
                        <Pill tone={thread.status === "closed" ? "muted" : "olive"}>{thread.status === "closed" ? "encerrada" : "aberta"}</Pill>
                        <button
                          onClick={() => startVideoCall(thread)}
                          className="inline-flex items-center gap-1.5 rounded-full bg-olive px-3 py-1.5 text-xs font-semibold text-ivory hover:opacity-90"
                        >
                          <Video className="h-3.5 w-3.5" />
                          Entrar na sala de vídeo
                        </button>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{new Date(thread.last_message_at).toLocaleString("pt-BR")}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="lg:col-span-2">
            <h2 className="text-xl font-semibold text-foreground">Eventos de telemedicina</h2>
            <div className="mt-4 space-y-3">
              {(telemed.data?.events ?? []).map((event: any) => (
                <div key={event.id} className="rounded-2xl border border-border/60 bg-cream/40 p-4">
                  <p className="font-medium text-foreground">{event.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{event.description ?? "Sem descrição."}</p>
                </div>
              ))}
              {(telemed.data?.events ?? []).length === 0 && <p className="text-sm text-muted-foreground">Nenhum evento de telemedicina registrado.</p>}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
