import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowRight, BadgeCheck, FileCheck2, HandCoins } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getCurrentAccount } from "@/lib/server/auth";
import { CATEGORIES } from "@/lib/mock-data";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/apply")({
  head: () => ({ meta: [{ title: "Become a worker — LocalHands" }, { name: "description", content: "Apply to offer trusted local services through LocalHands in Cape Town." }, { property: "og:title", content: "Become a worker — LocalHands" }, { property: "og:description", content: "Build a local reputation and receive service requests through LocalHands." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  loader: async () => {
    const account = await getCurrentAccount();
    if (!account || account.role !== "customer") throw redirect({ to: "/signin" });
  },
  component: ApplyPage,
});

function ApplyPage() {
  const { addApplication, account, locations } = useStore();
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [category, setCategory] = useState(CATEGORIES[0]?.slug ?? "garden");
  const selected = CATEGORIES.find((item) => item.slug === category);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await addApplication({
        phone: String(data.get("phone") ?? ""),
        category,
        services: [String(data.get("service") ?? selected?.services[0] ?? "")],
        location: String(data.get("location") ?? ""),
        years: Number(data.get("years") ?? 0),
        description: String(data.get("description") ?? ""),
        startPrice: Number(data.get("price") ?? 200),
      });
      setSubmitted(true);
      toast.success("Application saved and sent for review");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit the application");
    } finally {
      setBusy(false);
    }
  };

  if (submitted) return <div className="mx-auto grid min-h-[65vh] max-w-xl place-items-center py-12 text-center"><div><div className="mx-auto grid size-14 place-items-center rounded-full bg-primary/10 text-primary"><FileCheck2 className="size-7" /></div><h1 className="mt-5 text-3xl font-bold">Application received</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Your application is saved in the database and is waiting for an admin to review it.</p><Button asChild className="mt-6"><Link to="/">Return home</Link></Button></div></div>;

  return (
    <div className="animate-rise py-10">
      <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <div className="eyebrow">// Work independently</div>
          <h1 className="mt-3 max-w-[12ch] text-4xl font-bold sm:text-5xl">Turn your skills into local work.</h1>
          <p className="mt-4 max-w-[46ch] text-sm leading-6 text-muted-foreground">Create a trusted profile, set your starting price and receive requests from customers around Cape Town.</p>
          <div className="mt-8 space-y-5">{[{ icon: HandCoins, title: "You set the price", text: "Choose a fair starting rate for your services." }, { icon: BadgeCheck, title: "Build trust", text: "Verified details and good reviews strengthen your profile." }, { icon: ArrowRight, title: "Grow job by job", text: "Start small and build a local reputation." }].map(({ icon: Icon, title, text }) => <div key={title} className="flex gap-3"><Icon className="mt-0.5 size-5 text-primary" /><div><h2 className="text-sm font-semibold">{title}</h2><p className="mt-1 text-xs text-muted-foreground">{text}</p></div></div>)}</div>
        </div>
        <form onSubmit={submit} className="panel p-5 sm:p-7">
          <div className="mb-6"><h2 className="text-xl font-semibold">Worker application</h2><p className="mt-1 text-xs text-muted-foreground">Prototype form · takes about 2 minutes</p></div>
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Applicant"><Input value={account?.name ?? ""} readOnly /></Field><Field label="Phone"><Input name="phone" required placeholder="082 123 4567" /></Field><Field label="Account email"><Input value={account?.email ?? ""} readOnly /></Field><Field label="Area"><select name="location" required className="h-9 w-full rounded-md border border-input bg-surface px-3 text-sm outline-none">{locations.map((location) => <option key={location}>{location}</option>)}</select></Field><Field label="Category"><select value={category} onChange={(event) => setCategory(event.target.value)} className="h-9 w-full rounded-md border border-input bg-surface px-3 text-sm outline-none">{CATEGORIES.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></Field><Field label="Main service"><select name="service" className="h-9 w-full rounded-md border border-input bg-surface px-3 text-sm outline-none">{selected?.services.map((service) => <option key={service}>{service}</option>)}</select></Field><Field label="Years of experience"><Input name="years" required min="0" type="number" defaultValue="2" /></Field><Field label="Starting price (R)"><Input name="price" required min="100" step="10" type="number" defaultValue="250" /></Field></div>
          <div className="mt-4"><Field label="Tell customers about your work"><Textarea name="description" required className="min-h-28" placeholder="Your experience, the areas you cover, and what customers can expect" /></Field></div>
          <div className="mt-5 rounded-md border border-border bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">Identity and qualification documents would be checked during a real review. Your account details are attached to this application. Identity and qualification checks are handled during review.</div>
          <Button type="submit" disabled={busy} className="mt-5 w-full">{busy ? "Submitting…" : "Submit application"}</Button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label><span className="mb-2 block font-mono text-[10px] uppercase text-muted-foreground">{label}</span>{children}</label>; }