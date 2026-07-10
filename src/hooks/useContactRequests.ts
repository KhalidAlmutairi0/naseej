import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useSession } from "./useSession";
import { CONTACT_DEDUP_WINDOW_HOURS } from "@/lib/constants";
import type { UUID } from "@/lib/types";

export interface InboxItem {
  id: UUID;
  created_at: string;
  customer: { full_name: string; phone: string } | null;
  fabric: { sku: string; description: string | null } | null;
}

// F9: Contact Shop. Dedup is application-layer - there is deliberately no DB unique
// constraint (repeat interest over time is legitimate; only a 24h burst collapses).
export function useContactShop() {
  const { userId } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ fabricId, shopId }: { fabricId: UUID; shopId: UUID }) => {
      if (!userId) throw new Error("no_session");

      const windowStart = new Date(
        Date.now() - CONTACT_DEDUP_WINDOW_HOURS * 3600_000,
      ).toISOString();
      const { data: recent, error: dupErr } = await supabase
        .from("contact_requests")
        .select("id")
        .eq("customer_id", userId)
        .eq("fabric_id", fabricId)
        .eq("shop_id", shopId)
        .gte("created_at", windowStart)
        .limit(1);
      if (dupErr) throw dupErr;
      if (recent && recent.length > 0) {
        return { deduped: true };
      }

      const { error } = await supabase.from("contact_requests").insert({
        customer_id: userId,
        fabric_id: fabricId,
        shop_id: shopId,
      });
      if (error) throw error;
      return { deduped: false };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contact_requests"] }),
  });
}

// F10: shop inbox - requests for THIS shop only (RLS: shop_id = auth_shop_id()).
export function useShopInbox(shopId: UUID | null) {
  return useQuery<InboxItem[]>({
    queryKey: ["contact_requests", "inbox", shopId],
    enabled: !!shopId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_requests")
        .select(
          "id, created_at, customer:customers(full_name, phone), fabric:fabrics(sku, description)",
        )
        .eq("shop_id", shopId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as InboxItem[];
    },
  });
}
