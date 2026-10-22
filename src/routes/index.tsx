import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BadgeCheck, HandCoins, Sprout } from "lucide-react";
import { CATEGORIES, ROADMAP } from "@/lib/mock-data";
import { CategoryCard, ReviewCard, SectionHead, WorkerCard } from "@/components/market/shared";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LocalHands — Trusted local workers across Cape Town" },
      { name: "description", content: "Book verified independent gardeners, cleaners, plumbers, tutors and more across Cape Town. Priced in Rand." },
      { property: "og:title", content: "LocalHands — Trusted local workers across Cape Town" },
      { property: "og:description", content: "Book verified independent local workers. Affordable, rated and priced in Rand." },
    ],
  }),
  component: Home,
});

function Home() {
  const { recentlyViewed, workers, featuredReviews } = useStore();
  const [cat, setCat] = useState<string | null>(null);
  const shown = workers.filter((w) => !cat || w.category === cat);
  const recent = recentlyViewed.map((id) => workers.find((w) => w.id === id)).filter(Boolean);
  const reviews = featuredReviews;

  return (
    <>
      <section className="animate-rise pb-10 pt-14">
        <div className="eyebrow mb-3">// Local services · live</div>
        <h1 className="max-w-[16ch] text-balance text-4xl font-bold leading-[1.02] sm:text-6xl">
          Find a trusted pro <span className="text-primary">near you</span>.
        </h1>
        <p className="mt-4 max-w-[46ch] text-pretty text-[15px] text-muted-foreground">
          Independent gardeners, cleaners, plumbers and tutors across Cape Town. Verified, rated, and booked in Rand — without corporate prices.
        </p>
      </section>

      <section className="grid gap-3 border-t border-border py-8 sm:grid-cols-3">
        {[
          { icon: HandCoins, t: "Affordable", d: "Independent workers, no corporate markup." },
          { icon: Sprout, t: "Opportunity", d: "Solo pros build a reputation job by job." },
          { icon: BadgeCheck, t: "Trust", d: "ID, experience and qualifications checked by our team." },
        ].map(({ icon: Icon, t, d }) => (
          <div key={t} className="flex items-start gap-3">
            <Icon className="mt-0.5 size-5 text-primary" />
            <div><div className="font-display text-sm font-semibold">{t}</div><div className="text-xs text-muted-foreground">{d}</div></div>
          </div>
        ))}
      </section>

      <section className="animate-rise border-t border-border py-8 [animation-delay:120ms]">
        <SectionHead title="Popular categories" tag="(a) browse" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CATEGORIES.map((c, i) => <CategoryCard key={c.slug} cat={c} index={i} active={cat === c.slug} onClick={() => { setCat(cat === c.slug ? null : c.slug); document.getElementById("workers")?.scrollIntoView({ behavior: "smooth" }); }} />)}
        </div>
      </section>


      <section id="workers" className="animate-rise scroll-mt-24 border-t border-border py-8 [animation-delay:220ms]">
        <SectionHead
          title={cat ? `${CATEGORIES.find((c) => c.slug === cat)?.name} near you` : "Recommended near you"}
          action={cat ? <button onClick={() => setCat(null)} className="font-mono text-[11px] text-primary">clear filters ×</button> : <span className="font-mono text-[11px] text-muted-foreground">{shown.length} workers</span>}
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((w) => <WorkerCard key={w.id} worker={w} />)}
        </div>
        {shown.length === 0 && <p className="panel p-6 text-center text-sm text-muted-foreground">No workers match these filters yet.</p>}
      </section>

      {recent.length > 0 && (
        <section className="border-t border-border py-8">
          <SectionHead title="Recently viewed" tag="(c) history" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recent.map((w) => <WorkerCard key={w!.id} worker={w!} />)}
          </div>
        </section>
      )}

      <section className="border-t border-border py-8">
        <SectionHead title="What customers say" tag={reviews.length ? "recent reviews" : "no reviews yet"} />
        <div className="grid gap-4 md:grid-cols-3">
          {reviews.map((r) => <ReviewCard key={r.id} review={r} />)}
        </div>
      </section>

      <section className="border-t border-border py-8">
        <SectionHead title="Coming soon" tag="outside prototype scope" />
        <div className="flex flex-wrap gap-2">
          {ROADMAP.map((r) => <span key={r} className="rounded-md border border-dashed border-border px-3 py-1.5 font-mono text-[11px] text-muted-foreground">{r}</span>)}
        </div>
      </section>
    </>
  );
}
