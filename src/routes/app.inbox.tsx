import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { Card, EmptyState, PageHeader, Pill } from "@/components/app/primitives";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/app/inbox")({ component: Inbox });

function Inbox() {
  const { profile, user, isSuperAdmin } = useAuth();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [reply, setReply] = useState("");

  const threads = useQuery({
    queryKey: ["inbox-threads", profile?.tenant_id, isSuperAdmin],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("inbox_threads")
        .select("*")
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const selected = useMemo(() => (threads.data ?? []).find((item: any) => item.id === selectedId) ?? (threads.data ?? [])[0], [threads.data, selectedId]);

  const messages = useQuery({
    queryKey: ["inbox-messages", selected?.id],
    enabled: !!selected?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("inbox_messages")
        .select("*")
        .eq("thread_id", selected.id)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const createThread = useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase as any)
        .from("inbox_threads")
        .insert({
          tenant_id: profile?.tenant_id,
          subject,
          source: "saas",
          created_by: user?.id,
          participant_user_id: user?.id,
        })
        .select("id")
        .single();
      if (error) throw error;
      const { error: messageError } = await (supabase as any).from("inbox_messages").insert({
        thread_id: data.id,
        sender_id: user?.id,
        sender_label: profile?.full_name ?? user?.email,
        body,
        channel: "in_app",
      });
      if (messageError) throw messageError;
      return data.id;
    },
    onSuccess: (id) => {
      toast.success("Thread created");
      setSubject("");
      setBody("");
      setSelectedId(id);
      qc.invalidateQueries({ queryKey: ["inbox-threads", profile?.tenant_id, isSuperAdmin] });
    },
    onError: (error: any) => toast.error(error.message ?? "Could not create thread"),
  });

  const sendReply = async () => {
    if (!selected?.id || !reply.trim()) return;
    const { error } = await (supabase as any).from("inbox_messages").insert({
      thread_id: selected.id,
      sender_id: user?.id,
      sender_label: profile?.full_name ?? user?.email,
      body: reply,
      channel: "in_app",
    });
    if (error) toast.error(error.message);
    else {
      setReply("");
      qc.invalidateQueries({ queryKey: ["inbox-messages", selected.id] });
    }
  };

  return (
    <>
      <PageHeader title="Inbox" subtitle="One place for public-site chat, SaaS users, customers and internal conversations." action={<Pill tone="olive">In-app live record</Pill>} />
      <Card className="mb-6">
        <h2 className="text-xl font-semibold text-foreground">Start conversation</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
          <button onClick={() => createThread.mutate()} disabled={!subject || !body} className="rounded-xl bg-olive px-4 py-2 text-sm text-ivory disabled:opacity-50">Create</button>
        </div>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Write the first message..." className="mt-3 w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
      </Card>
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <Card>
          <h2 className="text-lg font-semibold text-foreground">Threads</h2>
          <div className="mt-4 space-y-2">
            {(threads.data ?? []).map((thread: any) => (
              <button key={thread.id} onClick={() => setSelectedId(thread.id)} className={`block w-full rounded-2xl border p-3 text-left ${selected?.id === thread.id ? "border-olive/30 bg-olive/10" : "border-white/70 bg-white/50"}`}>
                <p className="font-medium text-foreground">{thread.subject}</p>
                <p className="mt-1 text-xs text-muted-foreground">{thread.source} · {thread.status} · {thread.priority}</p>
              </button>
            ))}
            {threads.data?.length === 0 && <EmptyState title="No conversations" hint="Create a conversation or connect the public chat later." />}
          </div>
        </Card>
        <Card>
          {selected ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">{selected.subject}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">{selected.source} · {selected.status}</p>
                </div>
                <Pill tone="moss">{messages.data?.length ?? 0} messages</Pill>
              </div>
              <div className="mt-5 space-y-3">
                {(messages.data ?? []).map((message: any) => (
                  <div key={message.id} className={`rounded-2xl p-4 ${message.sender_id === user?.id ? "ml-auto max-w-[82%] bg-olive text-ivory" : "max-w-[82%] bg-cream/80 text-foreground"}`}>
                    <p className="text-sm leading-6">{message.body}</p>
                    <p className={`mt-2 text-[10px] ${message.sender_id === user?.id ? "text-ivory/70" : "text-muted-foreground"}`}>{message.sender_label ?? "User"} · {new Date(message.created_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex gap-2">
                <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply..." className="flex-1 rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
                <button onClick={sendReply} className="rounded-xl bg-olive px-4 py-2 text-ivory"><Send className="h-4 w-4" /></button>
              </div>
            </>
          ) : (
            <EmptyState title="Select a conversation" hint="Messages will appear here." />
          )}
        </Card>
      </div>
    </>
  );
}
