export function Testimonials() {
  const quotes = [
    { q: "I live in Lisbon, Mom lives in Porto. Care Kranich made the distance disappear.", a: "Ines R., daughter" },
    { q: "Our caregivers stopped drowning in paperwork and started looking residents in the eye.", a: "Dr. Almeida, Vita Care" },
    { q: "The evening summary is the first thing my husband and I read together every night.", a: "Catherine M., family member" },
  ];

  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="grid gap-6 md:grid-cols-3">
          {quotes.map((t, i) => (
            <figure key={i} className="glass-panel rounded-2xl p-8">
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-wine" fill="currentColor"><path d="M9 7H5a3 3 0 0 0-3 3v4h6V8 M19 7h-4a3 3 0 0 0-3 3v4h6V8"/></svg>
              <blockquote className="mt-4 font-display text-xl leading-snug text-foreground">"{t.q}"</blockquote>
              <figcaption className="mt-6 text-sm text-muted-foreground">- {t.a}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
