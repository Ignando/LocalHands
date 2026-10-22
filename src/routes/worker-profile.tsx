import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/market/shared";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getCurrentAccount } from "@/lib/server/auth";
import type { Worker } from "@/lib/mock-data";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/worker-profile")({
  loader: async () => {
    const account = await getCurrentAccount();
    if (account?.role !== "worker") throw redirect({ to: "/signin" });
  },
  head: () => ({
    meta: [
      { title: "Your profile — LocalHands" },
      { name: "description", content: "Edit your LocalHands worker profile, services and pricing." },
      { property: "og:title", content: "Your profile — LocalHands" },
      { property: "og:description", content: "Update the profile customers see on LocalHands." },
    ],
  }),
  component: WorkerProfileEdit,
});

const field = "panel w-full bg-transparent px-3 py-2 text-sm outline-none focus:border-primary";
const WEEKDAYS = [
  { day: "Mon", label: "Monday", dayOfWeek: 1 },
  { day: "Tue", label: "Tuesday", dayOfWeek: 2 },
  { day: "Wed", label: "Wednesday", dayOfWeek: 3 },
  { day: "Thu", label: "Thursday", dayOfWeek: 4 },
  { day: "Fri", label: "Friday", dayOfWeek: 5 },
  { day: "Sat", label: "Saturday", dayOfWeek: 6 },
  { day: "Sun", label: "Sunday", dayOfWeek: 7 },
] as const;

function WorkerProfileEdit() {
  const { account, locations, workers, updateWorker } = useStore();
  const worker = workers.find((w) => w.id === account?.workerPublicId);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(() => ({
    name: worker?.name ?? "",
    location: worker?.location ?? locations[0] ?? "",
    years: worker?.years ?? 0,
    startPrice: worker?.startPrice ?? 0,
    travelFee: worker?.travelFee ?? 0,
    services: worker?.services.join(", ") ?? "",
    bio: worker?.bio ?? "",
  }));
  const [weeklyHours, setWeeklyHours] = useState(() =>
    WEEKDAYS.map(({ day, dayOfWeek }) => {
      const hours = worker?.schedule[day];
      return {
        day,
        dayOfWeek,
        enabled: Boolean(hours),
        start: hours?.[0] ?? "09:00",
        end: hours?.[1] ?? "17:00",
      };
    }),
  );
  if (!worker) return null;
  const set = (k: keyof typeof form, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setBusy(true);
    try {
      const schedule = Object.fromEntries(
        weeklyHours
          .filter((day) => day.enabled)
          .map((day) => [day.day, [day.start, day.end]]),
      ) as Worker["schedule"];
      await updateWorker(worker.id, {
        ...form,
        location: form.location as Worker["location"],
        services: form.services.split(",").map((s) => s.trim()).filter(Boolean),
        schedule,
      });
      toast.success("Profile saved", { description: "Your changes are now stored in the database." });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save profile");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="animate-rise py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">// Your profile</div>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Edit profile</h1>
          <p className="mt-2 text-sm text-muted-foreground">These details appear on your public profile and worker card.</p>
        </div>
        <Button asChild variant="outline"><Link to="/pro/$id" params={{ id: worker.id }}>View public profile</Link></Button>
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_280px]">
        <form className="panel grid gap-4 p-5 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <label className="grid gap-1.5 text-xs text-muted-foreground">Full name<input className={field} value={form.name} onChange={(e) => set("name", e.target.value)} /></label>
          <label className="grid gap-1.5 text-xs text-muted-foreground">Suburb
            <select className={field} value={form.location} onChange={(e) => set("location", e.target.value)}>
              {locations.map((l) => <option key={l} value={l} className="bg-popover">{l}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs text-muted-foreground">Years of experience<input type="number" className={field} value={form.years} onChange={(e) => set("years", Number(e.target.value))} /></label>
          <label className="grid gap-1.5 text-xs text-muted-foreground">Starting price (R)<input type="number" className={field} value={form.startPrice} onChange={(e) => set("startPrice", Number(e.target.value))} /></label>
          <label className="grid gap-1.5 text-xs text-muted-foreground">Travel fee (R)<input type="number" className={field} value={form.travelFee} onChange={(e) => set("travelFee", Number(e.target.value))} /></label>
          <label className="grid gap-1.5 text-xs text-muted-foreground">Services (comma separated)<input className={field} value={form.services} onChange={(e) => set("services", e.target.value)} /></label>
          <label className="grid gap-1.5 text-xs text-muted-foreground sm:col-span-2">About you<Textarea rows={4} value={form.bio} onChange={(e) => set("bio", e.target.value)} /></label>
          <section className="sm:col-span-2">
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-foreground">Weekly availability</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Choose your local South African time. One-hour bookable slots will be generated for the next 30 days. Existing bookings stay on your calendar.</p>
            </div>
            <div className="space-y-2">
              {weeklyHours.map((hours, index) => {
                const dayLabel = WEEKDAYS[index]?.label ?? hours.day;
                return (
                  <div key={hours.day} className="grid grid-cols-[1fr_1fr_1fr] items-center gap-2 rounded-md border border-border p-2">
                    <label className="flex items-center gap-2 text-xs text-foreground">
                      <input
                        type="checkbox"
                        checked={hours.enabled}
                        onChange={(event) => setWeeklyHours((previous) => previous.map((day, dayIndex) => dayIndex === index ? { ...day, enabled: event.target.checked } : day))}
                      />
                      {dayLabel}
                    </label>
                    <label className="grid gap-1 text-[10px] text-muted-foreground">From<input aria-label={`${dayLabel} start time`} type="time" step={3600} className={field} value={hours.start} disabled={!hours.enabled} onChange={(event) => setWeeklyHours((previous) => previous.map((day, dayIndex) => dayIndex === index ? { ...day, start: event.target.value } : day))} /></label>
                    <label className="grid gap-1 text-[10px] text-muted-foreground">To<input aria-label={`${dayLabel} end time`} type="time" step={3600} className={field} value={hours.end} disabled={!hours.enabled} onChange={(event) => setWeeklyHours((previous) => previous.map((day, dayIndex) => dayIndex === index ? { ...day, end: event.target.value } : day))} /></label>
                  </div>
                );
              })}
            </div>
          </section>
          <div className="sm:col-span-2 flex justify-end"><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button></div>
        </form>
        <aside className="panel h-fit p-5">
          <div className="flex items-center gap-3"><Avatar worker={worker} /><div><div className="font-display text-sm font-semibold">{worker.name}</div><div className="font-mono text-[11px] text-muted-foreground">{worker.location}</div></div></div>
          <p className="mt-4 text-xs leading-5 text-muted-foreground">{worker.bio}</p>
        </aside>
      </div>
    </div>
  );
}
