import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Phone, Ruler, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ShopShell } from "@/components/shop-shell";
import { MeasurementEntryForm } from "@/components/measurements/MeasurementEntryForm";
import { MeasurementHistoryTable } from "@/components/measurements/MeasurementHistoryTable";
import { useSession } from "@/hooks/useSession";
import { useCustomerSearch, useShopCustomers } from "@/hooks/useCustomers";
import {
  useCustomerMeasurementsAtShop,
  useRecordMeasurement,
  type MeasurementValues,
} from "@/hooks/useMeasurements";
import type { Customer } from "@/lib/types";

export const Route = createFileRoute("/shop/customers")({
  component: Customers,
  head: () => ({
    meta: [
      { title: "العملاء — لوحة الخياط" },
      { name: "description", content: "ابحث في عملائك، قياساتهم، وسجلهم." },
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

function Customers() {
  const { shopId, userId } = useSession();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);

  const { data: searchResults = [], isFetching } = useCustomerSearch(query);
  const { data: shopCustomers = [] } = useShopCustomers(shopId);

  if (selected) {
    return (
      <CustomerDetail
        customer={selected}
        shopId={shopId}
        userId={userId}
        onBack={() => setSelected(null)}
      />
    );
  }

  const showingSearch = query.trim().length >= 2;
  const list = showingSearch ? searchResults : shopCustomers;

  return (
    <ShopShell title="العملاء">
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">قاعدة العملاء</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          ابحث بالاسم أو الجوال لإيجاد عميل مسجّل وإضافة قياساته
        </p>
      </div>

      <div className="mb-5 flex items-center gap-2 rounded-2xl bg-card px-3 py-2 ring-1 ring-border">
        <Search className="size-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث بالاسم أو رقم الجوال..."
          className="flex-1 bg-transparent text-sm focus:outline-none"
        />
        {isFetching && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
      </div>

      {showingSearch && searchResults.length === 0 && !isFetching && (
        <div className="rounded-2xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
          لا يوجد عميل بهذا الاسم أو الرقم. العميل يسجّل بنفسه عبر التطبيق برقم جواله أولاً.
        </div>
      )}

      {!showingSearch && (
        <p className="mb-2 text-[11px] font-semibold text-muted-foreground">
          عملاء محلك ({shopCustomers.length})
        </p>
      )}

      <div className="space-y-2">
        {list.map((c) => (
          <div key={c.id} className="card-elevated p-4 flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-sm font-bold">
              {initials(c.full_name)}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold truncate">{c.full_name}</h4>
              <p className="mt-0.5 text-[11px] text-muted-foreground" dir="ltr">
                {c.phone}
              </p>
            </div>
            <div className="flex gap-1.5">
              <a
                href={`tel:${c.phone}`}
                className="grid size-9 place-items-center rounded-xl bg-secondary text-primary hover:bg-primary hover:text-primary-foreground transition"
                aria-label="اتصال"
              >
                <Phone className="size-4" />
              </a>
              <button
                onClick={() => setSelected(c)}
                className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground"
                aria-label="القياسات"
              >
                <Ruler className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ShopShell>
  );
}

function CustomerDetail({
  customer,
  shopId,
  userId,
  onBack,
}: {
  customer: Customer;
  shopId: string | null;
  userId: string | null;
  onBack: () => void;
}) {
  const { data: measurements = [], isLoading } = useCustomerMeasurementsAtShop(customer.id, shopId);
  const record = useRecordMeasurement(shopId, userId);

  function handleSubmit(values: MeasurementValues, notes: string) {
    record.mutate(
      { customerId: customer.id, values, notes },
      { onSuccess: () => toast.success("تم حفظ القياس") },
    );
  }

  return (
    <ShopShell title="العملاء">
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowRight className="size-4" />
        رجوع للعملاء
      </button>

      <div className="mb-5 flex items-center gap-3">
        <div className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-base font-bold">
          {initials(customer.full_name)}
        </div>
        <div>
          <h1 className="text-xl font-bold">{customer.full_name}</h1>
          <p className="text-xs text-muted-foreground" dir="ltr">
            {customer.phone}
          </p>
        </div>
      </div>

      <MeasurementEntryForm
        customerName={customer.full_name}
        onSubmit={handleSubmit}
        submitting={record.isPending}
      />

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-bold">قياسات محلك السابقة</h2>
        {isLoading ? (
          <div className="grid place-items-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : measurements.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            لا توجد قياسات سابقة لهذا العميل في محلك.
          </p>
        ) : (
          <MeasurementHistoryTable rows={measurements} />
        )}
      </div>
    </ShopShell>
  );
}
