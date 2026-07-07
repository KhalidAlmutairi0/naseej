import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { BrowseFilters } from "@/hooks/useFabrics";
import type { UUID } from "./types";

const browseFiltersSchema = z
  .object({
    shopId: z.string().optional(),
    season: z.string().optional(),
    minPrice: z.number().optional(),
    maxPrice: z.number().optional(),
  })
  .optional();

const idSchema = z.object({ id: z.string().min(1) });

export const browseFabricsFromDb = createServerFn({ method: "GET" })
  .validator((data: unknown) => browseFiltersSchema.parse(data) ?? {})
  .handler(async ({ data }) => {
    const { listBrowseFabrics } = await import("./db-public.server");
    return listBrowseFabrics(data as BrowseFilters);
  });

export const fabricFromDb = createServerFn({ method: "GET" })
  .validator((data: unknown) => idSchema.parse(data))
  .handler(async ({ data }) => {
    const { getFabricById } = await import("./db-public.server");
    return getFabricById(data.id as UUID);
  });

export const shopsFromDb = createServerFn({ method: "GET" }).handler(async () => {
  const { listShops } = await import("./db-public.server");
  return listShops();
});

export const shopFromDb = createServerFn({ method: "GET" })
  .validator((data: unknown) => idSchema.parse(data))
  .handler(async ({ data }) => {
    const { getShopById } = await import("./db-public.server");
    return getShopById(data.id as UUID);
  });

export const fabricRatingsFromDb = createServerFn({ method: "GET" })
  .validator((data: unknown) => idSchema.parse(data))
  .handler(async ({ data }) => {
    const { listFabricRatings } = await import("./db-public.server");
    return listFabricRatings(data.id as UUID);
  });
