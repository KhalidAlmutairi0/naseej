import "@tanstack/react-start/server-only";

import { Pool, type QueryResultRow } from "pg";

import type { BrowseFilters } from "@/hooks/useFabrics";
import type { Fabric, Rating, Shop, UUID } from "./types";

export interface SqlQuery {
  text: string;
  values: Array<string | number>;
}

const FABRIC_COLUMNS = "id, shop_id, sku, description, price, season_tags, image_url, created_at";
const SHOP_COLUMNS = "id, name, location, contact_phone, created_at";
const RATING_COLUMNS = "id, customer_id, fabric_id, stars, review_text, created_at";

let pool: Pool | undefined;

function getPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for CranL PostgreSQL access.");
  }

  pool ??= new Pool({
    connectionString,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });

  return pool;
}

export function buildBrowseFabricsQuery(filters: BrowseFilters = {}): SqlQuery {
  const where: string[] = [];
  const values: SqlQuery["values"] = [];

  const add = (clause: string, value: string | number) => {
    values.push(value);
    where.push(clause.replace("?", `$${values.length}`));
  };

  if (filters.shopId) add("shop_id = ?", filters.shopId);
  if (filters.season) add("season_tags @> array[?]::text[]", filters.season);
  if (filters.minPrice != null) add("price >= ?", filters.minPrice);
  if (filters.maxPrice != null) add("price <= ?", filters.maxPrice);

  return {
    text: `
      select ${FABRIC_COLUMNS}
      from fabrics
      ${where.length ? `where ${where.join(" and ")}` : ""}
      order by created_at desc
    `,
    values,
  };
}

function normalizeFabric(row: QueryResultRow): Fabric {
  return {
    id: row.id,
    shop_id: row.shop_id,
    sku: row.sku,
    description: row.description,
    price: row.price == null ? null : Number(row.price),
    season_tags: row.season_tags ?? [],
    image_url: row.image_url,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

function normalizeShop(row: QueryResultRow): Shop {
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    contact_phone: row.contact_phone,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

function normalizeRating(row: QueryResultRow): Rating {
  return {
    id: row.id,
    customer_id: row.customer_id,
    fabric_id: row.fabric_id,
    stars: Number(row.stars),
    review_text: row.review_text,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

export async function listBrowseFabrics(filters: BrowseFilters = {}): Promise<Fabric[]> {
  const query = buildBrowseFabricsQuery(filters);
  const result = await getPool().query(query.text, query.values);
  return result.rows.map(normalizeFabric);
}

export async function getFabricById(id: UUID): Promise<Fabric | null> {
  const result = await getPool().query(`select ${FABRIC_COLUMNS} from fabrics where id = $1`, [id]);
  return result.rows[0] ? normalizeFabric(result.rows[0]) : null;
}

export async function listShops(): Promise<Shop[]> {
  const result = await getPool().query(`select ${SHOP_COLUMNS} from shops order by name`);
  return result.rows.map(normalizeShop);
}

export async function getShopById(id: UUID): Promise<Shop | null> {
  const result = await getPool().query(`select ${SHOP_COLUMNS} from shops where id = $1`, [id]);
  return result.rows[0] ? normalizeShop(result.rows[0]) : null;
}

export async function listFabricRatings(fabricId: UUID): Promise<Rating[]> {
  const result = await getPool().query(
    `select ${RATING_COLUMNS} from ratings where fabric_id = $1 order by created_at desc`,
    [fabricId],
  );
  return result.rows.map(normalizeRating);
}
