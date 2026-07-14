export function CTA() {
  return (
    <section id="start" className="px-6 pb-24">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl border border-white/65 bg-gradient-olive p-12 text-ivory shadow-elevated md:p-20">
        <div className="absolute inset-x-0 top-0 h-px glass-line" />
        <div className="relative grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="font-display text-4xl leading-tight text-balance md:text-5xl">
              Begin caring beautifully - in under 5 minutes.
            </h2>
            <p className="mt-4 max-w-md text-ivory/80">
              14 days free. No card required. We'll help you set up your first family circle, personally.
            </p>
          </div>
          <form className="flex flex-col gap-3 rounded-2xl border border-white/25 bg-white/12 p-3 backdrop-blur-xl sm:flex-row">
            <input
              type="email"
              placeholder="your@email.com"
              className="flex-1 rounded-xl bg-ivory/95 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold"
            />
            <button type="submit" className="rounded-xl bg-wine px-6 py-3 text-sm font-medium text-ivory shadow-elevated hover:opacity-95">
              Begin care
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
