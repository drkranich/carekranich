import { useMutation } from "@tanstack/react-query";
import { MessageCircle, Send, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function PublicChatBox() {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  const send = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).rpc("create_public_chat_thread", {
        _name: form.name,
        _email: form.email,
        _message: form.message,
        _page: typeof window !== "undefined" ? window.location.href : "",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setSent(true);
      setForm({ name: "", email: "", message: "" });
      toast.success("Mensagem enviada para a equipe Care Kranich");
    },
    onError: (error: any) => {
      const subject = encodeURIComponent(`Chat Care Kranich - ${form.name || "Contato do site"}`);
      const body = encodeURIComponent(`${form.message}\n\nNome: ${form.name}\nEmail: ${form.email}\nPagina: ${window.location.href}`);
      if (String(error.message ?? "").toLowerCase().includes("function")) {
        window.location.href = `mailto:carekranich@gmail.com?subject=${subject}&body=${body}`;
        toast.info("Inbox publico aguardando ativacao segura. Abrindo e-mail como fallback.");
        return;
      }
      toast.error(error.message ?? "Nao foi possivel enviar a mensagem");
    },
  });

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="mb-3 w-[calc(100vw-2.5rem)] max-w-sm overflow-hidden rounded-3xl border border-white/75 bg-white/78 shadow-elevated backdrop-blur-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-white/65 bg-baby/20 px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-olive">Chat Care Kranich</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Fale com a equipe Care Kranich pelo site.</p>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-full bg-white/65 p-2 text-olive hover:bg-white">
              <X className="h-4 w-4" />
            </button>
          </div>

          {sent ? (
            <div className="p-5">
              <p className="text-sm font-medium text-foreground">Recebemos sua mensagem.</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Ela foi enviada para a caixa de entrada do time Care Kranich.</p>
              <button onClick={() => setSent(false)} className="mt-5 rounded-full bg-olive px-4 py-2 text-xs font-semibold text-ivory">
                Nova mensagem
              </button>
            </div>
          ) : (
            <div className="space-y-3 p-5">
              <input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Seu nome"
                className="w-full rounded-xl border border-white/70 bg-ivory/75 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-olive/25"
              />
              <input
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                placeholder="Seu e-mail"
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
                disabled={send.isPending || form.name.trim().length < 2 || form.message.trim().length < 3}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-olive px-4 py-3 text-sm font-semibold text-ivory disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Send className="h-4 w-4" />
                {send.isPending ? "Enviando..." : "Enviar mensagem"}
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
