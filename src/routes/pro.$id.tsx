import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BadgeCheck, CalendarDays, Check, MapPin, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Avatar, ReviewCard, SectionHead, Stars, StatusBadge } from "@/components/market/shared";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getCategory, rand, upcomingSlots } from "@/lib/mock-data";
import { getReviewsForWorker, getWorkerById } from "@/lib/server/workers";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pro/$id")({
  loader: async ({ params }) => {
    const [worker, reviews] = await Promise.all([
      getWorkerById({ data: params.id }),
      getReviewsForWorker({ data: params.id }),
    ]);
    if (!worker) throw notFound();
    return { worker, reviews };
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `${loaderData.worker.name} — LocalHands` : "Worker unavailable — LocalHands";
    const description = loaderData ? `View ${loaderData.worker.name}'s services, reviews, prices and availability in Cape Town.` : "This worker profile is unavailable.";
    return { meta: [{ title }, { name: "description", content: description }, { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:type", content: "profile" }, { name: "twitter:card", content: "summary_large_image" }] };
  },
  component: WorkerProfile,
});

function WorkerProfile() {
  const { worker: seed, reviews } = Route.useLoaderData();
  const { addRequest, markViewed, workers } = useStore();
  const worker = workers.find((w) => w.id === seed.id) ?? seed;
  const category = getCategory(worker.category);
  const slots = useMemo(() => upcomingSlots(worker), [worker]);

  const [service, setService] = useState(worker.services[0] ?? "");
  const [selected, setSelected] = useState<{ date: string; label: string; time: string }>();
  const [notes, setNotes] = useState("");

  useMemo(() => markViewed(worker.id), [markViewed, worker.id]);

  const total = worker.startPrice + worker.travelFee;
  const submit = () => {
    if (!selected) {
      toast.error("Choose an available time first");
      return;
    }
    addRequest({ workerId: worker.id, service, date: `${selected.label} ${selected.date}`, time: selected.time, location: worker.location, total, notes });
    toast.success("Request sent", { description: `${worker.name} can now review your request.` });
  };

  return (
    <div className="animate-rise py-10">
      <Link to="/" className="font-mono text-[11px] text-muted-foreground hover:text-foreground">← back to workers</Link>
      <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          <div className="flex items-start gap-5 border-b border-border pb-7">
            <Avatar worker={worker} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-bold sm:text-4xl">{worker.name}</h1>
                {worker.verified && <BadgeCheck className="size-5 text-primary" />}
              </div>
              <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground"><MapPin className="size-4" />{worker.location}<span>·</span>{worker.years} years experience</p>
              <div className="mt-3 flex items-center gap-2"><Stars value={worker.rating} /><strong>{worker.rating.toFixed(1)}</strong><span className="text-sm text-muted-foreground">({worker.reviews} reviews · {worker.jobs} jobs)</span></div>
            </div>
          </div>

          <section className="border-b border-border py-7">
            <SectionHead title="About" tag={category?.name ?? "Local service"} />
            <p className="max-w-[68ch] text-sm leading-7 text-muted-foreground">{worker.bio}</p>
            <div className="mt-5 flex flex-wrap gap-2">{worker.badges.map((badge) => <StatusBadge key={badge} tone="green"><Check className="size-3" />{badge}</StatusBadge>)}</div>
            {worker.qualified && <div className="mt-4 flex items-center gap-2 text-sm text-info"><ShieldCheck className="size-4" />{worker.qualified}</div>}
          </section>

          <section className="border-b border-border py-7">
            <SectionHead title="Services" tag={`from ${rand(worker.startPrice)}`} />
            <div className="grid gap-2 sm:grid-cols-2">{worker.services.map((item) => <div key={item} className="panel flex items-center justify-between p-3 text-sm"><span>{item}</span><span className="font-mono text-xs text-primary">from {rand(worker.startPrice)}</span></div>)}</div>
          </section>

          <section className="py-7">
            <SectionHead title="Recent reviews" tag={`${worker.rating.toFixed(1)} average`} />
            <div className="grid gap-3 md:grid-cols-3">{reviews.map((review) => <ReviewCard key={review.id} review={review} />)}</div>
          </section>
        </div>

        <aside className="panel h-fit p-5 lg:sticky lg:top-24">
          <div className="flex items-end justify-between"><div><div className="eyebrow">Request a booking</div><div className="mt-2 text-2xl font-semibold">{rand(total)}</div></div><span className="text-xs text-muted-foreground">estimated total</span></div>
          <label className="mt-5 block"><span className="mb-2 block font-mono text-[10px] uppercase text-muted-foreground">Service</span><select className="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm outline-none" value={service} onChange={(event) => setService(event.target.value)}>{worker.services.map((item) => <option key={item}>{item}</option>)}</select></label>
          <div className="mt-5"><div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase text-muted-foreground"><CalendarDays className="size-3.5" />Next available</div><div className="grid grid-cols-2 gap-2">{slots.flatMap((day) => day.slots.slice(0, 1).map((time) => ({ ...day, time }))).slice(0, 6).map((slot) => <Button key={`${slot.key}-${slot.time}`} type="button" size="sm" variant={selected?.date === slot.date ? "default" : "outline"} className={cn("h-auto flex-col py-2", selected?.date === slot.date && "border-primary")} onClick={() => setSelected({ date: slot.date, label: slot.label, time: slot.time })}><span>{slot.label} · {slot.date}</span><span className="font-mono text-[10px] opacity-75">{slot.time}</span></Button>)}</div></div>
          <label className="mt-5 block"><span className="mb-2 block font-mono text-[10px] uppercase text-muted-foreground">Job notes</span><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Briefly describe what you need" /></label>
          <div className="mt-5 space-y-2 border-t border-border pt-4 text-xs text-muted-foreground"><div className="flex justify-between"><span>Service estimate</span><span>{rand(worker.startPrice)}</span></div><div className="flex justify-between"><span>Travel fee</span><span>{worker.travelFee ? rand(worker.travelFee) : "Included"}</span></div></div>
          <Button className="mt-5 w-full" onClick={submit}>Send request</Button>
          <p className="mt-3 text-center text-[11px] text-muted-foreground">No payment required for this prototype.</p>
        </aside>
      </div>
    </div>
  );
}