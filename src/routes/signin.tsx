import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCurrentAccount, registerCustomer, signIn } from "@/lib/server/auth";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/signin")({
  head: () => ({
    meta: [
      { title: "Sign in — LocalHands" },
      { name: "description", content: "Sign in to your LocalHands account." },
      { property: "og:title", content: "Sign in — LocalHands" },
      { property: "og:description", content: "Sign in to LocalHands to manage bookings and services." },
    ],
  }),
  loader: async () => {
    const account = await getCurrentAccount();
    if (account) throw redirect({ to: account.role === "admin" ? "/admin" : account.role === "worker" ? "/worker-dashboard" : "/" });
  },
  component: SignIn,
});

function destination(role: "customer" | "worker" | "admin") {
  if (role === "admin") return "/admin" as const;
  if (role === "worker") return "/worker-dashboard" as const;
  return "/" as const;
}

function SignIn() {
  const { setAccount } = useStore();
  const navigate = useNavigate();
  const router = useRouter();
  const [registering, setRegistering] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    const data = new FormData(event.currentTarget);
    try {
      const credentials = {
        email: String(data.get("email") ?? ""),
        password: String(data.get("password") ?? ""),
      };
      const account = registering
        ? await registerCustomer({
            data: { ...credentials, name: String(data.get("name") ?? "") },
          })
        : await signIn({ data: credentials });
      setAccount(account);
      await router.invalidate();
      await navigate({ to: destination(account.role) });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="animate-rise mx-auto max-w-[520px] py-16">
      <div className="eyebrow">// {registering ? "Create account" : "Sign in"}</div>
      <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
        {registering ? "Join LocalHands." : "Welcome back."}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {registering
          ? "Create a customer account. You can apply to become a worker after signing in."
          : "Sign in with the email and password for your account."}
      </p>

      <form onSubmit={submit} className="panel mt-8 grid gap-4 p-5 sm:p-7">
        {registering && (
          <label className="grid gap-2 text-xs text-muted-foreground">
            Full name
            <Input name="name" autoComplete="name" required minLength={2} maxLength={100} />
          </label>
        )}
        <label className="grid gap-2 text-xs text-muted-foreground">
          Email
          <Input name="email" type="email" autoComplete="email" required maxLength={254} />
        </label>
        <label className="grid gap-2 text-xs text-muted-foreground">
          Password
          <Input
            name="password"
            type="password"
            autoComplete={registering ? "new-password" : "current-password"}
            required
            minLength={registering ? 12 : 1}
            maxLength={128}
          />
          {registering && <span>Use at least 12 characters.</span>}
        </label>
        <Button type="submit" disabled={busy} className="mt-2 w-full">
          {busy ? "Please wait…" : registering ? "Create customer account" : "Sign in"}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        {registering ? "Already have an account?" : "New to LocalHands?"}{" "}
        <button
          type="button"
          className="font-medium text-primary hover:underline"
          onClick={() => setRegistering((value) => !value)}
        >
          {registering ? "Sign in" : "Create a customer account"}
        </button>
      </p>
    </div>
  );
}
