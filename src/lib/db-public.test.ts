import { describe, expect, it } from "vitest";

import { buildBrowseFabricsQuery } from "./db-public.server";

describe("buildBrowseFabricsQuery", () => {
  it("filters public fabric browse results with parameterized SQL", () => {
    const query = buildBrowseFabricsQuery({
      shopId: "shop-1",
      season: "صيفي",
      minPrice: 100,
      maxPrice: 400,
    });

    expect(query.text).toContain("from fabrics");
    expect(query.text).toContain("shop_id = $1");
    expect(query.text).toContain("season_tags @> array[$2]::text[]");
    expect(query.text).toContain("price >= $3");
    expect(query.text).toContain("price <= $4");
    expect(query.text).toContain("order by created_at desc");
    expect(query.values).toEqual(["shop-1", "صيفي", 100, 400]);
  });
});
