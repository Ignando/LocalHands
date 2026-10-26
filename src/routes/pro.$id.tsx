import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { BadgeCheck, CalendarDays, Check, MapPin, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Avatar, ReviewCard, SectionHead, Stars, StatusBadge } from "@/components/market/shared";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getCategory, rand } from "@/lib/mock-data";
import { getReviewsForWorker, getWorkerById } from "@/lib/server/workers";
import { getAvailableSlots } from "@/lib/server/workflows";
import { useStore } from "@/lib/store";
import { formatBookingDate, formatBookingTime, groupSlotsByLocalDate } from "@/lib/availability";
import { calculateHourlyBookingPrice } from "@/lib/pricing";

export const Route = createFileRoute("/pro/$id")({
  loader: async ({ params }) => {
    const [worker, reviews, availableSlots] = await Promise.all([
      getWorkerById({ data: params.id }),
      getReviewsForWorker({ data: params.id }),
      getAvailableSlots({ data: params.id }),
    ]);
    if (!worker) throw notFound();
    return { worker, reviews, availableSlots };
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `${loaderData.worker.name} — LocalHands` : "Worker unavailable — LocalHands";
    const description = loaderData ? `View ${loaderData.worker.name}'s services, reviews, prices and availability in Cape Town.` : "This worker profile is unavailable.";
    return { meta: [{ title }, { name: "description", content: description }, { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:type", content: "profile" }, { name: "twitter:card", content: "summary_large_image" }] };
  },
  component: WorkerProfile,
});

function WorkerProfile() {
  const { worker: seed, reviews, availableSlots } = Route.useLoaderData();
  const { account, addRequest, markViewed, workers } = useStore();
  const worker = workers.find((w) => w.id === seed.id) ?? seed;
  const category = getCategory(worker.category);
  const slotsByDate = groupSlotsByLocalDate(availableSlots);
  const dateKeys = [...slotsByDate.keys()];

  const [service, setService] = useState(worker.services[0] ?? "");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedStartsAt, setSelectedStartsAt] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const activeDate = dateKeys.includes(selectedDate) ? selectedDate : dateKeys[0] ?? "";
  const dateSlots = slotsByDate.get(activeDate) ?? [];
  const selectedHours = dateSlots.filter((slot) => selectedStartsAt.includes(slot.startsAt));
  const selectedTimes = selectedHours.map(({ startsAt }) => formatBookingTime(startsAt));
  const hourlyRate = worker.servicePrices?.[service] ?? worker.startPrice;
  const estimate = calculateHourlyBookingPrice(hourlyRate, selectedHours.length, worker.travelFee);
  const { serviceSubtotal, total: estimatedTotal } = estimate;

  const lastMarkedWorker = useRef<string | null>(null);
  useEffect(() => {
    if (lastMarkedWorker.current === worker.id) return;
    lastMarkedWorker.current = worker.id;
    markViewed(worker.id);
  }, [markViewed, worker.id]);

  const submit = async () => {
    if (!account || account.role !== "customer") {
      toast.error("Sign in with a customer account to book a worker");
      return;
    }
    if (!selectedHours.length) {
      toast.error("Choose at least one available hour");
      return;
    }
    try {
      await addRequest({
        workerId: worker.id,
        service,
        startsAt: selectedHours.map(({ startsAt }) => startsAt),
        notes,
      });
      toast.success("Booking request sent", { description: `${worker.name} can now review it.` });
      setSelectedStartsAt([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the booking request");
    }
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
            <div className="grid gap-2 sm:grid-cols-2">{worker.services.map((item) => <div key={item} className="panel flex items-center justify-between p-3 text-sm"><span>{item}</span><span className="font-mono text-xs text-primary">from {rand(worker.servicePrices?.[item] ?? worker.startPrice)}</span></div>)}</div>
          </section>

          <section className="py-7">
            <SectionHead title="Recent reviews" tag={`${worker.rating.toFixed(1)} average`} />
            <div className="grid gap-3 md:grid-cols-3">{reviews.map((review) => <ReviewCard key={review.id} review={review} />)}</div>
          </section>
        </div>

        <aside className="panel h-fit p-5 lg:sticky lg:top-24">
          <div className="flex items-end justify-between"><div><div className="eyebrow">Request a booking</div><div className="mt-2 text-2xl font-semibold">{rand(estimatedTotal)}</div></div><span className="text-xs text-muted-foreground">estimated total</span></div>
          <label className="mt-5 block"><span className="mb-2 block font-mono text-[10px] uppercase text-muted-foreground">Service</span><select className="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm outline-none" value={service} onChange={(event) => setService(event.target.value)}>{worker.services.map((item) => <option key={item}>{item}</option>)}</select></label>
          <section className="mt-5" aria-label="Choose a booking date">
            <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase text-muted-foreground"><CalendarDays className="size-3.5" />Available dates · next 30 days</div>
            {dateKeys.length ? <div className="flex gap-2 overflow-x-auto pb-2">{dateKeys.map((dateKey) => {
              const dateSlot = slotsByDate.get(dateKey)?.[0];
              if (!dateSlot) return null;
              const active = dateKey === activeDate;
              return <Button key={dateKey} type="button" size="sm" variant={active ? "default" : "outline"} aria-pressed={active} className="shrink-0" onClick={() => { setSelectedDate(dateKey); setSelectedStartsAt([]); }}>{formatBookingDate(dateSlot.startsAt)}</Button>;
            })}</div> : <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">No bookable dates are currently available.</p>}
          </section>
          {activeDate && <section className="mt-4" aria-label="Choose available hours">
            <div className="mb-2 flex items-center justify-between"><span className="font-mono text-[10px] uppercase text-muted-foreground">Available hours</span><span className="text-[10px] text-muted-foreground">Select one or more</span></div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{dateSlots.map((slot) => {
              const selected = selectedStartsAt.includes(slot.startsAt);
              return <Button key={slot.startsAt} type="button" size="sm" variant={selected ? "default" : "outline"} aria-pressed={selected} className="font-mono" onClick={() => setSelectedStartsAt((previous) => selected ? previous.filter((value) => value !== slot.startsAt) : [...previous, slot.startsAt])}>{formatBookingTime(slot.startsAt)}</Button>;
            })}</div>
            <p className="mt-2 text-[10px] text-muted-foreground">Only currently bookable hours are listed; unavailable or booked hours cannot be selected.</p>
          </section>}
          <label className="mt-5 block"><span className="mb-2 block font-mono text-[10px] uppercase text-muted-foreground">Job notes</span><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Briefly describe what you need" /></label>
          <div className="mt-5 space-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
            <div className="flex justify-between gap-3"><span>Date</span><span className="text-right">{activeDate && dateSlots[0] ? formatBookingDate(dateSlots[0].startsAt) : "Choose a date"}</span></div>
            <div className="flex justify-between gap-3"><span>Selected hours ({selectedHours.length})</span><span className="text-right">{selectedTimes.length ? selectedTimes.join(", ") : "None"}</span></div>
            <div className="flex justify-between"><span>Service ({selectedHours.length} {selectedHours.length === 1 ? "hour" : "hours"})</span><span>{rand(serviceSubtotal)}</span></div>
            <div className="flex justify-between"><span>Callout fee (once)</span><span>{worker.travelFee ? rand(worker.travelFee) : "Included"}</span></div>
            <div className="flex justify-between border-t border-border pt-2 font-semibold text-foreground"><span>Estimated total</span><span>{rand(estimatedTotal)}</span></div>
          </div>
          {account?.role === "customer" ? <Button className="mt-5 w-full" onClick={submit} disabled={!selectedHours.length}>Send request</Button> : <Button asChild className="mt-5 w-full"><Link to="/signin">Sign in to book</Link></Button>}
          <p className="mt-3 text-center text-[11px] text-muted-foreground">One request covers all selected hours on this date. No payment required.</p>
        </aside>
      </div>
    </div>
  );
}