import { createFileRoute } from "@tanstack/react-router";
import { Card, PageHeader, Pill } from "@/components/app/primitives";

export const Route = createFileRoute("/app/documents")({ component: Documents });

const docs = [
  { n: "Cardiology consultation · Dr. Costa", t: "PDF", tag: "Medical", date: "May 12", size: "1.2 MB", ai: "BP improving; continue Bisoprolol 2.5mg; review in 90d." },
  { n: "Prescription · Metformin 500mg", t: "PDF", tag: "Prescription", date: "May 02", size: "240 KB", ai: "Renewed for 6 months · valid until Nov 2026" },
  { n: "Caregiver contract · Sofia Mendes", t: "PDF", tag: "Contract", date: "Apr 22", size: "880 KB", ai: "Active · 32h/week · auto-renews Jun 30" },
  { n: "Health insurance card · Médis", t: "PNG", tag: "Insurance", date: "Mar 10", size: "1.8 MB", ai: "Plan: Senior Complete · covers in-home care up to €800/mo" },
  { n: "Dementia screening MMSE 2024", t: "PDF", tag: "Medical", date: "Dec 14", size: "560 KB", ai: "Score 26/30 · mild concerns in recall, otherwise stable" },
  { n: "Certification · Sofia · CPR renewal", t: "PDF", tag: "Certification", date: "Feb 04", size: "320 KB", ai: "Valid until Feb 2027" },
];

const tagTone: Record<string, string> = { Medical: "wine", Prescription: "terracotta", Contract: "olive", Insurance: "gold", Certification: "moss" };

function Documents() {
  return (
    <>
      <PageHeader title="Document intelligence" subtitle="OCR · search · AI summaries · secure sharing · version history" action={<button className="rounded-full bg-olive px-4 py-2 text-sm text-ivory">Upload</button>} />

      <Card className="mb-6">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-cream/40 px-4 py-3">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
          <input placeholder="Search prescriptions, contracts, lab results, dates…" className="flex-1 bg-transparent text-sm focus:outline-none"/>
          <Pill tone="gold">AI semantic search</Pill>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {["All", "Medical", "Prescription", "Contract", "Insurance", "Certification"].map((t, i) => (
            <button key={t} className={`rounded-full px-3 py-1 ${i === 0 ? "bg-olive text-ivory" : "border border-border text-muted-foreground"}`}>{t}</button>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {docs.map((d) => (
          <Card key={d.n}>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-gradient-olive text-ivory text-xs font-display">{d.t}</div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">{d.n}</p>
                  <Pill tone={tagTone[d.tag] as any}>{d.tag}</Pill>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{d.date} · {d.size} · v3 · shared with Inês</p>
                <div className="mt-3 rounded-xl border border-border/60 bg-cream/40 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-moss">AI summary</p>
                  <p className="mt-1 text-sm text-foreground/85">{d.ai}</p>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
