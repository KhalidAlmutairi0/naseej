import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { browseFabricsFromDb, fabricFromDb } from "@/lib/public-data";
import { useSession } from "./useSession";
import type { Fabric, UUID } from "@/lib/types";

const FABRIC_COLS = "id, shop_id, sku, description, price, season_tags, image_url, created_at";

export interface FabricInput {
  sku: string;
  description: string;
  price: number | null;
  season_tags: string[];
  image_url: string | null;
}

export interface BrowseFilters {
  shopId?: UUID;
  season?: string;
  minPrice?: number;
  maxPrice?: number;
}

// Fire-and-forget embedding (api-contracts.md §3). Don't block the save; surface retry.
export async function triggerEmbed(fabricId: UUID): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke("embed-fabric", {
      body: { fabric_id: fabricId },
    });
    if (error) throw error;
    if (data && "error" in data)
      throw new Error((data as { error: { message: string } }).error.message);
  } catch {
    toast.error("تعذّر تحديث الفهرس الدلالي للقماش.", {
      action: { label: "إعادة", onClick: () => triggerEmbed(fabricId) },
    });
  }
}

// Browse/filter fabrics (F7). Public read; used by customers and the shop.
export function useBrowseFabrics(filters: BrowseFilters = {}) {
  return useQuery<Fabric[]>({
    queryKey: ["fabrics", "browse", filters],
    queryFn: () => browseFabricsFromDb({ data: filters }),
  });
}

export function useFabric(id: UUID | undefined) {
  return useQuery<Fabric | null>({
    queryKey: ["fabrics", "one", id],
    enabled: !!id,
    queryFn: () => fabricFromDb({ data: { id: id! } }),
  });
}

export interface MemoryFabric extends Fabric {
  rated: boolean;
  contacted: boolean;
}

// F12: the customer's "fabric memory" = fabrics they've rated OR contacted about.
// There is no favorites/bookmark table; this IS the saved view.
export function useFabricMemory() {
  const { userId, role } = useSession();
  return useQuery<MemoryFabric[]>({
    queryKey: ["fabrics", "memory", userId],
    enabled: !!userId && role === "customer",
    queryFn: async () => {
      const [ratings, contacts] = await Promise.all([
        supabase.from("ratings").select("fabric_id").eq("customer_id", userId!),
        supabase.from("contact_requests").select("fabric_id").eq("customer_id", userId!),
      ]);
      if (ratings.error) throw ratings.error;
      if (contacts.error) throw contacts.error;

      const ratedIds = new Set((ratings.data ?? []).map((r) => r.fabric_id));
      const contactedIds = new Set((contacts.data ?? []).map((r) => r.fabric_id));
      const ids = [...new Set([...ratedIds, ...contactedIds])];
      if (ids.length === 0) return [];

      const { data, error } = await supabase.from("fabrics").select(FABRIC_COLS).in("id", ids);
      if (error) throw error;
      return (data ?? []).map((f) => ({
        ...(f as Fabric),
        rated: ratedIds.has((f as Fabric).id),
        contacted: contactedIds.has((f as Fabric).id),
      }));
    },
  });
}

// Staff-scoped list for the current shop (F3).
export function useShopFabrics(shopId: UUID | null) {
  return useQuery<Fabric[]>({
    queryKey: ["fabrics", "shop", shopId],
    enabled: !!shopId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fabrics")
        .select(FABRIC_COLS)
        .eq("shop_id", shopId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Fabric[];
    },
  });
}

// Fabric CRUD for the current shop. RLS enforces shop ownership; shop_id comes from session.
export function useFabricMutations(shopId: UUID | null) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["fabrics"] });

  const create = useMutation({
    mutationFn: async (input: FabricInput) => {
      if (!shopId) throw new Error("no_shop");
      const { data, error } = await supabase
        .from("fabrics")
        .insert({ ...input, shop_id: shopId })
        .select(FABRIC_COLS)
        .single();
      if (error) throw error;
      return data as Fabric;
    },
    onSuccess: (fabric) => {
      invalidate();
      if (fabric.description && fabric.description.trim() !== "") {
        void triggerEmbed(fabric.id);
      }
    },
    onError: (e: unknown) => {
      const msg =
        e instanceof Error && e.message.includes("duplicate")
          ? "SKU مستخدم مسبقاً في محلك."
          : "تعذّر حفظ القماش.";
      toast.error(msg);
    },
  });

  const update = useMutation({
    mutationFn: async ({
      id,
      input,
      descriptionChanged,
    }: {
      id: UUID;
      input: FabricInput;
      descriptionChanged: boolean;
    }) => {
      const { data, error } = await supabase
        .from("fabrics")
        .update(input)
        .eq("id", id)
        .select(FABRIC_COLS)
        .single();
      if (error) throw error;
      return { fabric: data as Fabric, descriptionChanged };
    },
    onSuccess: ({ fabric, descriptionChanged }) => {
      invalidate();
      // Re-embed only when the description actually changed (api-contracts.md §3).
      if (descriptionChanged && fabric.description && fabric.description.trim() !== "") {
        void triggerEmbed(fabric.id);
      }
    },
    onError: () => toast.error("تعذّر تحديث القماش."),
  });

  const remove = useMutation({
    mutationFn: async (id: UUID) => {
      const { error } = await supabase.from("fabrics").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: () => toast.error("تعذّر حذف القماش."),
  });

  return { create, update, remove };
}
