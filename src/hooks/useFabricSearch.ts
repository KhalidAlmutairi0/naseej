import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { SEMANTIC_SEARCH_MAX_LIMIT } from "@/lib/constants";
import type { Fabric, SemanticSearchResponse } from "@/lib/types";

const FABRIC_COLS = "id, shop_id, sku, description, price, season_tags, image_url, created_at";

export interface SearchHit extends Fabric {
  similarity: number;
}

// F6: semantic search. Calls the edge function for ranked IDs + scores, then hydrates
// full fabric rows via the normal SDK read (public RLS). The edge fn returns IDs only.
export function useFabricSearch() {
  return useMutation<SearchHit[], Error, string>({
    mutationFn: async (query: string) => {
      const q = query.trim();
      if (q === "") return [];

      const { data, error } = await supabase.functions.invoke("semantic-search", {
        body: { query: q, limit: SEMANTIC_SEARCH_MAX_LIMIT },
      });
      if (error) throw error;
      const results = (data as SemanticSearchResponse).results ?? [];
      if (results.length === 0) return [];

      const ids = results.map((r) => r.fabric_id);
      const { data: fabrics, error: fErr } = await supabase
        .from("fabrics")
        .select(FABRIC_COLS)
        .in("id", ids);
      if (fErr) throw fErr;

      // Preserve the similarity ranking from the edge function.
      const byId = new Map((fabrics ?? []).map((f) => [f.id, f as Fabric]));
      return results
        .map((r) => {
          const f = byId.get(r.fabric_id);
          return f ? { ...f, similarity: r.similarity } : null;
        })
        .filter((x): x is SearchHit => x !== null);
    },
  });
}
