import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { CalendarDays, CheckCircle2, Clock3, WalletCards } from "lucide-react";
import { DashboardCard, StatusBadge, statusTone } from "@/components/market/shared";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getCurrentAccount } from "@/lib/server/auth";
import { rand } from "@/lib/mock-data";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/worker-dashboard")({
  head: () => ({ meta: [{ title: "Worker workspace — LocalHands" }, { name: "description", content: "Review your service requests, availability and earnings." }, { property: "og:title", content: "Worker workspace — LocalHands" }, { property: "og:description", content: "Manage your LocalHands worker account." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  loader: async () => {
    const account = await getCurrentAccount();
    if (account?.role !== "worker") throw redirect({ to: "/signin" });
  },
  component: WorkerDashboard,
});

function WorkerDashboard() {
  const { account, requests, setRequestStatus, workers } = useStore();
  const worker = workers.find((item) => item.id === account?.workerPublicId);
  const own = worker ? requests.filter((request) => request.workerId === worker.id) : [];
  const accepted = own.filter((request) => request.status === "Accepted");
  const upcomingCalendar = accepted
    .filter((request) => Date.parse(request.scheduledAt) >= Date.now())
    .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));
  const completed = own.filter((request) => request.status === "Completed");
  const earnings = completed.reduce((sum, request) => sum + request.total, 0);
  if (!worker) return <p className="py-12 text-center text-sm text-muted-foreground">Your worker profile is not available yet. Contact an administrator for help.</p>;

  const updateStatus = async (id: string, status: "Accepted" | "Declined" | "Completed") => {
    try {
      await setRequestStatus(id, status);
      toast.success(`Booking ${status.toLowerCase()}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update booking");
    }
  };

  return (
    <div className="animate-rise py-10">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="eyebrow">// Worker workspace</div><h1 className="mt-2 text-3xl font-bold sm:text-4xl">Welcome, {account?.name.split(" ")[0] ?? "worker"}.</h1><p className="mt-2 text-sm text-muted-foreground">Here’s what needs your attention today.</p></div><div className="flex gap-2"><Button asChild variant="outline"><Link to="/pro/$id" params={{ id: worker.id }}>View public profile</Link></Button><Button asChild><Link to="/worker-profile">Edit profile</Link></Button></div></div>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><DashboardCard label="New requests" value={own.filter((r) => r.status === "Pending").length} sub="Waiting for your response" tone="green" /><DashboardCard label="Upcoming jobs" value={accepted.length} sub="Accepted bookings" /><DashboardCard label="Completed" value={completed.length} sub="Database bookings" /><DashboardCard label="Earnings" value={rand(earnings)} sub="Completed jobs" /></div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <section><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">Service requests</h2><span className="font-mono text-[10px] text-muted-foreground">{own.length} TOTAL</span></div><div className="space-y-3">{own.map((request) => <article key={request.id} className="panel p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><strong className="text-sm">{request.service}</strong><StatusBadge tone={statusTone(request.status)}>{request.status}</StatusBadge></div><p className="mt-2 text-xs text-muted-foreground">{request.customer} · {request.location}</p><p className="mt-1 flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground"><Clock3 className="size-3" />{request.date} at {request.time}</p></div><div className="text-right"><div className="font-semibold">{rand(request.total)}</div><div className="mt-3 flex gap-2">{request.status === "Pending" && <><Button size="sm" variant="outline" onClick={() => void updateStatus(request.id, "Declined")}>Decline</Button><Button size="sm" onClick={() => void updateStatus(request.id, "Accepted")}>Accept</Button></>}{request.status === "Accepted" && <Button size="sm" onClick={() => void updateStatus(request.id, "Completed")}>Mark complete</Button>}</div></div></div>{request.notes && <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">“{request.notes}”</p>}</article>)}</div></section>
        <aside className="space-y-4"><div className="panel p-5"><div className="flex items-center gap-2"><CalendarDays className="size-4 text-primary" /><h2 className="text-sm font-semibold">Upcoming calendar</h2></div><div className="mt-4 space-y-3">{upcomingCalendar.length ? upcomingCalendar.slice(0, 8).map((booking) => { const scheduled = new Date(booking.scheduledAt); return <div key={booking.id} className="border-b border-border pb-3 last:border-0 last:pb-0"><div className="flex justify-between gap-2 text-xs"><span className="font-medium">{scheduled.toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short", timeZone: "Africa/Johannesburg" })}</span><span className="font-mono text-muted-foreground">{scheduled.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Johannesburg" })}</span></div><p className="mt-1 text-xs text-muted-foreground">{booking.customer} · {booking.service}</p></div>; }) : <p className="text-xs leading-5 text-muted-foreground">Accepted upcoming bookings will appear here.</p>}</div></div><div className="panel p-5"><div className="flex items-center gap-2"><CheckCircle2 className="size-4 text-primary" /><h2 className="text-sm font-semibold">Profile strength</h2></div><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full w-[92%] bg-primary" /></div><p className="mt-3 text-xs text-muted-foreground">Identity, experience and customer ratings verified.</p></div><div className="panel p-5"><div className="flex items-center gap-2"><WalletCards className="size-4 text-primary" /><h2 className="text-sm font-semibold">Payouts</h2></div><p className="mt-3 text-xs leading-5 text-muted-foreground">Payments are outside this prototype. Completed jobs still appear in the earnings total.</p></div></aside>
      </div>
    </div>
  );
}