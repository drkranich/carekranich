import { createFileRoute } from "@tanstack/react-router";
import { MarketingPage, Section } from "@/components/site/MarketingPage";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Olia" },
      { name: "description", content: "Talk to sales, support or our partnerships team. We typically reply within one business day." },
      { property: "og:title", content: "Contact — Olia" },
      { property: "og:description", content: "Talk to sales, support or our partnerships team." },
    ],
  }),
  component: Page,
});

const faqs = [
  { q: "How long does onboarding take?", a: "Most families are set up in under 30 minutes. Enterprise rollouts begin within two weeks." },
  { q: "Do you integrate with our EHR?", a: "Yes — FHIR R4, HL7 v2, and direct integrations with Epic, Cerner and Meditech." },
  { q: "Where is data stored?", a: "Regionally — EU, US and LATAM regions available. Tenant-isolated, encrypted at rest and in transit." },
  { q: "Is there a free trial?", a: "Yes, 14 days with no credit card required for the family tier." },
];

function Page() {
  const [sending, setSending] = useState(false);
  return (
    <MarketingPage
      eyebrow="Contact"
      crumbs={[{ label: "Company" }, { label: "Contact" }]}
      title="Let's talk."
      lede="Tell us a little about you and we'll route you to the right person — typically within one business day."
    >
      <div className="grid gap-12 lg:grid-cols-5">
        <form
          className="lg:col-span-3 rounded-3xl border border-border bg-card p-8 shadow-soft"
          onSubmit={(e) => {
            e.preventDefault();
            setSending(true);
            setTimeout(() => { setSending(false); toast.success("Thank you — we'll be in touch shortly."); (e.target as HTMLFormElement).reset(); }, 600);
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Name" name="name" required />
            <Field label="Work email" name="email" type="email" required />
            <Field label="Organization" name="org" />
            <Field label="Role" name="role" />
          </div>
          <div className="mt-4">
            <label className="text-xs uppercase tracking-widest text-moss">I'm interested in</label>
            <select name="topic" className="mt-2 w-full rounded-xl border border-border bg-ivory px-4 py-3 text-sm">
              <option>Family trial</option>
              <option>Home-care agency</option>
              <option>Clinic or senior living</option>
              <option>Hospital / Enterprise</option>
              <option>Insurance partnership</option>
              <option>Press & media</option>
            </select>
          </div>
          <div className="mt-4">
            <label className="text-xs uppercase tracking-widest text-moss">Message</label>
            <textarea name="message" rows={5} required className="mt-2 w-full rounded-xl border border-border bg-ivory px-4 py-3 text-sm" />
          </div>
          <button disabled={sending} className="mt-6 rounded-full bg-primary px-6 py-3 text-sm text-primary-foreground shadow-elevated transition hover:opacity-90 disabled:opacity-60">
            {sending ? "Sending…" : "Send message"}
          </button>
        </form>
        <aside className="lg:col-span-2 space-y-4">
          <Channel title="Family support" body="help@olia.care · 24/7 chat in-app" />
          <Channel title="Enterprise sales" body="sales@olia.care · book a 30-min discovery" />
          <Channel title="Partnerships" body="partners@olia.care" />
          <Channel title="Press" body="press@olia.care" />
        </aside>
      </div>
      <Section kicker="FAQ" title="Quick answers.">
        <div className="grid gap-4 md:grid-cols-2">
          {faqs.map((f) => (
            <div key={f.q} className="rounded-2xl border border-border bg-card p-6">
              <div className="font-display text-lg text-olive">{f.q}</div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
            </div>
          ))}
        </div>
      </Section>
    </MarketingPage>
  );
}

function Field({ label, name, type = "text", required }: { label: string; name: string; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-widest text-moss">{label}</label>
      <input name={name} type={type} required={required} className="mt-2 w-full rounded-xl border border-border bg-ivory px-4 py-3 text-sm" />
    </div>
  );
}

function Channel({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="font-display text-lg text-olive">{title}</div>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
