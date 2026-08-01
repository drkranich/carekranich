import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MarketingPage, Section } from "@/components/site/MarketingPage";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/p/$slug")({ component: PublicPage });

type Block = {
  id: string;
  type: "texto" | "destaques" | "chamada" | "faq";
  title?: string;
  body?: string;
  items?: Array<{ title: string; body: string }>;
  cta_label?: string;
  cta_url?: string;
};

function paragraphs(body?: string) {
  return (body ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function PublicPage() {
  const { slug } = Route.useParams();

  const page = useQuery({
    queryKey: ["public-page", slug],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("site_pages")
        .select("*")
        .eq("slug", slug)
        .eq("published", true)
        .limit(1);
      if (error) throw error;
      return (data ?? [])[0] ?? null;
    },
  });

  if (page.isLoading) {
    return (
      <MarketingPage title="Loading..." crumbs={[{ label: "Content" }]}>
        <p className="text-sm text-muted-foreground">Fetching the page.</p>
      </MarketingPage>
    );
  }

  if (!page.data) {
    return (
      <MarketingPage
        title="Page not found"
        crumbs={[{ label: "Content" }]}
        primaryCta={{ label: "Back to home", to: "/" }}
      >
        <p className="text-sm text-muted-foreground">
          This page may have been unpublished. Explore the site or talk to us through chat.
        </p>
      </MarketingPage>
    );
  }

  const blocks: Block[] = Array.isArray(page.data.sections) ? page.data.sections : [];

  return (
    <MarketingPage
      eyebrow={page.data.hero_eyebrow ?? undefined}
      title={page.data.title}
      lede={page.data.subtitle ?? undefined}
      crumbs={[{ label: page.data.title }]}
    >
      {blocks.map((b) => {
        if (b.type === "texto") {
          return (
            <Section key={b.id} title={b.title ?? ""}>
              <div className="space-y-4">
                {paragraphs(b.body).map((p, i) => (
                  <p key={i} className="text-sm leading-relaxed text-muted-foreground">{p}</p>
                ))}
              </div>
            </Section>
          );
        }
        if (b.type === "destaques") {
          return (
            <Section key={b.id} title={b.title ?? ""}>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {(b.items ?? []).map((item, i) => (
                  <div key={i} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
                    <h3 className="font-display text-xl text-foreground">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                  </div>
                ))}
              </div>
            </Section>
          );
        }
        if (b.type === "chamada") {
          return (
            <Section key={b.id} title={b.title ?? ""}>
              <div className="rounded-2xl border border-border bg-ivory/60 p-8 backdrop-blur">
                {paragraphs(b.body).map((p, i) => (
                  <p key={i} className="text-sm leading-relaxed text-muted-foreground">{p}</p>
                ))}
                {b.cta_label && b.cta_url && (
                  <Link
                    to={b.cta_url}
                    className="mt-6 inline-block rounded-full bg-primary px-6 py-3 text-sm text-primary-foreground shadow-elevated transition hover:opacity-90"
                  >
                    {b.cta_label}
                  </Link>
                )}
              </div>
            </Section>
          );
        }
        return (
          <Section key={b.id} title={b.title ?? "Perguntas frequentes"}>
            <div className="space-y-3">
              {(b.items ?? []).map((item, i) => (
                <div key={i} className="rounded-2xl border border-border bg-card p-5">
                  <p className="font-display text-base text-foreground">{item.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                </div>
              ))}
            </div>
          </Section>
        );
      })}
    </MarketingPage>
  );
}
