import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, HeartHandshake, KeyRound, Sparkles, Stethoscope } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { GeoAddressField } from "@/components/app/GeoAddressField";
import type { GeoAddress } from "@/lib/geocoding";

export const Route = createFileRoute("/onboarding")({ component: Onboarding });

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "org";
}

type UseKind = "clinic" | "family" | "service_provider";

const USE_OPTIONS: { value: UseKind | "join"; title: string; description: string; icon: typeof Building2 }[] = [
  {
    value: "clinic",
    title: "Sou uma clínica ou instituição",
    description: "Casa de repouso, home care, clínica ou hospital que cuida de residentes e pacientes.",
    icon: Building2,
  },
  {
    value: "family",
    title: "Quero monitorar um ente querido",
    description: "Acompanhe a rotina, saúde e alertas de quem você ama, em tempo real.",
    icon: HeartHandshake,
  },
  {
    value: "service_provider",
    title: "Sou prestador de serviços",
    description: "Cuidadores, enfermeiros e profissionais que atendem pelo ecossistema Care Kranich.",
    icon: Stethoscope,
  },
  {
    value: "join",
    title: "Tenho um código de convite",
    description: "Entre em uma organização existente como equipe ou família convidada.",
    icon: KeyRound,
  },
];

function Onboarding() {
  const { user, profile, loading, refresh } = useAuth();
  const [step, setStep] = useState<"use" | "plans" | "form" | "join">("use");
  const [userKind, setUserKind] = useState<UseKind>("clinic");
  const [orgName, setOrgName] = useState("");
  const [address, setAddress] = useState<GeoAddress | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const plans = useQuery({
    queryKey: ["onboarding-plans"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("platform_plans")
        .select("id,name,audience,description,unit_amount,interval,features,active")
        .eq("active", true)
        .order("unit_amount");
      if (error) throw error;
      return data ?? [];
    },
  });

  if (loading) return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Carregando...</div>;
  if (!user) return <Navigate to="/login" />;
  if (profile?.tenant_id && profile.account_status === "active") return <Navigate to="/app" />;

  const pickUse = (value: UseKind | "join") => {
    setErr(null);
    if (value === "join") return setStep("join");
    setUserKind(value);
    setStep("plans");
  };

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const slug = `${slugify(orgName)}-${Math.random().toString(36).slice(2, 6)}`;
      const { error } = await (supabase as any).rpc("request_new_tenant", {
        _name: orgName,
        _slug: slug,
        _user_kind: userKind,
        _address: address ?? {},
      });
      if (error) throw error;
      await refresh();
      // Ativa o período de degustação de 15 dias na organização recém-solicitada
      const { data: fresh } = await (supabase as any)
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .maybeSingle();
      if (fresh?.tenant_id) {
        await (supabase as any).rpc("start_trial", { _tenant_id: fresh.tenant_id });
      }
      setErr("Pedido enviado com teste de 15 dias reservado. A equipe Care Kranich aprova seu acesso em breve.");
    } catch (e: any) { setErr(e.message ?? "Falha ao solicitar a criação da organização"); }
    finally { setBusy(false); }
  };

  const join = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const { error } = await (supabase as any).rpc("request_join_by_invite", {
        _invite_code: code.trim(),
      });
      if (error) throw error;
      await refresh();
      setErr("Pedido enviado. Um administrador precisa aprovar seu acesso antes da liberação.");
    } catch (e: any) { setErr(e.message ?? "Falha ao solicitar acesso"); }
    finally { setBusy(false); }
  };

  const plansForKind = (plans.data ?? []).filter((plan: any) => plan.audience === userKind);

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-3xl rounded-3xl border border-white/70 bg-white/60 p-8 shadow-soft backdrop-blur-2xl">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-olive text-ivory">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2c3 4 5 7 5 11a5 5 0 1 1-10 0c0-4 2-7 5-11z" /></svg>
          </div>
          <span className="font-display text-xl text-olive">Care Kranich</span>
        </div>
        <h1 className="mt-6 font-display text-2xl text-foreground">
          Bem-vindo{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
        </h1>

        {profile?.account_status && profile.account_status !== "active" && profile.tenant_id && (
          <div className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${
            profile.account_status === "rejected"
              ? "border-wine/25 bg-wine/10 text-wine"
              : "border-gold/25 bg-gold/10 text-foreground"
          }`}>
            {profile.account_status === "rejected"
              ? "Este pedido de acesso foi rejeitado. Fale com o suporte Care Kranich antes de tentar novamente."
              : "Seu pedido de acesso está aguardando aprovação. Você entrará no SaaS assim que for aprovado."}
          </div>
        )}

        {step === "use" && (
          <>
            <p className="mt-1 text-sm text-muted-foreground">Para começar, conte para a gente como você vai usar a plataforma.</p>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {USE_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => pickUse(option.value)}
                    className="rounded-2xl border border-white/70 bg-white/50 p-5 text-left shadow-soft backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-olive/40 hover:bg-white/75"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-olive/10 text-olive">
                      <Icon className="h-5 w-5" />
                    </span>
                    <p className="mt-3 font-semibold text-foreground">{option.title}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{option.description}</p>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === "plans" && (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              Planos para {userKind === "clinic" ? "clínicas e instituições" : userKind === "family" ? "famílias" : "prestadores de serviços"} — todos começam com
              <span className="font-semibold text-olive"> 15 dias de teste grátis</span>, sem cartão.
            </p>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {plansForKind.map((plan: any) => (
                <div key={plan.id} className="rounded-2xl border border-white/70 bg-white/50 p-5 shadow-soft backdrop-blur-xl">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-foreground">{plan.name}</p>
                    <span className="rounded-full bg-baby/40 px-2.5 py-1 text-[10px] font-semibold uppercase text-olive">15 dias grátis</span>
                  </div>
                  <p className="mt-2 text-2xl font-semibold text-olive">
                    ${((plan.unit_amount ?? 0) / 100).toFixed(0)}
                    <span className="text-xs text-muted-foreground">/{plan.interval === "month" ? "mês" : plan.interval}</span>
                  </p>
                  {plan.description && <p className="mt-2 text-xs leading-5 text-muted-foreground">{plan.description}</p>}
                  <ul className="mt-3 space-y-1">
                    {(Array.isArray(plan.features) ? plan.features.slice(0, 4) : []).map((feature: string) => (
                      <li key={feature} className="flex items-center gap-1.5 text-xs text-foreground/80">
                        <Sparkles className="h-3 w-3 flex-none text-olive" /> {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {plansForKind.length === 0 && !plans.isLoading && (
                <p className="rounded-2xl border border-gold/25 bg-gold/10 px-4 py-3 text-sm text-foreground md:col-span-2">
                  Os planos para este perfil estão sendo preparados — você começa com os 15 dias de teste grátis normalmente.
                </p>
              )}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <button onClick={() => setStep("form")} className="rounded-full bg-olive px-6 py-2.5 text-sm font-semibold text-ivory hover:opacity-90">
                Começar teste grátis de 15 dias
              </button>
              <button onClick={() => setStep("use")} className="rounded-full border border-border bg-white/55 px-4 py-2.5 text-sm">
                Voltar
              </button>
            </div>
          </>
        )}

        {step === "form" && (
          <form onSubmit={create} className="mt-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              {userKind === "family"
                ? "Dê um nome ao espaço de cuidado da sua família (ex.: Família Lopes)."
                : "Dados da sua organização para criarmos o ambiente."}
            </p>
            <label className="block text-sm">
              <span className="text-foreground/80">{userKind === "family" ? "Nome do espaço da família *" : "Nome da organização *"}</span>
              <input required value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder={userKind === "family" ? "Família Lopes" : "Clínica Vida Plena"} className="mt-1 w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive/40" />
            </label>
            <GeoAddressField label="Endereço" value={address} onChange={setAddress} />
            <p className="rounded-xl bg-cream/60 px-3 py-2 text-xs text-muted-foreground">
              Seu teste de 15 dias fica reservado agora. O acesso é liberado após a aprovação da equipe Care Kranich.
            </p>
            {err && <p className="rounded-lg bg-moss/10 px-3 py-2 text-xs text-foreground">{err}</p>}
            <div className="flex flex-wrap gap-2">
              <button disabled={busy} className="rounded-full bg-olive px-6 py-2.5 text-sm font-semibold text-ivory hover:opacity-90 disabled:opacity-50">
                {busy ? "Enviando..." : "Criar e iniciar teste grátis"}
              </button>
              <button type="button" onClick={() => setStep("plans")} className="rounded-full border border-border bg-white/55 px-4 py-2.5 text-sm">
                Voltar
              </button>
            </div>
          </form>
        )}

        {step === "join" && (
          <form onSubmit={join} className="mt-6 space-y-4">
            <label className="block text-sm">
              <span className="text-foreground/80">Código de convite *</span>
              <input required value={code} onChange={(e) => setCode(e.target.value)} placeholder="ex.: a1b2c3d4e5" className="mt-1 w-full rounded-xl border border-border bg-ivory px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-olive/40" />
            </label>
            <p className="rounded-xl bg-cream/60 px-3 py-2 text-xs text-muted-foreground">
              Peça o código ao administrador da organização. O pedido ainda passa por aprovação.
            </p>
            {err && <p className="rounded-lg bg-wine/10 px-3 py-2 text-xs text-wine">{err}</p>}
            <div className="flex flex-wrap gap-2">
              <button disabled={busy} className="rounded-full bg-olive px-6 py-2.5 text-sm font-semibold text-ivory hover:opacity-90 disabled:opacity-50">
                {busy ? "Enviando..." : "Solicitar acesso"}
              </button>
              <button type="button" onClick={() => setStep("use")} className="rounded-full border border-border bg-white/55 px-4 py-2.5 text-sm">
                Voltar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
