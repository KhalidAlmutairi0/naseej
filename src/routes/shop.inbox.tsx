import { createFileRoute } from "@tanstack/react-router";
import { Phone, Inbox as InboxIcon, Loader2, MessageCircle } from "lucide-react";
import { ShopShell } from "@/components/shop-shell";
import { useSession } from "@/hooks/useSession";
import { useShopInbox } from "@/hooks/useContactRequests";

export const Route = createFileRoute("/shop/inbox")({
  component: Inbox,
  head: () => ({
    meta: [
      { title: "الرسائل - لوحة الخياط" },
      { name: "description", content: "استفسارات العملاء وطلباتهم." },
    ],
  }),
});

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] ?? "")
    .join("");
}

function Inbox() {
  const { shopId } = useSession();
  const { data: items = [], isLoading } = useShopInbox(shopId);

  return (
    <ShopShell title="الرسائل">
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">طلبات التواصل</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          العملاء المهتمون بأقمشتك - {items.length} طلب
        </p>
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border py-16 text-center">
          <InboxIcon className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">لا توجد طلبات تواصل بعد</p>
          <p className="mt-1 text-xs text-muted-foreground">
            ستظهر هنا عندما يتواصل عميل بخصوص قماش.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((r) => (
            <div key={r.id} className="card-elevated p-4">
              <div className="flex items-start gap-3">
                <div className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-sm font-bold">
                  {initials(r.customer?.full_name ?? "؟")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold truncate">
                      {r.customer?.full_name ?? "عميل"}
                    </h4>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(r.created_at).toLocaleString("ar-SA")}
                    </span>
                  </div>
                  {r.fabric && (
                    <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-secondary px-2 py-0.5 text-[10px]">
                      <MessageCircle className="size-3" />
                      <span className="font-medium">{r.fabric.sku}</span>
                      {r.fabric.description && (
                        <span className="text-muted-foreground line-clamp-1 max-w-[160px]">
                          - {r.fabric.description}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="mt-3 flex items-center gap-2">
                    {r.customer?.phone && (
                      <>
                        <a
                          href={`tel:${r.customer.phone}`}
                          className="flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-3 py-1.5 text-[11px] font-bold"
                        >
                          <Phone className="size-3" />
                          اتصال
                        </a>
                        <a
                          href={`https://wa.me/${r.customer.phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-xl border border-border bg-card px-3 py-1.5 text-[11px] font-medium"
                        >
                          واتساب
                        </a>
                        <span className="text-[11px] text-muted-foreground" dir="ltr">
                          {r.customer.phone}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </ShopShell>
  );
}
