import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { BadgeCheck, ClipboardList, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { DashboardCard, StatusBadge, statusTone } from "@/components/market/shared";
import { Button } from "@/components/ui/button";
import { CATEGORIES, getCategory, type ApplicationStatus } from "@/lib/mock-data";
import { getCurrentAccount } from "@/lib/server/auth";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin review queue — LocalHands" }, { name: "description", content: "Review worker applications and marketplace activity." }, { property: "og:title", content: "Admin review queue — LocalHands" }, { property: "og:description", content: "Review and manage LocalHands applications." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  loader: async () => {
    const account = await getCurrentAccount();
    if (account?.role !== "admin") throw redirect({ to: "/signin" });
  },
  component: AdminPage,
});

function AdminPage() {
  const { applications, requests, setApplicationStatus, workers } = useStore();
  const router = useRouter();
  const pending = applications.filter((app) => !["Approved", "Rejected"].includes(app.status));
  const updateStatus = async (id: string, status: Exclude<ApplicationStatus, "Application Submitted">) => {
    try {
      await setApplicationStatus(id, status);
      await router.invalidate();
      toast.success(`Application ${status.toLowerCase()}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update application");
    }
  };
  return (
    <div className="animate-rise py-10">
      <div><div className="eyebrow">// Marketplace operations</div><h1 className="mt-2 text-3xl font-bold sm:text-4xl">Review queue</h1><p className="mt-2 text-sm text-muted-foreground">Worker screening and prototype marketplace activity in one place.</p></div>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><DashboardCard label="Live workers" value={workers.length} sub="Across 8 categories" tone="green" /><DashboardCard label="Needs review" value={pending.length} sub="Worker applications" /><DashboardCard label="Service requests" value={requests.length} sub="All prototype states" /></div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_280px]">
        <section><div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><ClipboardList className="size-4 text-primary" /><h2 className="text-lg font-semibold">Worker applications</h2></div><span className="font-mono text-[10px] text-muted-foreground">NEWEST FIRST</span></div><div className="space-y-3">{applications.map((app) => <article key={app.id} className="panel p-4"><div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong className="text-sm">{app.name}</strong><StatusBadge tone={statusTone(app.status)}>{app.status}</StatusBadge></div><p className="mt-1 text-xs text-muted-foreground">{getCategory(app.category)?.name} · {app.location} · {app.years} years</p><p className="mt-3 max-w-[70ch] text-xs leading-5 text-muted-foreground">{app.description}</p><div className="mt-3 flex flex-wrap gap-2"><StatusBadge tone={app.idVerified ? "green" : "amber"}>{app.idVerified ? "ID verified" : "ID pending"}</StatusBadge><StatusBadge tone={app.qualification === "Verified" ? "green" : app.qualification === "Pending" ? "amber" : "muted"}>Qualification: {app.qualification}</StatusBadge><StatusBadge>{app.references} references</StatusBadge></div></div><div className="flex shrink-0 flex-col items-start gap-3"><div className="space-y-1 text-xs"><div><span className="text-muted-foreground">Email · </span>{app.email?.trim() ? <a className="break-all text-primary hover:underline" href={`mailto:${app.email}`}>{app.email}</a> : <span className="text-muted-foreground">Not provided</span>}</div><div><span className="text-muted-foreground">Phone · </span>{app.phone?.trim() ? <a className="text-primary hover:underline" href={`tel:${app.phone}`}>{app.phone}</a> : <span className="text-muted-foreground">Not provided</span>}</div></div>{!["Approved", "Rejected"].includes(app.status) && <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => void updateStatus(app.id, "Rejected")}>Reject</Button><Button size="sm" onClick={() => void updateStatus(app.id, "Approved")}>Approve</Button></div>}</div></div></article>)}{applications.length === 0 && <p className="panel p-6 text-center text-sm text-muted-foreground">No applications have been submitted yet.</p>}</div></section>
        <aside className="space-y-4"><div className="panel p-5"><div className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" /><h2 className="text-sm font-semibold">Review checks</h2></div><ol className="mt-4 space-y-3 text-xs text-muted-foreground"><li>01 · Confirm identity</li><li>02 · Check experience</li><li>03 · Verify qualifications</li><li>04 · Contact references</li><li>05 · Approve profile</li></ol></div><div className="panel p-5"><div className="flex items-center gap-2"><Users className="size-4 text-primary" /><h2 className="text-sm font-semibold">Current coverage</h2></div><div className="mt-4 space-y-2">{CATEGORIES.map((c) => <Link key={c.slug} to="/coverage/$category" params={{ category: c.slug }} className="flex justify-between rounded px-1 py-0.5 text-xs hover:bg-accent hover:text-primary"><span>{c.name}</span><span className="font-mono text-primary">{workers.filter((w) => w.category === c.slug).length}</span></Link>)}</div></div><div className="panel p-5"><div className="flex items-center gap-2"><BadgeCheck className="size-4 text-primary" /><h2 className="text-sm font-semibold">Seed queue</h2></div><p className="mt-3 text-xs leading-5 text-muted-foreground">{applications.length} applications loaded from the database.</p></div></aside>
      </div>
    </div>
  );
}