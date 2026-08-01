import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/signup")({ component: Signup });

function validPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 14;
}

function Signup() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null); setInfo(null);
    if (!validPhone(phone)) {
      return setError("Enter a valid phone number, e.g. +1 202 555 0182.");
    }
    setLoading(true);
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const preferred = preferredName.trim() || fullName.trim().split(" ")[0];
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: { full_name: fullName, preferred_name: preferred, time_zone: tz, phone: phone.trim() },
      },
    });
    if (error) {
      setLoading(false);
      return setError(error.message);
    }
    if (data.session && data.user) {
      await (supabase as any).from("profiles").update({ phone: phone.trim(), time_zone: tz }).eq("id", data.user.id);
      setLoading(false);
      navigate({ to: "/onboarding" });
    } else {
      setLoading(false);
      setInfo("Check your email to confirm the account, then log in.");
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white/60 p-8 shadow-soft backdrop-blur-2xl">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-olive text-ivory">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2c3 4 5 7 5 11a5 5 0 1 1-10 0c0-4 2-7 5-11z" /></svg>
          </div>
          <span className="font-display text-xl text-olive">Care Kranich</span>
        </Link>
        <h1 className="mt-6 font-display text-2xl text-foreground">Create your account</h1>
        <p className="mt-1 text-sm text-muted-foreground">After signup, choose how you will use the platform - with a 15-day free trial.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="text-foreground/80">Full name *</span>
            <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive/40" />
          </label>
          <label className="block text-sm">
            <span className="text-foreground/80">Preferred name <span className="text-muted-foreground">(how we should call you)</span></span>
            <input value={preferredName} onChange={(e) => setPreferredName(e.target.value)} placeholder={fullName.trim().split(" ")[0] || "e.g. Nina"} className="mt-1 w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive/40" />
          </label>
          <label className="block text-sm">
            <span className="text-foreground/80">Phone *</span>
            <input
              required
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+55 (11) 99999-9999"
              className="mt-1 w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive/40"
            />
          </label>
          <label className="block text-sm">
            <span className="text-foreground/80">E-mail *</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive/40" />
          </label>
          <label className="block text-sm">
            <span className="text-foreground/80">Password *</span>
            <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive/40" />
          </label>
          {error && <p className="rounded-lg bg-wine/10 px-3 py-2 text-xs text-wine">{error}</p>}
          {info && <p className="rounded-lg bg-moss/10 px-3 py-2 text-xs text-moss">{info}</p>}
          <button disabled={loading} className="w-full rounded-full bg-olive px-4 py-2.5 text-sm text-ivory hover:opacity-90 disabled:opacity-50">
            {loading ? "Creating..." : "Create account"}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Already have an account? <Link to="/login" className="text-olive hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}
