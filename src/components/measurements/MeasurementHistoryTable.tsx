import { MEASUREMENT_FIELDS, MEASUREMENT_FIELD_LABELS } from "@/lib/constants";
import type { Measurement } from "@/lib/types";

// Dense, sticky-header table of measurement rows. Tabular figures. Read-only.
export function MeasurementHistoryTable({
  rows,
  shopNameOf,
}: {
  rows: Measurement[];
  shopNameOf?: (row: Measurement) => string;
}) {
  return (
    <div className="card-elevated overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-secondary/80 backdrop-blur text-xs">
          <tr>
            <th className="p-3 text-right font-semibold whitespace-nowrap">التاريخ</th>
            {shopNameOf && (
              <th className="p-3 text-right font-semibold whitespace-nowrap">المحل</th>
            )}
            {MEASUREMENT_FIELDS.map((f) => (
              <th key={f} className="p-3 text-center font-semibold whitespace-nowrap">
                {MEASUREMENT_FIELD_LABELS[f]}
              </th>
            ))}
            <th className="p-3 text-right font-semibold">ملاحظات</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-border/50">
              <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                {new Date(r.created_at).toLocaleDateString("ar-SA")}
              </td>
              {shopNameOf && (
                <td className="p-3 text-xs font-medium whitespace-nowrap">{shopNameOf(r)}</td>
              )}
              {MEASUREMENT_FIELDS.map((f) => (
                <td key={f} className="p-3 text-center tabular-nums">
                  {r[f] != null ? r[f] : "-"}
                </td>
              ))}
              <td className="p-3 text-xs text-muted-foreground max-w-[200px] truncate">
                {r.notes || "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
