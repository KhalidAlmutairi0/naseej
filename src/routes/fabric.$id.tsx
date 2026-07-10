import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Share2, Star, Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { FabricCard } from "@/components/fabric-card";
import { FabricImage } from "@/components/fabric-image";
import { FabricRating } from "@/components/fabric/FabricRating";
import { ContactShopButton } from "@/components/fabric/ContactShopButton";
import { useFabric, useBrowseFabrics } from "@/hooks/useFabrics";
import { useFabricRatings } from "@/hooks/useRatings";
import { useShop } from "@/hooks/useShops";

export const Route = createFileRoute("/fabric/$id")({
  component: FabricDetail,
  head: () => ({
    meta: [{ title: "تفاصيل القماش - نَسيج" }],
  }),
});

function FabricDetail() {
  const { id } = Route.useParams();
  const { data: fabric, isLoading } = useFabric(id);
  const { data: ratingData } = useFabricRatings(id);
  const { data: shop } = useShop(fabric?.shop_id);
  const { data: allFabrics = [] } = useBrowseFabrics(
    fabric?.season_tags?.[0] ? { season: fabric.season_tags[0] } : {},
  );

  if (isLoading) {
    return (
      <AppShell title="تفاصيل القماش">
        <div className="grid place-items-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }
  if (!fabric) {
    return (
      <AppShell title="غير موجود">
        <p className="text-sm text-muted-foreground">القماش غير موجود.</p>
      </AppShell>
    );
  }

  const aggregate = ratingData?.aggregate;
  const reviews = ratingData?.ratings ?? [];
  const similar = allFabrics.filter((f) => f.id !== fabric.id).slice(0, 4);

  return (
    <AppShell title={fabric.sku}>
      <Link
        to="/"
        className="mb-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowRight className="size-3.5" />
        رجوع
      </Link>

      {/* Gallery */}
      <div className="relative overflow-hidden rounded-3xl">
        <FabricImage src={fabric.image_url} sku={fabric.sku} className="aspect-square w-full" />
        <div className="absolute top-4 left-4 flex gap-2">
          <button className="grid size-10 place-items-center rounded-full bg-card/85 backdrop-blur ring-1 ring-border shadow-sm">
            <Share2 className="size-4" />
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="mt-5">
        <p className="text-[10px] font-medium uppercase tracking-widest text-accent">
          {fabric.sku}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{shop?.name ?? "قماش"}</h1>
        <div className="mt-2 flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1">
            <Star className="size-3.5 fill-accent text-accent" />
            <span className="font-bold">
              {aggregate && aggregate.count > 0 ? aggregate.average.toFixed(1) : "-"}
            </span>
            <span className="text-muted-foreground">({aggregate?.count ?? 0} تقييم)</span>
          </span>
        </div>
        <div className="mt-4 flex items-end justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground">السعر / متر</p>
            <p className="text-3xl font-bold text-primary">
              {fabric.price != null ? fabric.price : "-"}
              <span className="text-sm font-medium text-muted-foreground mr-1">ر.س</span>
            </p>
          </div>
        </div>
      </div>

      {/* Season tags */}
      {fabric.season_tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {fabric.season_tags.map((t) => (
            <span key={t} className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-medium">
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Description */}
      <section className="mt-6">
        <h3 className="text-sm font-bold mb-2">الوصف</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {fabric.description || "لا يوجد وصف لهذا القماش."}
        </p>
      </section>

      {/* Shop */}
      {shop && (
        <section className="mt-6">
          <h3 className="text-sm font-bold mb-2">متوفر لدى</h3>
          <Link
            to="/tailor/$id"
            params={{ id: shop.id }}
            className="card-elevated p-4 flex items-center gap-3 hover:bg-secondary/50 transition"
          >
            <div className="size-12 rounded-2xl grid place-items-center bg-primary text-primary-foreground font-bold">
              {shop.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold truncate">{shop.name}</h4>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{shop.location ?? "-"}</p>
            </div>
            <ArrowRight className="size-4 text-muted-foreground rotate-180" />
          </Link>
        </section>
      )}

      {/* Rate */}
      <section className="mt-6">
        <FabricRating fabricId={fabric.id} />
      </section>

      {/* Reviews */}
      {reviews.length > 0 && (
        <section className="mt-6">
          <h3 className="text-sm font-bold mb-3">آراء العملاء</h3>
          <div className="space-y-3">
            {reviews
              .filter((r) => r.review_text)
              .map((r) => (
                <div key={r.id} className="card-elevated p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-0.5">
                      {Array.from({ length: r.stars }).map((_, i) => (
                        <Star key={i} className="size-3 fill-accent text-accent" />
                      ))}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("ar-SA")}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    {r.review_text}
                  </p>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* Similar */}
      {similar.length > 0 && (
        <section className="mt-6">
          <h3 className="text-sm font-bold mb-3">أقمشة مشابهة</h3>
          <div className="grid grid-cols-2 gap-3">
            {similar.map((f) => (
              <FabricCard key={f.id} fabric={f} />
            ))}
          </div>
        </section>
      )}

      {/* Sticky action bar */}
      <div className="fixed bottom-16 inset-x-0 z-30 border-t border-border/50 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-5 py-3">
          {shop?.contact_phone && (
            <a
              href={`tel:${shop.contact_phone}`}
              className="grid size-12 place-items-center rounded-2xl border border-border bg-card"
            >
              <Star className="size-4" />
            </a>
          )}
          <ContactShopButton fabricId={fabric.id} shopId={fabric.shop_id} />
        </div>
      </div>
    </AppShell>
  );
}
