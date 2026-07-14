import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Card, EmptyState, PageHeader, Pill } from "@/components/app/primitives";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/notifications")({ component: Notifications });

type NotificationRow = {
  id: string;
  title: string;
  body: string | null;
  severity: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

function Notifications() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [filter, setFilter] = useState<"all" | "unread" | "critical">("all");

  const notifications = useQuery({
    queryKey: ["notifications-page", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id,title,body,severity,link,read_at,created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as NotificationRow[];
    },
  });

  const rows = useMemo(() => {
    const all = notifications.data ?? [];
    if (filter === "unread") return all.filter((item) => !item.read_at);
    if (filter === "critical") return all.filter((item) => ["critical", "emergency", "warning"].includes(item.severity));
    return all;
  }, [filter, notifications.data]);

  const markRead = async (id: string) => {
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["notifications-page"] });
  };

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle="Real notification records for the signed-in user. Channel preferences will appear only after a persisted preferences table exists."
        action={<Pill tone="olive">{rows.length} visible</Pill>}
      />

      <Card className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-olive/10 text-olive">
              <Bell className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Notification inbox</h2>
              <p className="text-xs text-muted-foreground">Loaded from Supabase notifications table.</p>
            </div>
          </div>
          <div className="flex gap-2 text-xs">
            {(["all", "unread", "critical"] as const).map((item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className={`rounded-full px-3 py-1.5 ${
                  filter === item ? "bg-olive text-ivory" : "border border-border bg-white/50 text-muted-foreground"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {notifications.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading notifications...</p>
      ) : notifications.isError ? (
        <Card className="border-wine/25 bg-wine/5">
          <p className="font-medium text-wine">Could not load notifications.</p>
          <p className="mt-2 text-sm text-muted-foreground">{(notifications.error as Error).message}</p>
        </Card>
      ) : rows.length === 0 ? (
        <EmptyState title="No notifications" hint="System events, alerts and messages will appear here when generated." />
      ) : (
        <Card padded={false}>
          <ul className="divide-y divide-border/60">
            {rows.map((item) => (
              <li key={item.id} className="flex items-start gap-4 px-6 py-4">
                <span className={`mt-1 h-2.5 w-2.5 rounded-full ${item.read_at ? "bg-border" : "bg-olive"}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">{item.title}</p>
                    <Pill tone={tone(item.severity)}>{item.severity}</Pill>
                  </div>
                  {item.body && <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.body}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()}</p>
                </div>
                {!item.read_at && (
                  <button
                    onClick={() => markRead(item.id)}
                    className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Read
                  </button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}

function tone(value: string): "moss" | "wine" | "gold" | "muted" {
  const severity = value.toLowerCase();
  if (["critical", "emergency"].includes(severity)) return "wine";
  if (["warning", "high"].includes(severity)) return "gold";
  if (["info", "success"].includes(severity)) return "moss";
  return "muted";
}
