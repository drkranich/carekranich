import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/**
 * Tenant-scoped realtime subscriptions. Mounts once at the app shell.
 * Wires Supabase realtime → TanStack Query invalidation + toast notifications.
 */
export function useTenantRealtime(tenantId: string | null | undefined, userId: string | null | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!tenantId) return;

    const ch = supabase
      .channel(`tenant:${tenantId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events", filter: `tenant_id=eq.${tenantId}` },
        (payload) => {
          qc.invalidateQueries({ queryKey: ["events"] });
          if (payload.eventType === "INSERT") {
            const e = payload.new as { title: string; severity: string };
            if (e.severity === "critical") toast.error(e.title);
            else if (e.severity === "warning") toast.warning(e.title);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alerts", filter: `tenant_id=eq.${tenantId}` },
        (payload) => {
          qc.invalidateQueries({ queryKey: ["alerts"] });
          qc.invalidateQueries({ queryKey: ["alerts-open-count"] });
          if (payload.eventType === "INSERT") {
            const a = payload.new as { title: string; severity: string };
            const fn = a.severity === "critical" ? toast.error : a.severity === "warning" ? toast.warning : toast;
            fn(`Alert: ${a.title}`);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "care_tasks", filter: `tenant_id=eq.${tenantId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["care-tasks"] });
          qc.invalidateQueries({ queryKey: ["care-plans"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [tenantId, qc]);

  // Per-user notifications
  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`user:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          qc.invalidateQueries({ queryKey: ["notifications"] });
          qc.invalidateQueries({ queryKey: ["notifications-unread"] });
          const n = payload.new as { title: string; body: string | null };
          toast(n.title, { description: n.body ?? undefined });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId, qc]);
}
