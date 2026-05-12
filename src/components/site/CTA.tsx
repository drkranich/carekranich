export function CTA() {
  return (
    <section id="start" className="px-6 pb-24">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] bg-gradient-olive p-12 text-ivory shadow-elevated md:p-20">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-gold/30 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-wine/40 blur-3xl" />
        <div className="relative grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="font-display text-4xl leading-tight text-balance md:text-5xl">
              Begin caring beautifully — in under 5 minutes.
            </h2>
            <p className="mt-4 max-w-md text-ivory/80">14 days free. No card required. We'll help you set up your first family circle, personally.</p>
          </div>
          <form className="flex flex-col gap-3 rounded-2xl bg-ivory/10 p-3 backdrop-blur-sm sm:flex-row">
            <input
              type="email"
              placeholder="your@email.com"
              className="flex-1 rounded-xl bg-ivory px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold"
            />
            <button type="submit" className="rounded-xl bg-wine px-6 py-3 text-sm text-ivory shadow-elevated hover:opacity-90">
              Begin care
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
