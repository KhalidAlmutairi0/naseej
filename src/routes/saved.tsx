import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { RequireRole } from "@/components/require-role";
import { FabricCard } from "@/components/fabric-card";
import { useFabricMemory } from "@/hooks/useFabrics";

export const Route = createFileRoute("/saved")({
  component: () => (
    <RequireRole role="customer">
      <SavedPage />
    </RequireRole>
  ),
  head: () => ({
    meta: [
      { title: "ذاكرة الأقمشة — نَسيج" },
      { name: "description", content: "الأقمشة التي قيّمتها أو تواصلت بشأنها." },
    ],
  }),
});

type Tab = "all" | "rated" | "contacted";

function SavedPage() {
  const { data: memory = [], isLoading } = useFabricMemory();
  const [tab, setTab] = useState<Tab>("all");

  const filtered = memory.filter((f) =>
    tab === "all" ? true : tab === "rated" ? f.rated : f.contacted,
  );

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "all", label: "الكل", count: memory.length },
    { id: "rated", label: "قيّمتها", count: memory.filter((f) => f.rated).length },
    { id: "contacted", label: "تواصلت بشأنها", count: memory.filter((f) => f.contacted).length },
  ];

  return (
    <AppShell title="ذاكرة الأقمشة">
      <div className="mb-5">
        <h2 className="text-2xl font-bold tracking-tight">ذاكرة أقمشتك</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          الأقمشة التي قيّمتها أو تواصلت بشأنها — حتى لو غيّرت الخياط.
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 pb-2 mb-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-medium transition ${
              tab === t.id
                ? "bg-primary text-primary-foreground"
                : "bg-card ring-1 ring-border text-foreground"
            }`}
          >
            {t.label} · {t.count}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((f) => (
            <FabricCard key={f.id} fabric={f} />
          ))}
        </div>
      )}
    </AppShell>
  );
}

function EmptyState() {
  return (
    <div className="mt-16 text-center">
      <div className="mx-auto grid size-20 place-items-center rounded-full bg-secondary">
        <Heart className="size-8 text-muted-foreground" />
      </div>
      <p className="mt-4 text-sm font-medium">لا توجد أقمشة في ذاكرتك بعد</p>
      <p className="mt-1 text-xs text-muted-foreground">قيّم قماشاً أو تواصل مع خياط ليظهر هنا</p>
      <Link
        to="/search"
        className="mt-5 inline-flex rounded-2xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
      >
        استكشف الآن
      </Link>
    </div>
  );
}
