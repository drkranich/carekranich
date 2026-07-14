import { createFileRoute } from "@tanstack/react-router";
import { MarketingPage, Section } from "@/components/site/MarketingPage";
import { GlassSelect } from "@/components/app/GlassSelect";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact - Care Kranich" },
      { name: "description", content: "Talk to sales, support or our partnerships team. We typically reply within one business day." },
      { property: "og:title", content: "Contact - Care Kranich" },
      { property: "og:description", content: "Talk to sales, support or our partnerships team." },
    ],
  }),
  component: Page,
});

const faqs = [
  { q: "How long does onboarding take?", a: "Most families are set up in under 30 minutes. Enterprise rollouts begin within two weeks." },
  { q: "Do you integrate with our EHR?", a: "Yes - FHIR R4, HL7 v2, and direct integrations with Epic, Cerner and Meditech." },
  { q: "Where is data stored?", a: "Regionally - EU, US and LATAM regions available. Tenant-isolated, encrypted at rest and in transit." },
  { q: "Is there a free trial?", a: "Yes, 14 days with no credit card required for the family tier." },
];

const CONTACT_EMAIL = "carekranich@gmail.com";

function Page() {
  const [sending, setSending] = useState(false);
  const [topic, setTopic] = useState("Family trial");
  return (
    <MarketingPage
      eyebrow="Contact"
      crumbs={[{ label: "Company" }, { label: "Contact" }]}
      title="Let's talk."
      lede="Tell us a little about you and we'll route you to the right person - typically within one business day."
    >
      <div className="grid gap-12 lg:grid-cols-5">
        <form
          className="lg:col-span-3 rounded-3xl border border-border bg-card p-8 shadow-soft"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const data = new FormData(form);
            const topic = String(data.get("topic") ?? "Care Kranich inquiry");
            const body = [
              `Name: ${String(data.get("name") ?? "")}`,
              `Email: ${String(data.get("email") ?? "")}`,
              `Organization: ${String(data.get("org") ?? "")}`,
              `Role: ${String(data.get("role") ?? "")}`,
              `Topic: ${topic}`,
              "",
              String(data.get("message") ?? ""),
            ].join("\n");
            setSending(true);
            window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Care Kranich - ${topic}`)}&body=${encodeURIComponent(body)}`;
            setSending(false);
            toast.success("Opening your email client.");
            setTopic("Family trial");
            form.reset();
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Name" name="name" required />
            <Field label="Work email" name="email" type="email" required />
            <Field label="Organization" name="org" />
            <Field label="Role" name="role" />
          </div>
          <div className="mt-4">
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-moss">I'm interested in</label>
            <GlassSelect
              name="topic"
              value={topic}
              onChange={setTopic}
              className="mt-2"
              options={[
                { value: "Family trial", label: "Family trial" },
                { value: "Home-care agency", label: "Home-care agency" },
                { value: "Clinic or senior living", label: "Clinic or senior living" },
                { value: "Hospital / Enterprise", label: "Hospital / Enterprise" },
                { value: "Insurance partnership", label: "Insurance partnership" },
                { value: "Press & media", label: "Press & media" },
              ]}
            />
          </div>
          <div className="mt-4">
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-moss">Message</label>
            <textarea name="message" rows={5} required className="mt-2 w-full rounded-xl border border-border bg-ivory px-4 py-3 text-sm" />
          </div>
          <button disabled={sending} className="mt-6 rounded-full bg-primary px-6 py-3 text-sm text-primary-foreground shadow-elevated transition hover:opacity-90 disabled:opacity-60">
            {sending ? "Sending..." : "Send message"}
          </button>
        </form>
        <aside className="lg:col-span-2 space-y-4">
          <Channel title="Family support" body={`${CONTACT_EMAIL} - family onboarding`} />
          <Channel title="Enterprise sales" body={`${CONTACT_EMAIL} - agencies, clinics and operators`} />
          <Channel title="Partnerships" body={`${CONTACT_EMAIL} - ecosystem and integrations`} />
          <Channel title="Press" body={`${CONTACT_EMAIL} - media requests`} />
        </aside>
      </div>
      <Section kicker="FAQ" title="Quick answers.">
        <div className="grid gap-4 md:grid-cols-2">
          {faqs.map((f) => (
            <div key={f.q} className="rounded-2xl border border-border bg-card p-6">
              <div className="text-base font-semibold text-olive">{f.q}</div>
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
      <label className="text-xs font-semibold uppercase tracking-[0.12em] text-moss">{label}</label>
      <input name={name} type={type} required={required} className="mt-2 w-full rounded-xl border border-border bg-ivory px-4 py-3 text-sm" />
    </div>
  );
}

function Channel({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="text-base font-semibold text-olive">{title}</div>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
