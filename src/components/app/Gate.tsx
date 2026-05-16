import type { ReactNode } from "react";
import { useAuth, type AppRole } from "@/hooks/use-auth";

export function Gate({ roles, children, fallback = null }: { roles: AppRole[]; children: ReactNode; fallback?: ReactNode }) {
  const { hasAnyRole } = useAuth();
  return hasAnyRole(roles) ? <>{children}</> : <>{fallback}</>;
}
