import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "family" | "caregiver" | "nurse" | "doctor" | "clinic_admin" | "super_admin";

export type Profile = {
  id: string;
  full_name: string | null;
  preferred_name: string | null;
  avatar_url: string | null;
  tenant_id: string | null;
  time_zone: string | null;
  phone: string | null;
};

type AuthCtx = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  primaryRole: AppRole | null;
  displayName: string;
  loading: boolean;
  hasRole: (r: AppRole) => boolean;
  hasAnyRole: (rs: AppRole[]) => boolean;
  isStaff: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

const RANK: AppRole[] = ["super_admin", "clinic_admin", "doctor", "nurse", "caregiver", "family"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("id,full_name,preferred_name,avatar_url,tenant_id,time_zone,phone").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    setProfile((p as Profile) ?? null);
    setRoles(((r ?? []) as { role: AppRole }[]).map((x) => x.role));
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      if (s?.user) setTimeout(() => loadProfile(s.user.id), 0);
      else { setProfile(null); setRoles([]); }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) loadProfile(data.session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthCtx>(() => {
    const primaryRole = RANK.find((r) => roles.includes(r)) ?? null;
    const displayName =
      profile?.preferred_name?.trim() ||
      profile?.full_name?.split(" ")[0] ||
      session?.user?.email?.split("@")[0] ||
      "";
    return {
      user: session?.user ?? null,
      session,
      profile,
      roles,
      primaryRole,
      displayName,
      loading,
      hasRole: (r) => roles.includes(r),
      hasAnyRole: (rs) => rs.some((r) => roles.includes(r)),
      isStaff: roles.some((r) => ["caregiver", "nurse", "doctor", "clinic_admin", "super_admin"].includes(r)),
      isAdmin: roles.some((r) => ["clinic_admin", "super_admin"].includes(r)),
      isSuperAdmin: roles.includes("super_admin"),
      signOut: async () => { await supabase.auth.signOut(); },
      refresh: async () => { if (session?.user) await loadProfile(session.user.id); },
    };
  }, [session, profile, roles, loading]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside <AuthProvider>");
  return c;
}

export const ROLE_LABELS: Record<AppRole, string> = {
  family: "Family",
  caregiver: "Caregiver",
  nurse: "Nurse",
  doctor: "Doctor",
  clinic_admin: "Organization admin",
  super_admin: "Super admin",
};
