import { createFileRoute, Link } from "@tanstack/react-router";
import { Package, Ruler, Users, Inbox, Plus, ArrowLeft } from "lucide-react";
import { ShopShell } from "@/components/shop-shell";
import { FabricImage } from "@/components/fabric-image";
import { useSession } from "@/hooks/useSession";
import { useShopFabrics } from "@/hooks/useFabrics";
import { useShopCustomers } from "@/hooks/useCustomers";
import { useShopInbox } from "@/hooks/useContactRequests";
import { useShop } from "@/hooks/useShops";

export const Route = createFileRoute("/shop/")({
  component: ShopDashboard,
  head: () => ({
    meta: [{ title: "لوحة التحكم - نَسيج" }, { name: "description", content: "ملخص نشاط محلك." }],
  }),
});

function ShopDashboard() {
  const { shopId } = useSession();
  const { data: shop } = useShop(shopId);
  const { data: fabrics = [] } = useShopFabrics(shopId);
  const { data: customers = [] } = useShopCustomers(shopId);
  const { data: inbox = [] } = useShopInbox(shopId);

  const stats = [
    { label: "الأقمشة", value: fabrics.length, icon: Package, tone: "success" as const },
    { label: "العملاء", value: customers.length, icon: Users, tone: "primary" as const },
    { label: "طلبات التواصل", value: inbox.length, icon: Inbox, tone: "warning" as const },
  ];

  return (
    <ShopShell title={shop?.name ?? "لوحة التحكم"}>
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">أهلاً بك،</p>
          <h1 className="text-2xl font-bold tracking-tight">{shop?.name ?? "محلك"} 👋</h1>
        </div>
        <Link
          to="/shop/inventory"
          className="flex items-center gap-1.5 rounded-2xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-bold shadow-md shadow-primary/20"
        >
          <Plus className="size-4" />
          إضافة قماش
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="card-elevated p-4">
            <div
              className={`grid size-10 place-items-center rounded-2xl ${
                s.tone === "primary"
                  ? "bg-primary/10 text-primary"
                  : s.tone === "success"
                    ? "bg-success/15 text-success"
                    : "bg-warning/15 text-warning"
              }`}
            >
              <s.icon className="size-4" />
            </div>
            <p className="mt-4 text-2xl font-bold">{s.value}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <section className="mt-6">
        <h3 className="mb-3 text-sm font-bold">اختصارات</h3>
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { to: "/shop/inventory", label: "إضافة قماش جديد", icon: Package },
            { to: "/shop/customers", label: "قياس عميل", icon: Ruler },
            { to: "/shop/inbox", label: "طلبات التواصل", icon: Inbox },
          ].map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className="flex items-center gap-3 rounded-2xl bg-secondary/60 p-3 hover:bg-secondary transition"
            >
              <div className="grid size-9 place-items-center rounded-xl bg-primary text-accent">
                <a.icon className="size-4" />
              </div>
              <span className="flex-1 text-xs font-medium">{a.label}</span>
              <ArrowLeft className="size-3.5 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </section>

      {/* Recent fabrics */}
      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold">أحدث الأقمشة</h3>
          <Link to="/shop/inventory" className="text-xs font-medium text-accent">
            عرض الكل
          </Link>
        </div>
        {fabrics.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
            لم تضف أي قماش بعد.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {fabrics.slice(0, 4).map((f) => (
              <div key={f.id} className="card-elevated p-3">
                <FabricImage
                  src={f.image_url}
                  sku={f.sku}
                  className="aspect-square w-full rounded-xl mb-3"
                />
                <p className="text-[10px] text-accent font-bold uppercase tracking-wider">
                  {f.sku}
                </p>
                <p className="text-xs font-semibold line-clamp-1">{f.description || "بدون وصف"}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {f.price != null ? `${f.price} ر.س` : "-"}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </ShopShell>
  );
}
