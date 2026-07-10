import { useEffect, useState } from "react";
import { Star, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/hooks/useSession";
import { useMyRating, useUpsertRating } from "@/hooks/useRatings";
import type { UUID } from "@/lib/types";

// F8: 1-5 stars + optional text. One rating per customer per fabric, editable (upsert).
export function FabricRating({ fabricId }: { fabricId: UUID }) {
  const { role } = useSession();
  const { data: mine } = useMyRating(fabricId);
  const upsert = useUpsertRating(fabricId);
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState("");

  useEffect(() => {
    if (mine) {
      setStars(mine.stars);
      setText(mine.review_text ?? "");
    }
  }, [mine]);

  if (role !== "customer") return null;

  function submit() {
    if (stars < 1) {
      toast.error("اختر عدد النجوم");
      return;
    }
    upsert.mutate(
      { stars, reviewText: text },
      { onSuccess: () => toast.success(mine ? "تم تحديث تقييمك" : "شكراً لتقييمك") },
    );
  }

  return (
    <div className="card-elevated p-4">
      <h3 className="text-sm font-bold">{mine ? "عدّل تقييمك" : "قيّم هذا القماش"}</h3>
      <div className="mt-3 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => setStars(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            aria-label={`${n} نجوم`}
          >
            <Star
              className={`size-7 transition ${
                n <= (hover || stars) ? "fill-accent text-accent" : "text-muted-foreground"
              }`}
            />
          </button>
        ))}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder="رأيك في القماش (اختياري)…"
        className="mt-3 w-full rounded-xl bg-card ring-1 ring-border px-3 py-2 text-sm focus:outline-none focus:ring-primary/40"
      />
      <button
        onClick={submit}
        disabled={upsert.isPending}
        className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
      >
        {upsert.isPending && <Loader2 className="size-4 animate-spin" />}
        {mine ? "حفظ التعديل" : "إرسال التقييم"}
      </button>
    </div>
  );
}
