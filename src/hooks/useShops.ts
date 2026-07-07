import { useQuery } from "@tanstack/react-query";
import { shopFromDb, shopsFromDb } from "@/lib/public-data";
import type { Shop, UUID } from "@/lib/types";

export function useShop(id: UUID | undefined | null) {
  return useQuery<Shop | null>({
    queryKey: ["shops", "one", id],
    enabled: !!id,
    queryFn: () => shopFromDb({ data: { id: id! } }),
  });
}

export function useShops() {
  return useQuery<Shop[]>({
    queryKey: ["shops", "all"],
    queryFn: () => shopsFromDb(),
  });
}
