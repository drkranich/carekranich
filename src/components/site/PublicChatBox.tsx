import { useMutation, useQuery } from "@tanstack/react-query";
import { MessageCircle, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type ChatSession = { threadId: string; name: string; email: string };

function loadSession(): ChatSession | null {
  try {
    const raw = typeof window !== "undefined" ? window.sessionStorage.getItem("ck-public-chat") : null;
    return raw ? (JSON.parse(raw) as ChatSession) : null;
  } catch {
    return null;
  }
}

export function PublicChatBox() {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<ChatSession | null>(() => loadSession());
  const [form, setForm] = useState({ name: "", email: "", message: "", company: "" });
  const [reply, setReply] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const canSend = form.name.trim().length >= 2 && /\S+@\S+\.\S+/.test(form.email.trim()) && form.message.trim().length >= 3;

  const persistSession = (value: ChatSession | null) => {
    setSession(value);
    try {
      if (value) window.sessionStorage.setItem("ck-public-chat", JSON.stringify(value));
      else window.sessionStorage.removeItem("ck-public-chat");
    } catch {
      // sessionStorage is unavailable - the conversation continues in memory.
    }
  };

  const messages = useQuery({
    queryKey: ["public-chat-messages", session?.threadId],
    enabled: !!session && open,
    refetchInterval: 5000,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_public_chat_messages", {
        _thread_id: session!.threadId,
        _email: session!.email,
      });
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.data?.length, open]);

  const send = useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase as any).rpc("create_public_chat_thread", {
        _name: form.name,
        _email: form.email,
        _message: form.message,
        _page: typeof window !== "undefined" ? window.location.href : "",
        _company: form.company,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      if (data?.thread_id) {
        persistSession({ threadId: data.thread_id, name: form.name.trim(), email: form.email.trim().toLowerCase() });
      }
      setForm({ name: "", email: "", message: "", company: "" });
      toast.success("Mensagem enviada — a conversa fica aberta aqui, ao vivo");
    },
    onError: (error: any) => {
      const subject = encodeURIComponent(`Care Kranich chat - ${form.name || "Website contact"}`);
      const body = encodeURIComponent(`${form.message}\n\nName: ${form.name}\nEmail: ${form.email}\nPage: ${window.location.href}`);
      if (String(error.message ?? "").toLowerCase().includes("function")) {
        window.location.href = `mailto:carekranich@gmail.com?subject=${subject}&body=${body}`;
        toast.info("Public inbox is waiting for secure activation. Opening email as a fallback.");
        return;
      }
      toast.error(error.message ?? "Could not send the message");
    },
  });

  const sendReply = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error("Chat session expired");
      const { error } = await (supabase as any).rpc("reply_public_chat_thread", {
        _thread_id: session.threadId,
        _email: session.email,
        _name: session.name,
        _message: reply,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setReply("");
      messages.refetch();
    },
    onError: (error: any) => toast.error(error.message ?? "Could not send"),
  });

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="mb-3 w-[calc(100vw-2.5rem)] max-w-sm overflow-hidden rounded-3xl border border-white/75 bg-white/78 shadow-elevated backdrop-blur-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-white/65 bg-baby/20 px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-olive">Chat Care Kranich</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {session ? "Conversa ao vivo com a equipe." : "Fale com a equipe Care Kranich pelo site."}
              </p>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-full bg-white/65 p-2 text-olive hover:bg-white">
              <X className="h-4 w-4" />
            </button>
          </div>

          {session ? (
            <div className="flex max-h-[26rem] flex-col">
              <div ref={scrollRef} className="app-scrollbar flex-1 space-y-2 overflow-y-auto px-4 py-3">
                {(messages.data ?? []).map((item: any) => (
                  <div key={item.id} className={`flex ${item.is_visitor ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-5 shadow-soft ${
                        item.is_visitor ? "bg-olive text-ivory" : "border border-white/70 bg-white/80 text-foreground"
                      }`}
                    >
                      {!item.is_visitor && <p className="mb-0.5 text-[10px] font-semibold uppercase text-olive">{item.sender_label}</p>}
                      <p className="whitespace-pre-wrap">{item.body}</p>
                      <p className={`mt-1 text-[10px] ${item.is_visitor ? "text-ivory/70" : "text-muted-foreground"}`}>
                        {new Date(item.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
                {messages.isLoading && <p className="py-4 text-center text-xs text-muted-foreground">Carregando conversa...</p>}
              </div>
              <div className="flex items-center gap-2 border-t border-white/65 p-3">
                <input
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && reply.trim()) sendReply.mutate();
                  }}
                  placeholder="Escreva sua mensagem..."
                  className="min-w-0 flex-1 rounded-full border border-white/70 bg-ivory/75 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-olive/25"
                />
                <button
                  onClick={() => sendReply.mutate()}
                  disabled={sendReply.isPending || !reply.trim()}
                  className="rounded-full bg-olive p-2.5 text-ivory disabled:opacity-45"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <button
                onClick={() => persistSession(null)}
                className="border-t border-white/65 py-2 text-center text-[11px] text-muted-foreground hover:text-wine"
              >
                Encerrar conversa
              </button>
            </div>
          ) : (
            <div className="space-y-3 p-5">
              <input
                value={form.company}
                onChange={(event) => setForm({ ...form, company: event.target.value })}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="hidden"
              />
              <input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Your name"
                className="w-full rounded-xl border border-white/70 bg-ivory/75 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-olive/25"
              />
              <input
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                placeholder="Your email"
                type="email"
                className="w-full rounded-xl border border-white/70 bg-ivory/75 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-olive/25"
              />
              <textarea
                value={form.message}
                onChange={(event) => setForm({ ...form, message: event.target.value })}
                placeholder="Como podemos ajudar?"
                rows={4}
                className="w-full resize-none rounded-xl border border-white/70 bg-ivory/75 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-olive/25"
              />
              <button
                onClick={() => send.mutate()}
                disabled={send.isPending || !canSend}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-olive px-4 py-3 text-sm font-semibold text-ivory disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Send className="h-4 w-4" />
                {send.isPending ? "Enviando..." : "Iniciar conversa"}
              </button>
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center gap-2 rounded-full border border-white/75 bg-olive px-5 py-3 text-sm font-semibold text-ivory shadow-elevated transition hover:-translate-y-0.5"
      >
        <MessageCircle className="h-4 w-4" />
        Chat
      </button>
    </div>
  );
}
