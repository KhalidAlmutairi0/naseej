import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Search, LayoutGrid, List, Pencil, Trash2, Loader2 } from "lucide-react";
import { ShopShell } from "@/components/shop-shell";
import { FabricForm } from "@/components/fabric/FabricForm";
import { FabricImage } from "@/components/fabric-image";
import { useSession } from "@/hooks/useSession";
import { useShopFabrics, useFabricMutations, type FabricInput } from "@/hooks/useFabrics";
import type { Fabric } from "@/lib/types";

export const Route = createFileRoute("/shop/inventory")({
  component: Inventory,
  head: () => ({
    meta: [
      { title: "الأقمشة - لوحة الخياط" },
      { name: "description", content: "أدر مخزون الأقمشة." },
    ],
  }),
});

function Inventory() {
  const { shopId } = useSession();
  const [view, setView] = useState<"grid" | "table">("grid");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Fabric | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: fabrics = [], isLoading } = useShopFabrics(shopId);
  const { create, update, remove } = useFabricMutations(shopId);

  const list = fabrics.filter((f) =>
    query
      ? f.sku.toLowerCase().includes(query.toLowerCase()) || (f.description ?? "").includes(query)
      : true,
  );

  function handleSubmit(input: FabricInput, descriptionChanged: boolean) {
    if (editing) {
      update.mutate(
        { id: editing.id, input, descriptionChanged },
        { onSuccess: () => setEditing(null) },
      );
    } else {
      create.mutate(input, { onSuccess: () => setCreating(false) });
    }
  }

  return (
    <ShopShell title="الأقمشة">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">مخزون الأقمشة</h1>
          <p className="mt-1 text-xs text-muted-foreground">{fabrics.length} قماش</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 rounded-2xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-bold shadow-md shadow-primary/20"
        >
          <Plus className="size-4" />
          قماش جديد
        </button>
      </div>

      {/* Toolbar */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-[200px] flex items-center gap-2 rounded-2xl bg-card px-3 py-2 ring-1 ring-border">
          <Search className="size-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث بالـ SKU أو الوصف..."
            className="flex-1 bg-transparent text-sm focus:outline-none"
          />
        </div>
        <div className="flex rounded-2xl bg-card ring-1 ring-border p-1">
          <button
            onClick={() => setView("grid")}
            className={`grid size-9 place-items-center rounded-xl transition ${view === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            <LayoutGrid className="size-4" />
          </button>
          <button
            onClick={() => setView("table")}
            className={`grid size-9 place-items-center rounded-xl transition ${view === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            <List className="size-4" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          لا توجد أقمشة بعد. أضف أول قماش لمحلك.
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {list.map((f) => (
            <div key={f.id} className="card-elevated overflow-hidden">
              <FabricImage src={f.image_url} sku={f.sku} className="aspect-[4/3] w-full" />
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] text-accent font-bold uppercase tracking-wider">
                      {f.sku}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {f.description || "بدون وصف"}
                    </p>
                  </div>
                  <RowActions onEdit={() => setEditing(f)} onDelete={() => remove.mutate(f.id)} />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm font-bold text-primary">
                    {f.price != null ? `${f.price} ر.س` : "-"}
                  </span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {f.season_tags.slice(0, 2).map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card-elevated overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-xs">
              <tr>
                <th className="p-3 text-right font-semibold">SKU</th>
                <th className="p-3 text-right font-semibold hidden sm:table-cell">الوصف</th>
                <th className="p-3 text-right font-semibold">السعر</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {list.map((f) => (
                <tr key={f.id} className="border-t border-border/50">
                  <td className="p-3">
                    <span className="text-xs font-bold text-accent">{f.sku}</span>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground hidden sm:table-cell max-w-xs truncate">
                    {f.description || "-"}
                  </td>
                  <td className="p-3 text-xs font-bold">
                    {f.price != null ? `${f.price} ر.س` : "-"}
                  </td>
                  <td className="p-3 text-left">
                    <RowActions onEdit={() => setEditing(f)} onDelete={() => remove.mutate(f.id)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(creating || editing) && (
        <FabricForm
          initial={editing ?? undefined}
          submitting={create.isPending || update.isPending}
          onSubmit={handleSubmit}
          onCancel={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </ShopShell>
  );
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={onEdit}
        aria-label="تعديل"
        className="grid size-8 place-items-center rounded-xl text-muted-foreground hover:bg-secondary"
      >
        <Pencil className="size-3.5" />
      </button>
      <button
        onClick={onDelete}
        aria-label="حذف"
        className="grid size-8 place-items-center rounded-xl text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}
