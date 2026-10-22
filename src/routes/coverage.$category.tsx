import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/market/shared";
import { Button } from "@/components/ui/button";
import { getCategory } from "@/lib/mock-data";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/coverage/$category")({
  loader: ({ params }) => {
    const cat = getCategory(params.category);
    if (!cat) throw notFound();
    return { cat };
  },
  head: ({ loaderData }) => {
    const t = loaderData ? `${loaderData.cat.name} workers — LocalHands admin` : "Unavailable";
    const d = "Manage the workers listed in this LocalHands category.";
    return { meta: [{ title: t }, { name: "description", content: d }, { property: "og:title", content: t }, { property: "og:description", content: d }, { name: "robots", content: "noindex" }] };
  },
  component: CoveragePage,
});

function CoveragePage() {
  const { cat } = Route.useLoaderData();
  const { workers, removeWorker } = useStore();
  const list = workers.filter((w) => w.category === cat.slug);
  return (
    <div className="animate-rise py-10">
      <Link to="/admin" className="font-mono text-[11px] text-muted-foreground hover:text-foreground">← review queue</Link>
      <div className="mt-4 flex items-center gap-3"><span className="text-3xl">{cat.icon}</span><h1 className="text-3xl font-bold sm:text-4xl">{cat.name}</h1></div>
      <p className="mt-2 text-sm text-muted-foreground">{list.length} workers currently listed.</p>
      <div className="mt-8 space-y-3">
        {list.map((w) => (
          <article key={w.id} className="panel flex flex-wrap items-center gap-4 p-4">
            <Avatar worker={w} size="sm" />
            <div className="min-w-0">
              <Link to="/pro/$id" params={{ id: w.id }} className="font-display text-sm font-semibold hover:text-primary">{w.name}</Link>
              <div className="font-mono text-[11px] text-muted-foreground">{w.location} · ★ {w.rating.toFixed(1)} · {w.jobs} jobs</div>
            </div>
            <Button size="sm" variant="outline" className="ml-auto text-destructive" onClick={() => { removeWorker(w.id); toast.success(`${w.name} removed`); }}>
              <Trash2 className="size-3.5" />Remove
            </Button>
          </article>
        ))}
        {list.length === 0 && <p className="panel p-6 text-center text-sm text-muted-foreground">No workers in this category.</p>}
      </div>
    </div>
  );
}
