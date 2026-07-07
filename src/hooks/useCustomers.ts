import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useSession } from "./useSession";
import type { Customer, UUID } from "@/lib/types";

// The signed-in customer's own profile row.
export function useCustomerProfile() {
  const { userId, role } = useSession();
  return useQuery<Customer | null>({
    queryKey: ["customers", "me", userId],
    enabled: !!userId && role === "customer",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, full_name, phone, created_at")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return (data as Customer) ?? null;
    },
  });
}

// Global customer lookup (staff-readable per customers_self_read). Used for measurement
// entry: staff finds an EXISTING customer by name or phone. New customers self-register
// via OTP — there is no staff-side create path (database.md rule 5).
export function useCustomerSearch(query: string) {
  const q = query.trim();
  return useQuery<Customer[]>({
    queryKey: ["customers", "search", q],
    enabled: q.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, full_name, phone, created_at")
        .or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`)
        .limit(20);
      if (error) throw error;
      return (data ?? []) as Customer[];
    },
  });
}

// This shop's customers = distinct people it has recorded measurements for.
export function useShopCustomers(shopId: UUID | null) {
  return useQuery<Customer[]>({
    queryKey: ["customers", "shop", shopId],
    enabled: !!shopId,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("measurements")
        .select("customer_id")
        .eq("shop_id", shopId!);
      if (error) throw error;
      const ids = [...new Set((rows ?? []).map((r) => r.customer_id))];
      if (ids.length === 0) return [];
      const { data, error: cErr } = await supabase
        .from("customers")
        .select("id, full_name, phone, created_at")
        .in("id", ids);
      if (cErr) throw cErr;
      return (data ?? []) as Customer[];
    },
  });
}
