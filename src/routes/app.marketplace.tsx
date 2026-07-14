import { createFileRoute } from "@tanstack/react-router";
import { Card, PageHeader, Pill, Avatar } from "@/components/app/primitives";

export const Route = createFileRoute("/app/marketplace")({
  component: Marketplace,
});

const categories = ["All", "Caregivers", "Nurses", "Physiotherapy", "Psychology", "Nutrition", "Telemedicine", "Pharmacies", "Transport", "Devices", "Wellness"];

const providers = [
  { n: "Sofia Mendes", r: "Live-in Caregiver Â· Geriatrics", rate: "â‚¬18/h", rating: 4.9, jobs: 142, tags: ["Verified","Geriatrics","CPR"], tone: "terracotta", available: "Today" },
  { n: "Dr. Joana Costa", r: "Cardiology Â· Telemedicine", rate: "â‚¬80/visit", rating: 5.0, jobs: 64, tags: ["MD","English","French"], tone: "wine", available: "In 30 min" },
  { n: "Vita Care Home", r: "Boutique residence Â· 24 beds", rate: "â‚¬2,400/mo", rating: 4.8, jobs: 98, tags: ["Lisbon","5â˜…"], tone: "olive", available: "2 spots" },
  { n: "AndrÃ© Faria", r: "Physiotherapy Â· Mobility", rate: "â‚¬45/visit", rating: 4.7, jobs: 52, tags: ["Home visits","Falls"], tone: "moss", available: "Tomorrow" },
  { n: "PharmaPlus Express", r: "Same-day delivery pharmacy", rate: "Free delivery", rating: 4.9, jobs: 240, tags: ["24/7","Refills"], tone: "gold", available: "Now" },
  { n: "Dra. Helena Reis", r: "Geropsychology", rate: "â‚¬60/visit", rating: 4.9, jobs: 38, tags: ["Loneliness","Family"], tone: "wine", available: "This week" },
  { n: "ElderRide Lisbon", r: "Senior transport Â· medical", rate: "â‚¬12 base", rating: 4.8, jobs: 178, tags: ["Wheelchair","Insured"], tone: "terracotta", available: "8 cars near" },
  { n: "Withings BP+", r: "Connected blood pressure cuff", rate: "â‚¬129", rating: 4.7, jobs: 412, tags: ["Care Kranich ready","FDA"], tone: "olive", available: "Ships today" },
];

function Marketplace() {
  return (
    <>
      <PageHeader title="Care marketplace" subtitle="Verified caregivers, clinicians, pharmacies, devices and wellness â€” booked in seconds." action={<button className="rounded-full bg-wine px-4 py-2 text-xs text-ivory">Emergency booking</button>} />

      {/* Filters */}
      <div className="-mx-2 mb-6 overflow-x-auto">
        <div className="flex gap-2 px-2">
          {categories.map((c, i) => (
            <button key={c} className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs ${i===0 ? "border-olive bg-olive text-ivory" : "border-border bg-ivory text-foreground hover:bg-cream"}`}>{c}</button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {providers.map((p) => (
          <Card key={p.n} className="hover:shadow-elevated transition-shadow">
            <div className="flex items-start gap-4">
              <Avatar name={p.n} tone={p.tone} size={48} />
              <div className="flex-1 min-w-0">
                <p className="font-display text-lg text-foreground truncate">{p.n}</p>
                <p className="text-xs text-muted-foreground">{p.r}</p>
              </div>
              <Pill tone="gold">â˜… {p.rating}</Pill>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {p.tags.map(t => <Pill key={t} tone="muted">{t}</Pill>)}
            </div>
            <div className="mt-5 flex items-end justify-between border-t border-border pt-4">
              <div>
                <p className="text-xs text-muted-foreground">{p.jobs} bookings</p>
                <p className="font-display text-lg text-olive">{p.rate}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-moss">Available {p.available}</p>
                <button className="mt-1 rounded-full bg-olive px-4 py-2 text-xs text-ivory hover:opacity-90">Book</button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
