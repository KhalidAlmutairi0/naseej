import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Ruler, Store, Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AIPromptBox } from "@/components/ai-prompt-box";
import { FabricCard } from "@/components/fabric-card";
import { categories } from "@/lib/mock-data";
import { useBrowseFabrics } from "@/hooks/useFabrics";
import { useShops } from "@/hooks/useShops";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "نَسيج - اكتشف أفخر الأقمشة الرجالية" },
      {
        name: "description",
        content: "أفضل أقمشة الثياب السعودية، بحث بالذكاء الاصطناعي، وخياطون معتمدون.",
      },
    ],
  }),
});

function HomePage() {
  const { data: fabrics = [], isLoading } = useBrowseFabrics();
  const { data: shops = [] } = useShops();
  const featured = fabrics.slice(0, 6);

  return (
    <AppShell>
      {/* AI hero */}
      <AIPromptBox />

      {/* Categories → season/tag search */}
      <section className="mt-8">
        <SectionHeader title="تصفح حسب النوع" actionText="عرض الكل" to="/search" />
        <div className="grid grid-cols-6 gap-2 sm:gap-3">
          {categories.map((c) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.id}
                to="/search"
                search={{ q: c.label }}
                className="group flex flex-col items-center gap-1.5"
              >
                <div className="grid aspect-square w-full place-items-center rounded-2xl bg-secondary text-primary transition group-hover:bg-primary group-hover:text-accent">
                  <Icon className="size-5" strokeWidth={1.75} />
                </div>
                <span className="text-[10px] font-medium">{c.label}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Featured Fabrics */}
      <section className="mt-8">
        <SectionHeader title="أقمشة مختارة لك" actionText="عرض الكل" to="/search" />
        {isLoading ? (
          <div className="grid place-items-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : featured.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
            لا توجد أقمشة منشورة بعد.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {featured.slice(0, 4).map((f) => (
              <FabricCard key={f.id} fabric={f} />
            ))}
          </div>
        )}
      </section>

      {/* Measurement CTA */}
      <section className="mt-8">
        <Link
          to="/measurements"
          className="block card-elevated overflow-hidden bg-primary text-primary-foreground p-5 relative"
        >
          <div className="absolute -left-10 -bottom-10 size-40 rounded-full bg-accent/15 blur-3xl" />
          <div className="relative flex items-center gap-2 text-accent">
            <Ruler className="size-4" />
            <span className="text-[11px] font-semibold uppercase tracking-widest">
              قياساتك الرقمية
            </span>
          </div>
          <h3 className="relative mt-2 text-lg font-bold">سجّلك محفوظ عبر كل الخياطين</h3>
          <div className="relative mt-4 flex items-center justify-between text-xs text-primary-foreground/80">
            <span>عرض السجل الكامل</span>
            <ArrowLeft className="size-4" />
          </div>
        </Link>
      </section>

      {/* Shops */}
      {shops.length > 0 && (
        <section className="mt-8">
          <SectionHeader title="خياطون على المنصة" />
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5 pb-2">
            {shops.map((s) => (
              <Link
                key={s.id}
                to="/tailor/$id"
                params={{ id: s.id }}
                className="shrink-0 w-40 card-elevated p-4"
              >
                <div className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground font-bold">
                  {s.name.charAt(0)}
                </div>
                <h4 className="mt-3 text-sm font-semibold line-clamp-1">{s.name}</h4>
                <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-1">
                  {s.location ?? "-"}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Tailor role switch */}
      <section className="mt-8">
        <Link
          to="/shop"
          className="flex items-center gap-3 card-elevated p-4 bg-secondary/60 hover:bg-secondary transition"
        >
          <div className="grid size-11 place-items-center rounded-2xl bg-primary text-accent">
            <Store className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold">صاحب خياط؟</h4>
            <p className="text-[11px] text-muted-foreground">ادخل للوحة تحكم المحل</p>
          </div>
          <ArrowLeft className="size-4 text-muted-foreground" />
        </Link>
      </section>
    </AppShell>
  );
}

function SectionHeader({
  title,
  actionText,
  to,
}: {
  title: string;
  actionText?: string;
  to?: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h3 className="text-base font-bold tracking-tight">{title}</h3>
      {actionText && to && (
        <Link to={to} className="text-xs font-medium text-accent hover:underline">
          {actionText}
        </Link>
      )}
    </div>
  );
}
