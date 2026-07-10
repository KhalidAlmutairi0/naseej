import { useState } from "react";
import { Loader2 } from "lucide-react";
import { MEASUREMENT_FIELDS, MEASUREMENT_FIELD_LABELS } from "@/lib/constants";
import type { MeasurementValues } from "@/hooks/useMeasurements";

// Staff-only. Exactly the 8 documented fields + optional notes. No additions or renames.
export function MeasurementEntryForm({
  customerName,
  onSubmit,
  submitting,
}: {
  customerName: string;
  onSubmit: (values: MeasurementValues, notes: string) => void;
  submitting: boolean;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");

  function set(field: string, v: string) {
    setValues((prev) => ({ ...prev, [field]: v }));
  }

  function submit() {
    const parsed: MeasurementValues = {};
    for (const f of MEASUREMENT_FIELDS) {
      const raw = values[f];
      parsed[f] = raw != null && raw.trim() !== "" ? Number(raw) : null;
    }
    onSubmit(parsed, notes);
  }

  return (
    <div className="card-elevated p-4">
      <h3 className="text-sm font-bold">قياس جديد لـ {customerName}</h3>
      <p className="mt-0.5 text-[11px] text-muted-foreground">
        كل القياسات بالسنتيمتر · اترك الحقل فارغاً إن لم ينطبق
      </p>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {MEASUREMENT_FIELDS.map((f) => (
          <div key={f}>
            <label className="text-[11px] font-medium text-muted-foreground">
              {MEASUREMENT_FIELD_LABELS[f]}
            </label>
            <input
              value={values[f] ?? ""}
              onChange={(e) => set(f, e.target.value)}
              inputMode="decimal"
              dir="ltr"
              placeholder="-"
              className="mt-1.5 w-full rounded-xl bg-card ring-1 ring-border px-3 py-2 text-sm text-center tabular-nums focus:outline-none focus:ring-primary/40"
            />
          </div>
        ))}
      </div>

      <div className="mt-3">
        <label className="text-[11px] font-medium text-muted-foreground">ملاحظات (اختياري)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="ثوب رسمي، رقبة كلاسيكية…"
          className="mt-1.5 w-full rounded-xl bg-card ring-1 ring-border px-3 py-2 text-sm focus:outline-none focus:ring-primary/40"
        />
      </div>

      <button
        onClick={submit}
        disabled={submitting}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
      >
        {submitting && <Loader2 className="size-4 animate-spin" />}
        حفظ القياس
      </button>
    </div>
  );
}
