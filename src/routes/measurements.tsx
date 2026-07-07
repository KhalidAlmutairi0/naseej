import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { RequireRole } from "@/components/require-role";
import { MeasurementHistoryTable } from "@/components/measurements/MeasurementHistoryTable";
import { useCustomerHistory } from "@/hooks/useMeasurements";
import { MEASUREMENT_FIELDS, MEASUREMENT_FIELD_LABELS } from "@/lib/constants";

export const Route = createFileRoute("/measurements")({
  component: () => (
    <RequireRole role="customer">
      <MeasurementsPage />
    </RequireRole>
  ),
  head: () => ({
    meta: [
      { title: "سجل القياسات — نَسيج" },
      { name: "description", content: "احفظ قياساتك رقمياً واحصل عليها من أي مكان." },
    ],
  }),
});

function MeasurementsPage() {
  const { data: rows = [], isLoading } = useCustomerHistory();
  const latest = rows[0];

  return (
    <AppShell title="القياسات">
      <div className="mb-5">
        <h2 className="text-2xl font-bold tracking-tight">سجل قياساتك</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          محفوظة رقمياً عبر كل الخياطين · جاهزة في أي وقت
        </p>
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          لا توجد قياسات محفوظة بعد. سيضيفها الخياط عند زيارتك.
        </div>
      ) : (
        <>
          {/* Latest snapshot */}
          {latest && (
            <div className="card-elevated overflow-hidden bg-primary text-primary-foreground p-5 relative">
              <div className="absolute -right-10 -top-10 size-40 rounded-full bg-accent/15 blur-3xl" />
              <div className="relative flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-accent">
                    أحدث قياس
                  </p>
                  <h3 className="mt-1 font-bold">{latest.shop?.name ?? "خياط"}</h3>
                  <p className="text-[11px] text-primary-foreground/70">
                    {new Date(latest.created_at).toLocaleDateString("ar-SA")}
                  </p>
                </div>
              </div>
              <div className="relative mt-5 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {MEASUREMENT_FIELDS.filter((f) => latest[f] != null).map((f) => (
                  <div key={f} className="rounded-2xl bg-primary-foreground/10 p-3 text-center">
                    <p className="text-[10px] text-primary-foreground/60">
                      {MEASUREMENT_FIELD_LABELS[f]}
                    </p>
                    <p className="mt-1 text-lg font-bold tabular-nums">{latest[f]}</p>
                    <p className="text-[9px] text-primary-foreground/40">سم</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full cross-shop history */}
          <section className="mt-8">
            <h3 className="text-sm font-bold mb-3">السجل الكامل ({rows.length})</h3>
            <MeasurementHistoryTable
              rows={rows}
              shopNameOf={(r) => (r as typeof latest).shop?.name ?? "—"}
            />
          </section>
        </>
      )}
    </AppShell>
  );
}
