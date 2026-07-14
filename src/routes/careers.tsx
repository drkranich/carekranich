import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingPage, FeatureGrid, Section } from "@/components/site/MarketingPage";

export const Route = createFileRoute("/careers")({
  head: () => ({
    meta: [
      { title: "Careers - Care Kranich" },
      { name: "description", content: "Help us build the most human technology company in healthcare. Engineering, design, clinical and operations roles." },
      { property: "og:title", content: "Careers - Care Kranich" },
      { property: "og:description", content: "Help us build the most human technology company in healthcare." },
    ],
  }),
  component: Page,
});

const roles = [
  { team: "Engineering", role: "Senior Full-Stack Engineer", location: "Remote (EU/LATAM)" },
  { team: "Design", role: "Senior Product Designer - Family Hub", location: "Remote" },
  { team: "Clinical", role: "Head of Clinical Operations", location: "Hybrid - Lisbon" },
  { team: "Go-to-Market", role: "Enterprise Account Executive - Senior Living", location: "Remote (US)" },
];

function Page() {
  return (
    <MarketingPage
      eyebrow="Careers"
      crumbs={[{ label: "Company" }, { label: "Careers" }]}
      title="Build the most human technology company in healthcare."
      lede="We're a small, senior team of engineers, designers, clinicians and operators. We move quietly and ship beautiful things."
      primaryCta={{ label: "Apply through contact", to: "/contact" }}
      secondaryCta={{ label: "About Care Kranich", to: "/about" }}
    >
      <Section kicker="Culture" title="What it feels like to work here.">
        <FeatureGrid items={[
          { title: "Craft", body: "We sweat the details. Every pixel and every policy." },
          { title: "Calm", body: "Async by default. No-meeting Wednesdays. Real weekends." },
          { title: "Impact", body: "You'll see your work in the homes of real families, in real time." },
          { title: "Equity", body: "Meaningful ownership for every full-time team member." },
          { title: "Wellbeing", body: "Top-tier health coverage, sabbaticals, therapy stipend." },
          { title: "Learning", body: "Annual learning budget plus residencies with our clinical partners." },
        ]} />
      </Section>
      <Section kicker="Open roles" title="Find your place.">
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {roles.map((r) => (
            <div key={r.role} className="flex flex-col gap-3 border-b border-border/60 p-6 last:border-b-0 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-moss">{r.team}</div>
                <div className="mt-1 font-display text-xl text-foreground">{r.role}</div>
                <div className="mt-1 text-sm text-muted-foreground">{r.location}</div>
              </div>
              <Link to="/contact" className="rounded-full border border-border bg-ivory/60 px-5 py-2 text-sm font-semibold text-olive hover:bg-ivory">Apply -&gt;</Link>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted-foreground">Don't see your role? <Link to="/contact" className="text-olive underline-offset-4 hover:underline">Tell us why you'd be exceptional</Link>.</p>
      </Section>
    </MarketingPage>
  );
}
