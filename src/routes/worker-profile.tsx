import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/market/shared";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LOCATIONS, type Worker } from "@/lib/mock-data";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/worker-profile")({
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

function WorkerProfileEdit() {
  const { workers, updateWorker } = useStore();
  const worker = workers.find((w) => w.id === "thabo");
  const [form, setForm] = useState(() => ({
    name: worker?.name ?? "",
    location: worker?.location ?? LOCATIONS[0],
    years: worker?.years ?? 0,
    startPrice: worker?.startPrice ?? 0,
    travelFee: worker?.travelFee ?? 0,
    services: worker?.services.join(", ") ?? "",
    bio: worker?.bio ?? "",
  }));
  if (!worker) return null;
  const set = (k: keyof typeof form, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const save = () => {
    updateWorker(worker.id, {
      ...form,
      location: form.location as Worker["location"],
      services: form.services.split(",").map((s) => s.trim()).filter(Boolean),
    });
    toast.success("Profile saved", { description: "Customers now see your updated details." });
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
              {LOCATIONS.map((l) => <option key={l} value={l} className="bg-popover">{l}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs text-muted-foreground">Years of experience<input type="number" className={field} value={form.years} onChange={(e) => set("years", Number(e.target.value))} /></label>
          <label className="grid gap-1.5 text-xs text-muted-foreground">Starting price (R)<input type="number" className={field} value={form.startPrice} onChange={(e) => set("startPrice", Number(e.target.value))} /></label>
          <label className="grid gap-1.5 text-xs text-muted-foreground">Travel fee (R)<input type="number" className={field} value={form.travelFee} onChange={(e) => set("travelFee", Number(e.target.value))} /></label>
          <label className="grid gap-1.5 text-xs text-muted-foreground">Services (comma separated)<input className={field} value={form.services} onChange={(e) => set("services", e.target.value)} /></label>
          <label className="grid gap-1.5 text-xs text-muted-foreground sm:col-span-2">About you<Textarea rows={4} value={form.bio} onChange={(e) => set("bio", e.target.value)} /></label>
          <div className="sm:col-span-2 flex justify-end"><Button type="submit">Save changes</Button></div>
        </form>
        <aside className="panel h-fit p-5">
          <div className="flex items-center gap-3"><Avatar worker={worker} /><div><div className="font-display text-sm font-semibold">{worker.name}</div><div className="font-mono text-[11px] text-muted-foreground">{worker.location}</div></div></div>
          <p className="mt-4 text-xs leading-5 text-muted-foreground">{worker.bio}</p>
        </aside>
      </div>
    </div>
  );
}
