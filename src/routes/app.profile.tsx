import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Globe2, Languages, Lock, MapPin, Search, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Avatar, Card, PageHeader, Pill } from "@/components/app/primitives";
import { GeoAddressField } from "@/components/app/GeoAddressField";
import { cleanDisplayNamePart, getDisplayName, useAuth, ROLE_LABELS } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { GeoAddress } from "@/lib/geocoding";

export const Route = createFileRoute("/app/profile")({ component: Profile });

type ProfileTab = "identity" | "location" | "preferences" | "security";

const tabs: { id: ProfileTab; label: string; icon: typeof UserRound }[] = [
  { id: "identity", label: "Identidade", icon: UserRound },
  { id: "location", label: "Location", icon: MapPin },
  { id: "preferences", label: "Preferences", icon: Languages },
  { id: "security", label: "Security", icon: Lock },
];

const baseLanguageCodes =
  "af,am,ar,az,be,bg,bn,bs,ca,cs,cy,da,de,el,en,es,et,eu,fa,fi,fil,fr,ga,gl,gu,he,hi,hr,hu,hy,id,is,it,ja,ka,kk,km,kn,ko,ky,lo,lt,lv,mk,ml,mn,mr,ms,my,nb,ne,nl,pa,pl,pt,ro,ru,si,sk,sl,sq,sr,sv,sw,ta,te,th,tr,uk,ur,uz,vi,zh,zu".split(",");

const featuredLocales = [
  "pt-BR",
  "pt-PT",
  "en-US",
  "en-GB",
  "es-ES",
  "es-MX",
  "fr-FR",
  "fr-CA",
  "de-DE",
  "it-IT",
  "nl-NL",
  "ar-SA",
  "zh-CN",
  "zh-TW",
  "ja-JP",
  "ko-KR",
];
const countryCodes =
  "AF,AX,AL,DZ,AS,AD,AO,AI,AQ,AG,AR,AM,AW,AU,AT,AZ,BS,BH,BD,BB,BY,BE,BZ,BJ,BM,BT,BO,BQ,BA,BW,BV,BR,IO,BN,BG,BF,BI,CV,KH,CM,CA,KY,CF,TD,CL,CN,CX,CC,CO,KM,CG,CD,CK,CR,CI,HR,CU,CW,CY,CZ,DK,DJ,DM,DO,EC,EG,SV,GQ,ER,EE,SZ,ET,FK,FO,FJ,FI,FR,GF,PF,TF,GA,GM,GE,DE,GH,GI,GR,GL,GD,GP,GU,GT,GG,GN,GW,GY,HT,HM,VA,HN,HK,HU,IS,IN,ID,IR,IQ,IE,IM,IL,IT,JM,JP,JE,JO,KZ,KE,KI,KP,KR,KW,KG,LA,LV,LB,LS,LR,LY,LI,LT,LU,MO,MG,MW,MY,MV,ML,MT,MH,MQ,MR,MU,YT,MX,FM,MD,MC,MN,ME,MS,MA,MZ,MM,NA,NR,NP,NL,NC,NZ,NI,NE,NG,NU,NF,MK,MP,NO,OM,PK,PW,PS,PA,PG,PY,PE,PH,PN,PL,PT,PR,QA,RE,RO,RU,RW,BL,SH,KN,LC,MF,PM,VC,WS,SM,ST,SA,SN,RS,SC,SL,SG,SX,SK,SI,SB,SO,ZA,GS,SS,ES,LK,SD,SR,SJ,SE,CH,SY,TW,TJ,TZ,TH,TL,TG,TK,TO,TT,TN,TR,TM,TC,TV,UG,UA,AE,GB,US,UM,UY,UZ,VU,VE,VN,VG,VI,WF,EH,YE,ZM,ZW".split(",");

function safeLocale(value: string) {
  try {
    return Intl.DateTimeFormat.supportedLocalesOf([value])[0] || "pt-BR";
  } catch {
    return "pt-BR";
  }
}

function localeLabel(locale: string, displayLocale: string) {
  const [language, region] = locale.split("-");
  const languageNames = new Intl.DisplayNames([displayLocale, "en"], { type: "language" });
  const regionNames = new Intl.DisplayNames([displayLocale, "en"], { type: "region" });
  const languageLabel = languageNames.of(language) ?? language;
  return region ? `${languageLabel} (${regionNames.of(region) ?? region})` : languageLabel;
}

function buildLanguageOptions(displayLocale: string, countries: { value: string; label: string }[]) {
  const languageNames = new Intl.DisplayNames([displayLocale, "en"], { type: "language" });
  const seen = new Set<string>();
  const options: { value: string; label: string }[] = [];
  const add = (option: { value: string; label: string }) => {
    if (seen.has(option.value)) return;
    seen.add(option.value);
    options.push(option);
  };

  featuredLocales.forEach((locale) => add({ value: locale, label: localeLabel(locale, displayLocale) }));
  baseLanguageCodes
    .map((code) => ({ value: code, label: languageNames.of(code) ?? code }))
    .sort((a, b) => a.label.localeCompare(b.label))
    .forEach(add);
  countries
    .map((country) => ({ value: `und-${country.value}`, label: `Local default (${country.label})` }))
    .sort((a, b) => a.label.localeCompare(b.label))
    .forEach(add);

  return options;
}

function Profile() {
  const { user, profile, roles, primaryRole, refresh, loading } = useAuth();
  const [tab, setTab] = useState<ProfileTab>("identity");
  const [fullName, setFullName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [phone, setPhone] = useState("");
  const [tz, setTz] = useState("");
  const [language, setLanguage] = useState("pt-BR");
  const [countryCode, setCountryCode] = useState("BR");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [geo, setGeo] = useState<GeoAddress | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const displayLocale = safeLocale(language);
  const countryOptions = useMemo(() => {
    const names = new Intl.DisplayNames([displayLocale, "en"], { type: "region" });
    return countryCodes
      .map((code) => ({ value: code, label: names.of(code) ?? code }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [displayLocale]);

  const languageOptions = useMemo(
    () => buildLanguageOptions(displayLocale, countryOptions),
    [countryOptions, displayLocale],
  );

  const timeZones = useMemo(() => {
    const values = (Intl as any).supportedValuesOf?.("timeZone") as string[] | undefined;
    return values?.length ? values : [Intl.DateTimeFormat().resolvedOptions().timeZone, "UTC"];
  }, []);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setPreferredName(cleanDisplayNamePart(profile.preferred_name));
    setPhone(profile.phone ?? "");
    setTz(profile.time_zone ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
    setLanguage(profile.preferred_language ?? "pt-BR");
    setCountryCode(profile.country_code ?? "BR");
    setCity(profile.city ?? "");
    setState(profile.state ?? "");
    setGeo(
      profile.address
        ? {
            address: profile.address,
            city: profile.city,
            state: profile.state,
            country: profile.country,
            country_code: profile.country_code,
            postal_code: null,
            latitude: profile.latitude,
            longitude: profile.longitude,
          }
        : null,
    );
  }, [profile]);

  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (!user || !profile) return <Navigate to="/login" />;

  const selectedCountry = countryOptions.find((item) => item.value === countryCode);
  const displayName = getDisplayName(profile, user.email);

  const save = async () => {
    setSaving(true);
    const cleanedFullName = fullName.trim();
    const cleanedPreferredName = cleanDisplayNamePart(preferredName);
    const payload = {
      full_name: cleanedFullName || null,
      preferred_name: cleanedPreferredName || null,
      phone,
      time_zone: tz,
      preferred_language: language,
      country: geo?.country ?? selectedCountry?.label ?? null,
      country_code: geo?.country_code ?? countryCode,
      state: geo?.state ?? state,
      city: geo?.city ?? city,
      address: geo?.address ?? null,
      latitude: geo?.latitude ?? null,
      longitude: geo?.longitude ?? null,
      location_raw: geo?.raw ?? {},
    };

    const { error } = await (supabase as any).from("profiles").update(payload).eq("id", user.id);
    if (!error && geo?.address) {
      await (supabase as any).from("address_locations").upsert(
        {
          tenant_id: profile.tenant_id,
          entity_type: "profile",
          entity_id: user.id,
          label: "primary",
          address: geo.address,
          city: geo.city,
          state: geo.state,
          country: geo.country,
          country_code: geo.country_code,
          postal_code: geo.postal_code,
          latitude: geo.latitude,
          longitude: geo.longitude,
          raw: geo.raw ?? {},
          created_by: user.id,
        },
        { onConflict: "entity_type,entity_id,label" },
      );
    }
    setSaving(false);

    if (error) toast.error(error.message);
    else {
      toast.success("Profile updated");
      await refresh();
    }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: ue } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (ue) {
      setUploading(false);
      return toast.error(ue.message);
    }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error: pe } = await supabase
      .from("profiles")
      .update({ avatar_url: pub.publicUrl })
      .eq("id", user.id);
    setUploading(false);
    if (pe) toast.error(pe.message);
    else {
      toast.success("Photo updated");
      await refresh();
    }
  };

  return (
    <>
      <PageHeader
        title="Your profile"
        subtitle="Identity, worldwide location, preferences and security in one glass panel."
        action={<Pill tone="olive">{primaryRole ? ROLE_LABELS[primaryRole] : "Member"}</Pill>}
      />

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card className="glass-panel">
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              <Avatar name={displayName || user.email || "?"} src={profile.avatar_url} size={124} tone="olive" />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 rounded-full bg-olive p-2.5 text-ivory shadow-soft hover:opacity-90"
                title="Change photo"
              >
                <Camera className="h-4 w-4" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
            </div>
            <h2 className="mt-5 text-2xl font-semibold">{displayName || user.email}</h2>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            {uploading && <p className="mt-2 text-xs text-muted-foreground">Enviando...</p>}
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {roles.map((r) => (
                <Pill key={r} tone="moss">{ROLE_LABELS[r]}</Pill>
              ))}
            </div>
          </div>
        </Card>

        <Card className="glass-panel">
          <div className="flex flex-wrap gap-2 border-b border-white/60 pb-4">
            {tabs.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition ${
                    tab === item.id ? "bg-olive text-ivory shadow-soft" : "bg-white/42 text-foreground/75 hover:bg-white/65"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="mt-6">
            {tab === "identity" && (
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Full name" value={fullName} onChange={setFullName} />
                <Field label="Preferred name" value={preferredName} onChange={setPreferredName} hint="Used in greetings across the SaaS." />
                <Field label="Phone" value={phone} onChange={setPhone} placeholder="+55 11 99999 9999" />
                <Readonly label="E-mail" value={user.email ?? "-"} />
              </div>
            )}

            {tab === "location" && (
              <div className="grid gap-5 lg:grid-cols-2">
                <GeoAddressField label="Address with worldwide GPS" value={geo} onChange={(value) => {
                  setGeo(value);
                  if (value?.city) setCity(value.city);
                  if (value?.state) setState(value.state);
                  if (value?.country_code) setCountryCode(value.country_code);
                }} />
                <div className="grid gap-4">
                  <GlassCombobox label="Country" value={countryCode} options={countryOptions} onChange={setCountryCode} />
                  <Field label="State / Region" value={state} onChange={setState} />
                  <Field label="City" value={city} onChange={setCity} />
                  <Readonly
                    label="Coordinates"
                    value={geo?.latitude && geo?.longitude ? `${geo.latitude.toFixed(6)}, ${geo.longitude.toFixed(6)}` : "Waiting for GPS address"}
                  />
                </div>
              </div>
            )}

            {tab === "preferences" && (
              <div className="grid gap-5 lg:grid-cols-2">
                <GlassCombobox label="Time zone" value={tz} options={timeZones.map((zone) => ({ value: zone, label: zone }))} onChange={setTz} />
                <GlassCombobox label="Preferred language" value={language} options={languageOptions} onChange={setLanguage} />
                <Readonly label="Regional format" value={selectedCountry?.label ?? countryCode} />
                <Readonly label="Estimated local time" value={new Intl.DateTimeFormat(displayLocale, { timeZone: tz, dateStyle: "medium", timeStyle: "short" }).format(new Date())} />
              </div>
            )}

            {tab === "security" && (
              <div className="grid gap-4 md:grid-cols-3">
                <SecurityCard title="Password" body="Reset through the link sent by email.">
                  <button
                    onClick={async () => {
                      const { error } = await supabase.auth.resetPasswordForEmail(user.email!, {
                        redirectTo: `${window.location.origin}/login`,
                      });
                      if (error) toast.error(error.message);
                      else toast.success("Password reset email sent");
                    }}
                    className="mt-3 rounded-full border border-border bg-white/45 px-3 py-1.5 text-xs hover:bg-white/70"
                  >
                    Send link
                  </button>
                </SecurityCard>
                <TotpCard />
                <SecurityCard title="Sessions" body="Current session active on this device." />
              </div>
            )}
          </div>

          <div className="mt-7 flex justify-end">
            <button
              onClick={save}
              disabled={saving}
              className="rounded-lg bg-olive px-5 py-2 text-sm text-ivory shadow-soft hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </Card>
      </div>
    </>
  );
}

function Field({ label, value, onChange, hint, placeholder }: { label: string; value: string; onChange: (v: string) => void; hint?: string; placeholder?: string }) {
  return (
    <label className="block text-sm">
      <span className="text-foreground/80">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-1 w-full rounded-xl border border-white/70 bg-white/55 px-3 py-2 text-sm shadow-soft backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-olive/30" />
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

function Readonly({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/70 bg-white/38 p-4 shadow-soft backdrop-blur-xl">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function GlassCombobox({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((item) => item.value === value);
  const filtered = options.filter((item) => `${item.label} ${item.value}`.toLowerCase().includes(query.toLowerCase())).slice(0, 80);

  return (
    <div className="relative text-sm">
      <span className="text-foreground/80">{label}</span>
      <button type="button" onClick={() => setOpen((state) => !state)} className="mt-1 flex w-full items-center justify-between rounded-lg border border-white/70 bg-white/55 px-3 py-2 text-left shadow-soft backdrop-blur-xl">
        <span className="truncate">{selected?.label ?? value}</span>
        <Search className="h-4 w-4 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-lg border border-white/70 bg-white/82 p-2 shadow-elevated backdrop-blur-2xl">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search..." className="mb-2 w-full rounded-md border border-border/60 bg-ivory/70 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-olive/25" />
          <div className="app-scrollbar max-h-64 overflow-y-auto">
            {filtered.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  onChange(item.value);
                  setOpen(false);
                  setQuery("");
                }}
                className={`block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-baby/20 ${item.value === value ? "bg-olive/10 text-olive" : "text-foreground"}`}
              >
                {item.label}
              </button>
            ))}
            {filtered.length === 0 && <p className="px-3 py-4 text-sm text-muted-foreground">Nada encontrado.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function SecurityCard({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/70 bg-white/38 p-5 shadow-soft backdrop-blur-xl">
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{body}</p>
      {children}
    </div>
  );
}

function TotpCard() {
  const [factors, setFactors] = useState<any[]>([]);
  const [enrolling, setEnrolling] = useState<any | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const loadFactors = async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (!error) setFactors(data?.totp ?? []);
  };

  useEffect(() => {
    loadFactors();
  }, []);

  const verified = factors.find((factor) => factor.status === "verified");

  const startEnroll = async () => {
    setBusy(true);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Autenticador Care Kranich" });
    setBusy(false);
    if (error) return toast.error(error.message);
    setEnrolling(data);
  };

  const confirmEnroll = async () => {
    if (!enrolling || code.trim().length < 6) return;
    setBusy(true);
    const challenge = await supabase.auth.mfa.challenge({ factorId: enrolling.id });
    if (challenge.error) { setBusy(false); return toast.error(challenge.error.message); }
    const verify = await supabase.auth.mfa.verify({ factorId: enrolling.id, challengeId: challenge.data.id, code: code.trim() });
    setBusy(false);
    if (verify.error) return toast.error(verify.error.message);
    toast.success("Two-factor authentication enabled");
    setEnrolling(null);
    setCode("");
    loadFactors();
  };

  const disable = async (factorId: string) => {
    setBusy(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Two-factor authentication disabled");
    loadFactors();
  };

  return (
    <div className="rounded-lg border border-white/70 bg-white/38 p-5 shadow-soft backdrop-blur-xl">
      <p className="font-medium text-foreground">Two-factor authentication</p>
      {verified ? (
        <>
          <p className="mt-1 text-xs leading-5 text-moss">Active - codes generated by your authenticator app.</p>
          <button onClick={() => disable(verified.id)} disabled={busy} className="mt-3 rounded-full border border-wine/30 bg-white/45 px-3 py-1.5 text-xs text-wine hover:bg-wine/5 disabled:opacity-50">Desativar 2FA</button>
        </>
      ) : enrolling ? (
        <div className="mt-2 space-y-3">
          <p className="text-xs leading-5 text-muted-foreground">Scan the QR code in Google Authenticator, 1Password or similar, then enter the 6-digit code.</p>
          {enrolling.totp?.qr_code && (
            <img src={enrolling.totp.qr_code} alt="QR code 2FA" className="h-36 w-36 rounded-xl border border-white/70 bg-white p-2" />
          )}
          <input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" inputMode="numeric" className="w-full rounded-xl border border-white/70 bg-white/60 px-3 py-2 text-center font-mono text-lg tracking-[0.4em] shadow-soft outline-none focus:ring-2 focus:ring-olive/30" />
          <div className="flex gap-2">
            <button onClick={confirmEnroll} disabled={busy || code.length < 6} className="rounded-full bg-olive px-4 py-1.5 text-xs font-semibold text-ivory disabled:opacity-45">Confirmar</button>
            <button onClick={() => { setEnrolling(null); setCode(""); }} className="rounded-full border border-border bg-white/45 px-3 py-1.5 text-xs">Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Protect your account with TOTP codes from an authenticator app.</p>
          <button onClick={startEnroll} disabled={busy} className="mt-3 rounded-full bg-olive px-3 py-1.5 text-xs font-semibold text-ivory disabled:opacity-50">Ativar 2FA</button>
        </>
      )}
    </div>
  );
}
