import { useState } from "react";
import { Loader2, X } from "lucide-react";
import type { Fabric } from "@/lib/types";
import type { FabricInput } from "@/hooks/useFabrics";

// Staff fabric intake (F3). Fields map 1:1 to the fabrics table: SKU, description,
// price, season_tags, image_url. The description free-text is what powers semantic search;
// the placeholder nudges structure (feel / weight / uses / season) per plan.md §10.
export function FabricForm({
  initial,
  onSubmit,
  onCancel,
  submitting,
}: {
  initial?: Fabric;
  onSubmit: (input: FabricInput, descriptionChanged: boolean) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [sku, setSku] = useState(initial?.sku ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(initial?.price != null ? String(initial.price) : "");
  const [tags, setTags] = useState((initial?.season_tags ?? []).join("، "));
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? "");

  function submit() {
    const input: FabricInput = {
      sku: sku.trim(),
      description: description.trim(),
      price: price.trim() === "" ? null : Number(price),
      season_tags: tags
        .split(/[،,]/)
        .map((t) => t.trim())
        .filter(Boolean),
      image_url: imageUrl.trim() === "" ? null : imageUrl.trim(),
    };
    const descriptionChanged = (initial?.description ?? "") !== input.description;
    onSubmit(input, descriptionChanged);
  }

  const label = "text-[11px] font-medium text-muted-foreground";
  const field =
    "mt-1.5 w-full rounded-2xl bg-card ring-1 ring-border px-3 py-2.5 text-sm focus:outline-none focus:ring-primary/40";

  return (
    <div dir="rtl" className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-3xl bg-background p-5 shadow-xl ring-1 ring-border max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{initial ? "تعديل القماش" : "قماش جديد"}</h2>
          <button
            onClick={onCancel}
            aria-label="إغلاق"
            className="grid size-8 place-items-center rounded-xl hover:bg-secondary"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className={label}>SKU (رمز القماش في محلك)</label>
            <input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="TB-350-WHT"
              dir="ltr"
              className={field}
            />
          </div>
          <div>
            <label className={label}>الوصف (الملمس، الوزن، الاستخدام، الموسم)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="قطن ياباني خفيف، بارد ومتنفّس، مناسب لأجواء الصيف والدوام اليومي…"
              className={field}
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              الوصف يشغّل البحث الدلالي. الأقمشة بدون وصف تظهر في التصفح لكن لا تظهر في نتائج البحث
              الذكي.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>السعر (ر.س)</label>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                inputMode="decimal"
                dir="ltr"
                placeholder="350"
                className={field}
              />
            </div>
            <div>
              <label className={label}>وسوم الموسم (افصل بفاصلة)</label>
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="صيفي، رسمي"
                className={field}
              />
            </div>
          </div>
          <div>
            <label className={label}>رابط الصورة (اختياري)</label>
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              dir="ltr"
              placeholder="https://…"
              className={field}
            />
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={submit}
            disabled={submitting || sku.trim() === ""}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {initial ? "حفظ التعديلات" : "إضافة القماش"}
          </button>
          <button
            onClick={onCancel}
            className="rounded-2xl border border-border px-4 py-3 text-sm font-medium"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
