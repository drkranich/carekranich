import { Link } from "@tanstack/react-router";

export function CareEcosystem() {
  const cards = [
    { tag: "Caregiver app", title: "Routines, signed in seconds", body: "Geolocated check-in, medication confirmation, mood notes and photos - all in one tap.", to: "/caregiver-app" },
    { tag: "Medical suite", title: "Clinical depth, calmly presented", body: "Patient histories, AI-assisted diagnostics, conflict detection and exportable reports.", to: "/medical-office" },
    { tag: "Marketplace", title: "Build the right care network", body: "Verified caregivers, nurses, physiotherapists and partners connected to the same care record.", to: "/partners" },
  ];

  return (
    <section id="caregivers" className="bg-gradient-olive py-24 text-ivory md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-12 md:grid-cols-2 md:items-end">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-baby">Caregivers & clinicians</span>
            <h2 className="mt-3 font-display text-4xl text-balance md:text-5xl">
              A workspace as thoughtful as the people who use it.
            </h2>
          </div>
          <p className="text-lg leading-relaxed text-ivory/75">
            From check-in to occurrence reports - large buttons, voice notes, offline sync. The mobile app caregivers actually love.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {cards.map((c) => (
            <Link key={c.title} to={c.to} className="rounded-2xl border border-ivory/20 bg-ivory/8 p-7 shadow-soft backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-ivory/12">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-baby">{c.tag}</span>
              <h3 className="mt-3 text-xl font-semibold">{c.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ivory/70">{c.body}</p>
              <span className="mt-5 inline-flex text-sm font-semibold text-baby">Open page -&gt;</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
