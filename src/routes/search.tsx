import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, SlidersHorizontal, X, Loader2, Search as SearchIcon } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { FabricCard } from "@/components/fabric-card";
import { useBrowseFabrics } from "@/hooks/useFabrics";
import { useFabricSearch, type SearchHit } from "@/hooks/useFabricSearch";
import { useSession } from "@/hooks/useSession";

const searchSchema = z.object({ q: z.string().optional().catch("") });

export const Route = createFileRoute("/search")({
  validateSearch: searchSchema,
  component: SearchPage,
  head: () => ({
    meta: [
      { title: "بحث الأقمشة — نَسيج" },
      { name: "description", content: "ابحث بالذكاء الاصطناعي عن قماشك المثالي." },
    ],
  }),
});

function SearchPage() {
  const { q } = Route.useSearch();
  const navigate = useNavigate();
  const { isAuthenticated } = useSession();
  const [query, setQuery] = useState(q ?? "");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeSeason, setActiveSeason] = useState<string | null>(null);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [semanticResults, setSemanticResults] = useState<SearchHit[] | null>(null);

  const search = useFabricSearch();
  const { data: browse = [], isLoading } = useBrowseFabrics({
    season: activeSeason ?? undefined,
    minPrice: minPrice.trim() === "" ? undefined : Number(minPrice),
    maxPrice: maxPrice.trim() === "" ? undefined : Number(maxPrice),
  });

  function runSemantic() {
    if (query.trim() === "") return;
    if (!isAuthenticated) {
      toast.info("سجّل دخولك لاستخدام البحث الذكي");
      navigate({ to: "/auth" });
      return;
    }
    search.mutate(query.trim(), {
      onSuccess: (hits) => setSemanticResults(hits),
      onError: () => toast.error("تعذّر تنفيذ البحث الذكي"),
    });
  }

  function clearSemantic() {
    setSemanticResults(null);
    setQuery("");
  }

  const inSemanticMode = semanticResults !== null;
  const results = inSemanticMode ? semanticResults! : browse;

  return (
    <AppShell title="البحث">
      {/* AI semantic search bar */}
      <div className="rounded-3xl bg-primary text-primary-foreground p-4 shadow-xl">
        <div className="flex items-center gap-2 text-accent mb-2">
          <Sparkles className="size-3.5" />
          <span className="text-[10px] font-semibold uppercase tracking-widest">
            بحث ذكي بالوصف
          </span>
        </div>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSemantic()}
            placeholder="قماش صيفي خفيف يشبه اللي أخذته الشتاء الماضي…"
            className="w-full rounded-2xl bg-primary-foreground/10 px-4 py-3 text-sm placeholder:text-primary-foreground/40 focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
          <button
            onClick={runSemantic}
            disabled={search.isPending}
            className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent text-primary"
            aria-label="بحث"
          >
            {search.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <SearchIcon className="size-4" />
            )}
          </button>
        </div>
      </div>

      {/* Filters bar (browse only) */}
      {!inSemanticMode && (
        <div className="mt-4 flex items-center gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 pb-1">
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className="shrink-0 flex items-center gap-1.5 rounded-full bg-card px-3.5 py-2 text-xs font-medium ring-1 ring-border"
          >
            <SlidersHorizontal className="size-3.5" />
            فلاتر
          </button>
          {["صيفي", "شتوي", "دائم"].map((s) => (
            <button
              key={s}
              onClick={() => setActiveSeason(activeSeason === s ? null : s)}
              className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-medium transition ${
                activeSeason === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-card ring-1 ring-border"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {filtersOpen && !inSemanticMode && (
        <div className="mt-3 card-elevated p-4 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold">نطاق السعر (ر.س)</h4>
            <button onClick={() => setFiltersOpen(false)} aria-label="إغلاق">
              <X className="size-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              inputMode="numeric"
              placeholder="من"
              dir="ltr"
              className="flex-1 rounded-xl bg-card ring-1 ring-border px-3 py-2 text-sm focus:outline-none"
            />
            <span className="text-muted-foreground">—</span>
            <input
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              inputMode="numeric"
              placeholder="إلى"
              dir="ltr"
              className="flex-1 rounded-xl bg-card ring-1 ring-border px-3 py-2 text-sm focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Results header */}
      <div className="mt-6 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          <span className="font-bold text-foreground">{results.length}</span>{" "}
          {inSemanticMode ? "نتيجة مطابقة لوصفك" : "قماش"}
        </p>
        {inSemanticMode && (
          <button onClick={clearSemantic} className="text-xs text-accent font-medium">
            رجوع للتصفح
          </button>
        )}
      </div>

      {/* Results grid */}
      {isLoading && !inSemanticMode ? (
        <div className="grid place-items-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3">
          {results.map((f) => (
            <FabricCard key={f.id} fabric={f} />
          ))}
        </div>
      )}

      {results.length === 0 && !isLoading && (
        <div className="mt-16 text-center">
          <div className="mx-auto grid size-20 place-items-center rounded-full bg-secondary text-3xl">
            🔍
          </div>
          <p className="mt-4 text-sm font-medium">
            {inSemanticMode ? "لا توجد أقمشة مطابقة لوصفك" : "لا توجد نتائج"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {inSemanticMode
              ? "جرّب وصفاً آخر — النتائج تعتمد على أوصاف الخياطين"
              : "جرّب فلاتر مختلفة"}
          </p>
        </div>
      )}
    </AppShell>
  );
}
