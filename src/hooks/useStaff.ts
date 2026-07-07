import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import type { Staff, UUID } from "@/lib/types";

// F11: staff of the current shop. RLS staff_same_shop_read scopes this to the caller's shop.
export function useStaffList(shopId: UUID | null) {
  return useQuery<Staff[]>({
    queryKey: ["staff", "list", shopId],
    enabled: !!shopId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff")
        .select("id, shop_id, full_name, role, created_at")
        .eq("shop_id", shopId!)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as Staff[];
    },
  });
}

// Owner-only removal (RLS staff_owner_write). Adding staff is NOT implemented here — it
// requires creating an auth user for the employee (service role), which no documented
// endpoint provides. See the phase-9 flag.
export function useRemoveStaff(shopId: UUID | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (staffId: UUID) => {
      const { error } = await supabase.from("staff").delete().eq("id", staffId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff", "list", shopId] }),
  });
}
