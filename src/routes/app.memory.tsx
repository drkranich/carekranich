import { createFileRoute } from "@tanstack/react-router";
import { Card, PageHeader, Pill } from "@/components/app/primitives";

export const Route = createFileRoute("/app/memory")({ component: Memory });

const memories = [
  { y: "1968", t: "Wedding day · Estrela church", k: "Photo", tone: "wine" },
  { y: "1972", t: "Inês's first steps", k: "Photo", tone: "olive" },
  { y: "1981", t: "Family summer · Algarve", k: "Photo", tone: "gold" },
  { y: "1995", t: "Mum's voice · birthday song", k: "Audio", tone: "terracotta" },
  { y: "2001", t: "Grandson Tomás born", k: "Photo", tone: "moss" },
  { y: "2019", t: "Letter to António", k: "Journal", tone: "wine" },
  { y: "2024", t: "Garden in bloom", k: "Photo", tone: "moss" },
  { y: "2025", t: "Voice note to grandchildren", k: "Audio", tone: "gold" },
];

function Memory() {
  return (
    <>
      <PageHeader
        title="Memory & legacy"
        subtitle="A private, dignified archive of Maria's life — preserved for her, shared with whom she chooses."
        action={<Pill tone="gold">End-to-end encrypted</Pill>}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Memory archive</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            {memories.map((m) => (
              <div key={m.t} className="group relative overflow-hidden rounded-2xl border border-border bg-cream/40 aspect-[4/5]">
                <div className={`absolute inset-0 bg-gradient-to-br opacity-80 ${m.tone === "wine" ? "from-wine/40 to-wine/10" : m.tone === "olive" ? "from-olive/40 to-olive/10" : m.tone === "gold" ? "from-gold/40 to-gold/10" : m.tone === "terracotta" ? "from-terracotta/40 to-terracotta/10" : "from-moss/40 to-moss/10"}`} />
                <div className="absolute inset-0 grain opacity-30" />
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <Pill tone={m.tone as any}>{m.k}</Pill>
                  <p className="mt-2 text-sm font-medium text-ivory drop-shadow">{m.t}</p>
                  <p className="text-xs text-ivory/80">{m.y}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="bg-gradient-olive text-ivory border-none">
            <p className="text-xs uppercase tracking-widest text-ivory/70">Today's prompt</p>
            <p className="mt-2 font-display text-xl">"What did your mother teach you about patience?"</p>
            <p className="mt-2 text-sm text-ivory/85">Olia gently invites Maria to record a 2-minute voice memory.</p>
            <button className="mt-4 inline-flex items-center gap-2 rounded-full bg-ivory px-4 py-2 text-xs text-olive">
              <span className="h-2 w-2 rounded-full bg-wine"/> Begin recording
            </button>
          </Card>

          <Card>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Private journal</p>
            <p className="mt-2 text-sm text-foreground/85 italic leading-relaxed">"Today I planted tomatoes. The sun was warm and Tomás called. I'm well."</p>
            <p className="mt-2 text-xs text-muted-foreground">May 14 · Maria · private</p>
          </Card>

          <Card>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Legacy access</p>
            <ul className="mt-3 space-y-2 text-sm">
              {[
                { n: "Inês · daughter", a: "Full access · now" },
                { n: "Pedro · son", a: "Full · after Maria" },
                { n: "Tomás · grandson", a: "Curated · selected items" },
              ].map((p) => (
                <li key={p.n} className="flex items-center justify-between rounded-xl border border-border/60 bg-cream/40 p-3">
                  <span className="text-foreground">{p.n}</span>
                  <span className="text-xs text-muted-foreground">{p.a}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
