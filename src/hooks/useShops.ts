import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import type { Shop, UUID } from "@/lib/types";

const SHOP_COLS = "id, name, location, contact_phone, created_at";

export function useShop(id: UUID | undefined | null) {
  return useQuery<Shop | null>({
    queryKey: ["shops", "one", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shops")
        .select(SHOP_COLS)
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return (data as Shop) ?? null;
    },
  });
}

export function useShops() {
  return useQuery<Shop[]>({
    queryKey: ["shops", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("shops").select(SHOP_COLS).order("name");
      if (error) throw error;
      return (data ?? []) as Shop[];
    },
  });
}
