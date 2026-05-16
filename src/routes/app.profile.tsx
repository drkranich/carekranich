import { createFileRoute } from "@tanstack/react-router";
import { Card, PageHeader, Pill, Avatar } from "@/components/app/primitives";

export const Route = createFileRoute("/app/profile")({ component: Profile });

function Profile() {
  return (
    <>
      <PageHeader title="Life profile · Maria Lopes" subtitle="A person, not a patient. Co-built with her family." action={<Pill tone="gold">Living document</Pill>} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-olive font-display text-4xl text-ivory">M</div>
            <h2 className="mt-4 font-display text-2xl">Maria Lopes</h2>
            <p className="text-sm text-muted-foreground">82 · Lisboa · former school teacher</p>
            <p className="mt-3 italic text-foreground/80">"The garden in spring always reminds me of my mother."</p>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl bg-cream/40 p-3"><p className="text-muted-foreground">Birthday</p><p className="font-medium text-foreground">14 March 1943</p></div>
            <div className="rounded-xl bg-cream/40 p-3"><p className="text-muted-foreground">Language</p><p className="font-medium text-foreground">Portuguese · French</p></div>
            <div className="rounded-xl bg-cream/40 p-3"><p className="text-muted-foreground">Faith</p><p className="font-medium text-foreground">Catholic · practicing</p></div>
            <div className="rounded-xl bg-cream/40 p-3"><p className="text-muted-foreground">Pronouns</p><p className="font-medium text-foreground">She / her</p></div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <p className="text-xs uppercase tracking-widest text-moss">Her story</p>
          <p className="mt-2 text-foreground/85 leading-relaxed">
            Maria taught primary school for 34 years in Estrela. She married António in 1968, raised three children, and lost her husband in 2019.
            She loves her garden, classical guitar, Sunday family lunches, and the smell of lemon trees. She fears being a burden — please never let her feel that way.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              { t: "Hobbies", items: ["Gardening (roses, lemon tree)", "Reading historical fiction", "Watching Benfica matches", "Embroidery"] },
              { t: "Favorite foods", items: ["Bacalhau à brás", "Pastel de nata · only Manteigaria", "Caldo verde", "Strong coffee · 1 sugar"] },
              { t: "Music", items: ["Amália Rodrigues", "Chopin nocturnes", "Mariza · Loucura"] },
              { t: "Emotional triggers", items: ["Loud noises after 21:00", "Talking about hospital stays", "Being rushed in conversation"] },
              { t: "What calms her", items: ["Birdsong recordings", "Calls from grandson Tomás", "Lavender hand cream", "Slow walks before sunset"] },
              { t: "Social preferences", items: ["Mornings: alone with coffee", "Afternoons: enjoys company", "Sundays: family always"] },
            ].map((g) => (
              <div key={g.t} className="rounded-2xl border border-border bg-cream/40 p-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">{g.t}</p>
                <ul className="mt-2 space-y-1 text-sm text-foreground">
                  {g.items.map((it) => <li key={it}>· {it}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-3">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Life timeline</p>
          <div className="mt-5 relative">
            <div className="absolute left-0 right-0 top-5 h-px bg-border" />
            <div className="relative grid grid-cols-2 md:grid-cols-6 gap-4">
              {[
                { y: "1943", e: "Born · Lisboa" },
                { y: "1968", e: "Married António" },
                { y: "1972", e: "First child · Inês" },
                { y: "1985", e: "Director of Estrela school" },
                { y: "2008", e: "Retired · started garden" },
                { y: "2024", e: "Joined Olia" },
              ].map((t) => (
                <div key={t.y} className="text-center">
                  <div className="mx-auto h-3 w-3 rounded-full bg-olive shadow-soft" />
                  <p className="mt-3 font-display text-lg text-foreground">{t.y}</p>
                  <p className="text-xs text-muted-foreground">{t.e}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-3 bg-gradient-wine text-ivory border-none">
          <p className="text-xs uppercase tracking-widest text-ivory/70">Family voice</p>
          <p className="mt-2 font-display text-2xl">"Treat her like she still owns the room — because she does."</p>
          <p className="mt-2 text-sm text-ivory/80">— Inês, daughter</p>
        </Card>
      </div>
    </>
  );
}
