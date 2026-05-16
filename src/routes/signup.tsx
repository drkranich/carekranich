import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/signup")({ component: Signup });

function Signup() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null); setInfo(null);
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: { full_name: fullName },
      },
    });
    setLoading(false);
    if (error) return setError(error.message);
    if (data.session) navigate({ to: "/app" });
    else setInfo("Check your email to confirm your account, then sign in.");
  };

  return (
    <div className="min-h-screen grid place-items-center bg-background px-4">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-soft">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-olive text-ivory">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2c3 4 5 7 5 11a5 5 0 1 1-10 0c0-4 2-7 5-11z" /></svg>
          </div>
          <span className="font-display text-xl text-olive">Olia</span>
        </Link>
        <h1 className="mt-6 font-display text-2xl text-foreground">Create your account</h1>
        <p className="mt-1 text-sm text-muted-foreground">Start caring with calm intelligence.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="text-foreground/80">Full name</span>
            <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive/40" />
          </label>
          <label className="block text-sm">
            <span className="text-foreground/80">Email</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive/40" />
          </label>
          <label className="block text-sm">
            <span className="text-foreground/80">Password</span>
            <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive/40" />
          </label>
          {error && <p className="rounded-lg bg-wine/10 px-3 py-2 text-xs text-wine">{error}</p>}
          {info && <p className="rounded-lg bg-moss/10 px-3 py-2 text-xs text-moss">{info}</p>}
          <button disabled={loading} className="w-full rounded-full bg-olive px-4 py-2.5 text-sm text-ivory hover:opacity-90 disabled:opacity-50">
            {loading ? "Creating…" : "Create account"}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Already have one? <Link to="/login" className="text-olive hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
