import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { resolveRole, type ResolvedRole } from "@/lib/auth";

const SESSION_KEY = ["session"] as const;

// Current user + role (customer | staff) + shop_id if staff.
// Backed by react-query; re-resolves on any Supabase auth state change.
export function useSession() {
  const queryClient = useQueryClient();

  const query = useQuery<ResolvedRole>({
    queryKey: SESSION_KEY,
    queryFn: resolveRole,
    staleTime: 60_000,
  });

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      queryClient.invalidateQueries({ queryKey: SESSION_KEY });
    });
    return () => sub.subscription.unsubscribe();
  }, [queryClient]);

  return {
    isLoading: query.isLoading,
    userId: query.data?.userId ?? null,
    role: query.data?.role ?? null,
    shopId: query.data?.shopId ?? null,
    staffRole: query.data?.staffRole ?? null,
    isAuthenticated: !!query.data?.userId,
  };
}
