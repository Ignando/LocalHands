import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BriefcaseBusiness, ShieldCheck, UserRound } from "lucide-react";
import { useStore, type Role } from "@/lib/store";

export const Route = createFileRoute("/signin")({
  head: () => ({
    meta: [
      { title: "Sign in — LocalHands" },
      { name: "description", content: "Sign in to LocalHands as a customer, worker or admin." },
      { property: "og:title", content: "Sign in — LocalHands" },
      { property: "og:description", content: "Choose your LocalHands account type to continue." },
    ],
  }),
  component: SignIn,
});

const OPTIONS: { id: Role; label: string; desc: string; icon: typeof UserRound; to: "/" | "/worker-dashboard" | "/admin" }[] = [
  { id: "customer", label: "Customer", desc: "Find and book trusted local workers.", icon: UserRound, to: "/" },
  { id: "worker", label: "Worker", desc: "Manage requests and your public profile.", icon: BriefcaseBusiness, to: "/worker-dashboard" },
  { id: "admin", label: "Admin", desc: "Review applications and manage coverage.", icon: ShieldCheck, to: "/admin" },
];

function SignIn() {
  const { setRole } = useStore();
  const navigate = useNavigate();
  return (
    <div className="animate-rise mx-auto max-w-[640px] py-16">
      <div className="eyebrow">// Sign in</div>
      <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Welcome to LocalHands.</h1>
      <p className="mt-2 text-sm text-muted-foreground">Prototype sign-in — pick an account type to continue. No password needed.</p>
      <div className="mt-8 grid gap-3">
        {OPTIONS.map(({ id, label, desc, icon: Icon, to }) => (
          <button
            key={id}
            type="button"
            onClick={() => { setRole(id); navigate({ to }); }}
            className="panel panel-hover flex items-center gap-4 p-5 text-left"
          >
            <Icon className="size-5 text-primary" />
            <div>
              <div className="font-display font-semibold">Continue as {label}</div>
              <div className="text-xs text-muted-foreground">{desc}</div>
            </div>
            <span className="ml-auto font-mono text-[11px] text-primary">→</span>
          </button>
        ))}
      </div>
    </div>
  );
}
