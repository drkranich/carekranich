import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, PageHeader, Pill, Avatar } from "@/components/app/primitives";

export const Route = createFileRoute("/app/marketplace")({
  component: Marketplace,
});

const categories = [
  "All",
  "Caregivers",
  "Nurses",
  "Physiotherapy",
  "Psychology",
  "Nutrition",
  "Telemedicine",
  "Pharmacies",
  "Transport",
  "Devices",
  "Wellness",
];

const providers = [
  {
    n: "Sofia Mendes",
    r: "Live-in Caregiver - Geriatrics",
    rate: "EUR 18/h",
    rating: 4.9,
    jobs: 142,
    tags: ["Verified", "Geriatrics", "CPR"],
    tone: "terracotta",
    available: "Today",
  },
  {
    n: "Dr. Joana Costa",
    r: "Cardiology - Telemedicine",
    rate: "EUR 80/visit",
    rating: 5.0,
    jobs: 64,
    tags: ["MD", "English", "French"],
    tone: "wine",
    available: "In 30 min",
  },
  {
    n: "Vita Care Home",
    r: "Boutique residence - 24 beds",
    rate: "EUR 2,400/mo",
    rating: 4.8,
    jobs: 98,
    tags: ["Lisbon", "5star"],
    tone: "olive",
    available: "2 spots",
  },
  {
    n: "Andre Faria",
    r: "Physiotherapy - Mobility",
    rate: "EUR 45/visit",
    rating: 4.7,
    jobs: 52,
    tags: ["Home visits", "Falls"],
    tone: "moss",
    available: "Tomorrow",
  },
  {
    n: "PharmaPlus Express",
    r: "Same-day delivery pharmacy",
    rate: "Free delivery",
    rating: 4.9,
    jobs: 240,
    tags: ["24/7", "Refills"],
    tone: "gold",
    available: "Now",
  },
  {
    n: "Dra. Helena Reis",
    r: "Geropsychology",
    rate: "EUR 60/visit",
    rating: 4.9,
    jobs: 38,
    tags: ["Loneliness", "Family"],
    tone: "wine",
    available: "This week",
  },
  {
    n: "ElderRide Lisbon",
    r: "Senior transport - medical",
    rate: "EUR 12 base",
    rating: 4.8,
    jobs: 178,
    tags: ["Wheelchair", "Insured"],
    tone: "terracotta",
    available: "8 cars near",
  },
  {
    n: "Withings BP+",
    r: "Connected blood pressure cuff",
    rate: "EUR 129",
    rating: 4.7,
    jobs: 412,
    tags: ["Care Kranich ready", "FDA"],
    tone: "olive",
    available: "Ships today",
  },
];

function Marketplace() {
  const [category, setCategory] = useState("All");
  const [booking, setBooking] = useState<(typeof providers)[number] | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<(typeof providers)[number] | null>(null);
  const filteredProviders = useMemo(() => {
    if (category === "All") return providers;
    const key = category.toLowerCase();
    return providers.filter(
      (provider) =>
        `${provider.r} ${provider.tags.join(" ")}`.toLowerCase().includes(key.slice(0, -1)) ||
        `${provider.r} ${provider.tags.join(" ")}`.toLowerCase().includes(key),
    );
  }, [category]);

  return (
    <>
      <PageHeader
        title="Care marketplace"
        subtitle="Verified caregivers, clinicians, pharmacies, devices and wellness - booked in seconds."
        action={
          <button className="rounded-full bg-wine px-4 py-2 text-xs text-ivory">
            Emergency booking
          </button>
        }
      />

      {/* Filters */}
      <div className="mb-6 max-w-full">
        <div className="flex min-w-0 flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs ${
                category === c
                  ? "border-olive bg-olive text-ivory"
                  : "border-border bg-ivory text-foreground hover:bg-cream"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {(booking || confirmedBooking) && (
        <Card className="mb-6 border-baby/50 bg-baby/20">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                {confirmedBooking
                  ? `Booking confirmed: ${confirmedBooking.n}`
                  : `Booking staged: ${booking?.n}`}
              </p>
              <p className="text-xs text-muted-foreground">
                {(confirmedBooking ?? booking)?.r} - {(confirmedBooking ?? booking)?.rate} -
                Available {(confirmedBooking ?? booking)?.available}
              </p>
            </div>
            <div className="flex gap-2">
              {booking && (
                <button
                  onClick={() => {
                    setConfirmedBooking(booking);
                    setBooking(null);
                  }}
                  className="rounded-full bg-olive px-4 py-2 text-xs text-ivory"
                >
                  Confirm booking
                </button>
              )}
              <button
                onClick={() => {
                  setBooking(null);
                  setConfirmedBooking(null);
                }}
                className="rounded-full border border-border bg-white/55 px-4 py-2 text-xs"
              >
                Clear
              </button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filteredProviders.map((p) => (
          <Card key={p.n} className="hover:shadow-elevated transition-shadow">
            <div className="flex items-start gap-4">
              <Avatar name={p.n} tone={p.tone} size={48} />
              <div className="flex-1 min-w-0">
                <p className="text-lg font-semibold text-foreground truncate">{p.n}</p>
                <p className="text-xs text-muted-foreground">{p.r}</p>
              </div>
              <Pill tone="gold">star {p.rating}</Pill>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {p.tags.map((t) => (
                <Pill key={t} tone="muted">
                  {t}
                </Pill>
              ))}
            </div>
            <div className="mt-5 flex items-end justify-between border-t border-border pt-4">
              <div>
                <p className="text-xs text-muted-foreground">{p.jobs} bookings</p>
                <p className="text-lg font-semibold text-olive">{p.rate}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-moss">Available {p.available}</p>
                <button
                  onClick={() => setBooking(p)}
                  className="mt-1 rounded-full bg-olive px-4 py-2 text-xs text-ivory hover:opacity-90"
                >
                  Book
                </button>
              </div>
            </div>
          </Card>
        ))}
        {filteredProviders.length === 0 && (
          <Card className="md:col-span-2 xl:col-span-3">
            <p className="text-lg font-semibold text-foreground">
              No providers in this category yet.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Care Kranich can open a request with the partner network and notify operations.
            </p>
          </Card>
        )}
      </div>
    </>
  );
}
