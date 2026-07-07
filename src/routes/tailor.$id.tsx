import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, MapPin, Phone, MessageCircle, Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { FabricCard } from "@/components/fabric-card";
import { useShop } from "@/hooks/useShops";
import { useBrowseFabrics } from "@/hooks/useFabrics";

export const Route = createFileRoute("/tailor/$id")({
  component: TailorPage,
  head: () => ({
    meta: [{ title: "الخياط — نَسيج" }],
  }),
});

function TailorPage() {
  const { id } = Route.useParams();
  const { data: shop, isLoading } = useShop(id);
  const { data: fabrics = [] } = useBrowseFabrics({ shopId: id });

  if (isLoading) {
    return (
      <AppShell title="الخياط">
        <div className="grid place-items-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }
  if (!shop) {
    return (
      <AppShell title="غير موجود">
        <p className="text-sm text-muted-foreground">الخياط غير موجود.</p>
      </AppShell>
    );
  }

  return (
    <AppShell title={shop.name}>
      <Link
        to="/"
        className="mb-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowRight className="size-3.5" />
        رجوع
      </Link>

      {/* Cover */}
      <div className="relative h-40 rounded-3xl overflow-hidden bg-gradient-to-br from-primary to-primary/60">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `repeating-linear-gradient(45deg, transparent 0 6px, rgba(255,255,255,0.12) 6px 7px)`,
          }}
        />
        <div className="absolute -bottom-8 right-5">
          <div className="size-20 rounded-3xl grid place-items-center bg-primary text-primary-foreground text-2xl font-bold ring-4 ring-background shadow-lg">
            {shop.name.charAt(0)}
          </div>
        </div>
      </div>

      <div className="mt-10">
        <h1 className="text-xl font-bold tracking-tight">{shop.name}</h1>
        {shop.location && (
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3" />
            {shop.location}
          </p>
        )}

        {/* Actions */}
        {shop.contact_phone && (
          <div className="mt-5 flex gap-2">
            <a
              href={`https://wa.me/${shop.contact_phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl bg-primary text-primary-foreground py-3 text-sm font-bold shadow-md shadow-primary/20"
            >
              <MessageCircle className="size-4" />
              واتساب
            </a>
            <a
              href={`tel:${shop.contact_phone}`}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl border border-border bg-card py-3 text-sm font-bold"
            >
              <Phone className="size-4" />
              اتصال
            </a>
          </div>
        )}

        {/* Fabrics */}
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-bold">الأقمشة المتوفرة</h3>
            <span className="text-xs text-muted-foreground">{fabrics.length} قماش</span>
          </div>
          {fabrics.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              لا توجد أقمشة منشورة لهذا الخياط بعد.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {fabrics.map((f) => (
                <FabricCard key={f.id} fabric={f} />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
