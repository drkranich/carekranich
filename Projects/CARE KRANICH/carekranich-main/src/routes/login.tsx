import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setError(error.message);
    navigate({ to: "/app" });
  };

  const signInWithGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/app` },
    });
    if (error) {
      setGoogleLoading(false);
      setError(
        error.message.includes("provider is not enabled")
          ? "Login com Google ainda não habilitado. Ative o provedor Google em Supabase → Authentication → Providers."
          : error.message,
      );
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-background px-4">
      <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white/60 p-8 shadow-soft backdrop-blur-2xl">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-olive text-ivory">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2c3 4 5 7 5 11a5 5 0 1 1-10 0c0-4 2-7 5-11z" /></svg>
          </div>
          <span className="font-display text-xl text-olive">Care Kranich</span>
        </Link>
        <h1 className="mt-6 font-display text-2xl text-foreground">Bem-vindo de volta</h1>
        <p className="mt-1 text-sm text-muted-foreground">Entre para continuar cuidando.</p>

        <button
          onClick={signInWithGoogle}
          disabled={googleLoading}
          className="mt-6 flex w-full items-center justify-center gap-3 rounded-full border border-white/70 bg-white/70 px-4 py-2.5 text-sm font-medium text-foreground shadow-soft backdrop-blur-xl transition hover:bg-white/90 disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          {googleLoading ? "Redirecionando..." : "Entrar com Google"}
        </button>

        <div className="mt-5 flex items-center gap-3 text-[11px] uppercase text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> ou com e-mail <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <label className="block text-sm">
            <span className="text-foreground/80">E-mail</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive/40" />
          </label>
          <label className="block text-sm">
            <span className="text-foreground/80">Senha</span>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive/40" />
          </label>
          {error && <p className="rounded-lg bg-wine/10 px-3 py-2 text-xs text-wine">{error}</p>}
          <button disabled={loading} className="w-full rounded-full bg-olive px-4 py-2.5 text-sm text-ivory hover:opacity-90 disabled:opacity-50">
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Novo por aqui? <Link to="/signup" className="text-olive hover:underline">Criar uma conta</Link>
        </p>
      </div>
    </div>
  );
}
