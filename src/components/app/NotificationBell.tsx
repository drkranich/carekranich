import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

type Notif = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  severity: string;
  read_at: string | null;
  created_at: string;
};

export function NotificationBell() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: notifs = [] } = useQuery({
    queryKey: ["notifications"],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      return (data ?? []) as Notif[];
    },
  });

  const unread = notifs.filter((n) => !n.read_at).length;

  const markAll = async () => {
    if (!unread) return;
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .is("read_at", null);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-notif-root]")) setOpen(false);
    };
    if (open) document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [open]);

  return (
    <div className="relative" data-notif-root>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-full border border-border bg-ivory p-2 text-muted-foreground hover:text-olive"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-wine px-1 text-[10px] font-medium text-ivory">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-40 w-80 rounded-2xl border border-border bg-card p-2 shadow-elevated">
          <div className="flex items-center justify-between px-3 py-2">
            <p className="text-sm font-medium text-foreground">Notifications</p>
            {unread > 0 && (
              <button onClick={markAll} className="text-xs text-olive hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifs.length === 0 && (
              <p className="px-3 py-8 text-center text-xs text-muted-foreground">All caught up.</p>
            )}
            {notifs.map((n) => {
              const inner = (
                <div className={`rounded-xl px-3 py-2 ${n.read_at ? "" : "bg-cream/60"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-foreground">{n.title}</p>
                    {!n.read_at && (
                      <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-wine" />
                    )}
                  </div>
                  {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
                  <p className="mt-1 text-[10px] uppercase text-muted-foreground">
                    {new Date(n.created_at).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              );
              return n.link ? (
                <a
                  key={n.id}
                  href={n.link}
                  className="block hover:bg-cream/40"
                  onClick={() => setOpen(false)}
                >
                  {inner}
                </a>
              ) : (
                <div key={n.id}>{inner}</div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
