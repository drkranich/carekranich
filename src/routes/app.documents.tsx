import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, PageHeader, Pill } from "@/components/app/primitives";

export const Route = createFileRoute("/app/documents")({ component: Documents });

const docs = [
  {
    n: "Cardiology consultation - Dr. Costa",
    t: "PDF",
    tag: "Medical",
    date: "May 12",
    size: "1.2 MB",
    ai: "BP improving; continue Bisoprolol 2.5mg; review in 90d.",
  },
  {
    n: "Prescription - Metformin 500mg",
    t: "PDF",
    tag: "Prescription",
    date: "May 02",
    size: "240 KB",
    ai: "Renewed for 6 months - valid until Nov 2026",
  },
  {
    n: "Caregiver contract - Sofia Mendes",
    t: "PDF",
    tag: "Contract",
    date: "Apr 22",
    size: "880 KB",
    ai: "Active - 32h/week - auto-renews Jun 30",
  },
  {
    n: "Health insurance card - Medis",
    t: "PNG",
    tag: "Insurance",
    date: "Mar 10",
    size: "1.8 MB",
    ai: "Plan: Senior Complete - covers in-home care up to EUR 800/mo",
  },
  {
    n: "Dementia screening MMSE 2024",
    t: "PDF",
    tag: "Medical",
    date: "Dec 14",
    size: "560 KB",
    ai: "Score 26/30 - mild concerns in recall, otherwise stable",
  },
  {
    n: "Certification - Sofia - CPR renewal",
    t: "PDF",
    tag: "Certification",
    date: "Feb 04",
    size: "320 KB",
    ai: "Valid until Feb 2027",
  },
];

const tagTone: Record<string, string> = {
  Medical: "wine",
  Prescription: "terracotta",
  Contract: "olive",
  Insurance: "gold",
  Certification: "moss",
};

function Documents() {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("All");
  const [selected, setSelected] = useState(docs[0]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const filteredDocs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return docs.filter((doc) => {
      const tagMatch = tag === "All" || doc.tag === tag;
      const queryMatch = !q || `${doc.n} ${doc.tag} ${doc.ai}`.toLowerCase().includes(q);
      return tagMatch && queryMatch;
    });
  }, [query, tag]);

  return (
    <>
      <PageHeader
        title="Document intelligence"
        subtitle="OCR - search - AI summaries - secure sharing - version history"
        action={
          <button
            onClick={() => setUploadOpen((v) => !v)}
            className="rounded-full bg-olive px-4 py-2 text-sm text-ivory"
          >
            {uploadOpen ? "Close upload" : "Upload"}
          </button>
        }
      />

      <Card className="mb-6">
        {uploadOpen && (
          <div className="mb-4 rounded-2xl border border-baby/45 bg-baby/20 p-4">
            <p className="text-sm font-medium text-foreground">Drop a document into the vault</p>
            <p className="mt-1 text-xs text-muted-foreground">
              OCR, semantic tags and family-safe summaries are prepared after upload.
            </p>
          </div>
        )}
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-cream/40 px-4 py-3">
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            placeholder="Search prescriptions, contracts, lab results, dates..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="flex-1 bg-transparent text-sm focus:outline-none"
          />
          <Pill tone="gold">AI semantic search</Pill>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {["All", "Medical", "Prescription", "Contract", "Insurance", "Certification"].map((t) => (
            <button
              key={t}
              onClick={() => setTag(t)}
              className={`rounded-full px-3 py-1 ${
                tag === t ? "bg-olive text-ivory" : "border border-border text-muted-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredDocs.map((d) => (
            <Card key={d.n} className={selected.n === d.n ? "ring-2 ring-baby/45" : ""}>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-gradient-olive text-ivory text-xs font-display">
                  {d.t}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{d.n}</p>
                    <Pill tone={tagTone[d.tag] as any}>{d.tag}</Pill>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {d.date} - {d.size} - v3 - shared with Ines
                  </p>
                  <div className="mt-3 rounded-xl border border-border/60 bg-cream/40 p-3">
                    <p className="text-[10px] uppercase text-moss">AI summary</p>
                    <p className="mt-1 text-sm text-foreground/85">{d.ai}</p>
                  </div>
                  <button
                    onClick={() => setSelected(d)}
                    className="mt-3 rounded-full border border-olive/25 bg-white/50 px-3 py-1.5 text-xs text-olive hover:bg-baby/20"
                  >
                    Open intelligence panel
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
        <Card className="h-fit">
          <p className="text-xs uppercase text-muted-foreground">Document preview</p>
          <h3 className="mt-2 text-lg font-semibold text-foreground">{selected.n}</h3>
          <div className="mt-4 rounded-2xl border border-border/60 bg-cream/50 p-4">
            <p className="text-[10px] uppercase text-moss">AI summary</p>
            <p className="mt-2 text-sm leading-6 text-foreground/85">{selected.ai}</p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <Pill tone={tagTone[selected.tag] as any}>{selected.tag}</Pill>
            <Pill tone="muted">{selected.t}</Pill>
            <span className="text-muted-foreground">{selected.date}</span>
            <span className="text-muted-foreground">{selected.size}</span>
          </div>
        </Card>
      </div>
    </>
  );
}
