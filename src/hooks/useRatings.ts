import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fabricRatingsFromDb } from "@/lib/public-data";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { useSession } from "./useSession";
import type { Rating, UUID } from "@/lib/types";

export interface RatingAggregate {
  average: number;
  count: number;
}

// Public read. Ratings + derived aggregate for one fabric (F8).
export function useFabricRatings(fabricId: UUID | undefined) {
  return useQuery<{ ratings: Rating[]; aggregate: RatingAggregate }>({
    queryKey: ["ratings", "fabric", fabricId],
    enabled: !!fabricId,
    queryFn: async () => {
      let ratings: Rating[];
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from("ratings")
          .select("id, customer_id, fabric_id, stars, review_text, created_at")
          .eq("fabric_id", fabricId!)
          .order("created_at", { ascending: false });
        if (error) throw error;
        ratings = (data ?? []) as Rating[];
      } else {
        ratings = await fabricRatingsFromDb({ data: { id: fabricId! } });
      }
      const count = ratings.length;
      const average = count === 0 ? 0 : ratings.reduce((s, r) => s + r.stars, 0) / count;
      return { ratings, aggregate: { average, count } };
    },
  });
}

// The signed-in customer's own rating for a fabric (to prefill the editable form).
export function useMyRating(fabricId: UUID | undefined) {
  const { userId, role } = useSession();
  return useQuery<Rating | null>({
    queryKey: ["ratings", "mine", fabricId, userId],
    enabled: !!fabricId && !!userId && role === "customer",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ratings")
        .select("id, customer_id, fabric_id, stars, review_text, created_at")
        .eq("fabric_id", fabricId!)
        .eq("customer_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return (data as Rating) ?? null;
    },
  });
}

// One rating per (customer, fabric); editable → upsert (F8).
export function useUpsertRating(fabricId: UUID) {
  const qc = useQueryClient();
  const { userId } = useSession();
  return useMutation({
    mutationFn: async ({ stars, reviewText }: { stars: number; reviewText: string }) => {
      if (!userId) throw new Error("no_session");
      const { error } = await supabase.from("ratings").upsert(
        {
          customer_id: userId,
          fabric_id: fabricId,
          stars,
          review_text: reviewText.trim() === "" ? null : reviewText.trim(),
        },
        { onConflict: "customer_id,fabric_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ratings", "fabric", fabricId] });
      qc.invalidateQueries({ queryKey: ["ratings", "mine", fabricId] });
    },
  });
}
