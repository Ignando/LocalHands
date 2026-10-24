import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { BadgeCheck, BriefcaseBusiness, House, LogOut, MapPin, ShieldCheck, Star, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { getCategory, rand, type Category, type Review, type Worker } from "@/lib/mock-data";
import { useStore } from "@/lib/store";

export function Avatar({ worker, size = "md" }: { worker: Pick<Worker, "name" | "photo">; size?: "sm" | "md" | "lg" }) {
  const cls = size === "lg" ? "size-24 rounded-xl" : size === "sm" ? "size-10 rounded-md" : "size-14 rounded-lg";
  if (worker.photo)
    return <img src={worker.photo} alt={worker.name} loading="lazy" width={816} height={816} className={cn(cls, "shrink-0 object-cover border border-border")} />;
  const initials = worker.name.split(" ").map((p) => p[0]).join("").slice(0, 2);
  return (
    <div className={cn(cls, "grid shrink-0 place-items-center border border-border bg-accent font-display font-semibold text-primary", size === "lg" && "text-2xl")}>
      {initials}
    </div>
  );
}

const tones = {
  green: "bg-primary/10 text-primary",
  amber: "bg-warning/10 text-warning",
  blue: "bg-info/10 text-info",
  red: "bg-destructive/10 text-destructive",
  muted: "bg-muted text-muted-foreground",
} as const;

export function StatusBadge({ children, tone = "muted" }: { children: ReactNode; tone?: keyof typeof tones }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-1 font-mono text-[10px] uppercase tracking-wide whitespace-nowrap", tones[tone])}>{children}</span>;
}

export function statusTone(s: string): keyof typeof tones {
  if (["Approved", "Accepted", "Completed", "Verified"].includes(s)) return "green";
  if (["Pending", "Under Review", "Application Submitted"].includes(s)) return "amber";
  if (s === "Interview Required") return "blue";
  if (["Rejected", "Declined"].includes(s)) return "red";
  return "muted";
}

export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-primary", className)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={cn("size-3.5", i <= Math.round(value) ? "fill-current" : "opacity-25")} />
      ))}
    </span>
  );
}

export function SectionHead({ title, tag, action }: { title: string; tag?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {action ?? (tag && <span className="font-mono text-[11px] text-muted-foreground">{tag}</span>)}
    </div>
  );
}

export function CategoryCard({ cat, index, active, onClick }: { cat: Category; index: number; active?: boolean; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn("panel panel-hover block p-4 text-left", active && "border-primary ring-1 ring-primary")}>
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] text-primary">{String(index + 1).padStart(2, "0")}</span>
        <span className="text-lg">{cat.icon}</span>
      </div>
      <div className="mt-3 font-display text-sm font-medium leading-tight">{cat.name}</div>
      <div className="mt-1 text-xs text-muted-foreground">{cat.blurb}</div>
    </button>
  );
}

export function WorkerCard({ worker, available = worker.availability !== "NextWeek" }: { worker: Worker; available?: boolean }) {
  const cat = getCategory(worker.category);
  return (
    <div className="panel panel-hover flex flex-col overflow-hidden">
      <Link to="/pro/$id" params={{ id: worker.id }} className="flex items-center gap-3 p-4">
        <Avatar worker={worker} />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 font-display text-sm font-semibold">
            <span className="truncate">{worker.name}</span>
            {worker.verified && <BadgeCheck className="size-4 shrink-0 text-primary" />}
          </div>
          <div className="mt-0.5 flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
            <MapPin className="size-3" /> {cat?.name.split(" ")[0]} · {worker.location}
          </div>
          <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">{worker.years} yrs · {worker.jobs} jobs</div>
        </div>
      </Link>
      <div className="flex flex-wrap items-center gap-2 px-4 pb-3 text-xs">
        <span className="font-mono text-primary">★ {worker.rating.toFixed(1)}</span>
        <span className="text-muted-foreground">({worker.reviews})</span>
        <span className="ml-auto" />
        {worker.qualified && <StatusBadge tone="blue"><ShieldCheck className="size-3" />Qualified</StatusBadge>}
        <StatusBadge tone={available ? "green" : "muted"}>{available ? "Available" : "Next week"}</StatusBadge>
      </div>
      <div className="mt-auto flex items-center justify-between border-t border-border px-4 py-3">
        <span className="font-display font-semibold">
          <span className="mr-1 font-sans text-[11px] font-normal text-muted-foreground">from</span>
          {rand(worker.startPrice)}
        </span>
        <Button asChild size="sm"><Link to="/pro/$id" params={{ id: worker.id }}>View & request</Link></Button>
      </div>
    </div>
  );
}

export function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{review.author}</span>
        <Stars value={review.rating} />
      </div>
      <p className="mt-2 text-sm text-muted-foreground">"{review.text}"</p>
      <div className="mt-3 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{review.service} · {review.date}</div>
    </div>
  );
}

export function DashboardCard({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: string; tone?: "green" }) {
  return (
    <div className="panel p-4">
      <div className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("mt-2 font-display text-2xl font-semibold", tone === "green" && "text-primary")}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function SignOut() {
  const { signOut } = useStore();
  const navigate = useNavigate();
  const router = useRouter();
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={async () => {
        try {
          await signOut();
          await router.invalidate();
          await navigate({ to: "/signin" });
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Could not sign out");
        }
      }}
    >
      <LogOut className="size-3.5" />Sign out
    </Button>
  );
}

export function Navbar() {
  const { account, role } = useStore();
  const displayName = account?.name.trim() || account?.email || "Signed in";
  const roleLabel = role === "admin" ? "Admin" : role === "worker" ? "Worker" : role === "customer" ? "Customer" : "";
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <div className="flex items-center gap-6">
          <Link to={role === "worker" ? "/worker-dashboard" : role === "admin" ? "/admin" : "/"} className="flex items-center gap-2.5">
            <div className="grid size-7 place-items-center rounded-md bg-primary">
              <span className="font-display text-[11px] font-bold text-primary-foreground">LH</span>
            </div>
            <div>
              <div className="font-display text-[15px] font-semibold leading-none">LocalHands</div>
              <div className="mt-0.5 font-mono text-[10px] tracking-wide text-muted-foreground">CAPE TOWN · LOCAL SERVICES</div>
            </div>
          </Link>
          {role === "customer" && (
            <nav className="hidden gap-5 text-sm text-muted-foreground md:flex">
              <Link to="/" className="flex items-center gap-1.5 hover:text-foreground" activeOptions={{ exact: true }} activeProps={{ className: "text-foreground" }}><House className="size-3.5" />Home</Link>
              <Link to="/apply" className="flex items-center gap-1.5 hover:text-foreground" activeProps={{ className: "text-foreground" }}><BriefcaseBusiness className="size-3.5" />Become a worker</Link>
            </nav>
          )}
          {role === "worker" && <nav className="hidden gap-5 text-sm text-muted-foreground md:flex"><Link to="/worker-dashboard" className="flex items-center gap-1.5 hover:text-foreground" activeProps={{ className: "text-foreground" }}><House className="size-3.5" />Worker workspace</Link><Link to="/worker-profile" className="flex items-center gap-1.5 hover:text-foreground" activeProps={{ className: "text-foreground" }}><UserRound className="size-3.5" />Profile</Link></nav>}
          {role === "admin" && <nav className="hidden text-sm text-muted-foreground md:flex"><Link to="/admin" className="flex items-center gap-1.5 hover:text-foreground" activeProps={{ className: "text-foreground" }}><ShieldCheck className="size-3.5" />Review queue</Link></nav>}
        </div>
        {role ? <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3"><div className="min-w-0 text-right"><div className="max-w-[110px] truncate text-xs font-medium text-foreground sm:max-w-[220px]">{displayName}</div><div className="font-mono text-[9px] uppercase tracking-wide text-primary">{roleLabel}</div></div><SignOut /></div> : <div className="ml-auto flex items-center gap-3"><span className="font-mono text-[9px] uppercase tracking-wide text-muted-foreground">Guest</span><Button asChild size="sm"><Link to="/signin">Sign in</Link></Button></div>}
      </div>
    </header>
  );
}
