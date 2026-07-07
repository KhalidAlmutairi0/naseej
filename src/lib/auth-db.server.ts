import "@tanstack/react-start/server-only";

import { promisify } from "node:util";
import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { Pool, type PoolClient } from "pg";

import type { ResolvedRole, ShopRegistration } from "./auth";
import type { StaffRole, UUID } from "./types";

const scrypt = promisify(scryptCallback);

const PASSWORD_KEY_LENGTH = 64;
const SESSION_COOKIE_NAME = "tafseel-session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

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

function getSessionSecret(secret = process.env.SESSION_SECRET ?? process.env.DATABASE_URL) {
  if (!secret) {
    throw new Error("DATABASE_URL is required to sign CranL sessions.");
  }
  return secret;
}

function base64UrlEncode(value: Buffer | string) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlJson(value: unknown) {
  return base64UrlEncode(JSON.stringify(value));
}

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("base64url");
  const hash = (await scrypt(password, salt, PASSWORD_KEY_LENGTH)) as Buffer;
  return `scrypt$${salt}$${hash.toString("base64url")}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [scheme, salt, expectedHash] = storedHash.split("$");
  if (scheme !== "scrypt" || !salt || !expectedHash) return false;

  const actual = (await scrypt(password, salt, PASSWORD_KEY_LENGTH)) as Buffer;
  const expected = Buffer.from(expectedHash, "base64url");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

interface SessionPayload extends ResolvedRole {
  exp: number;
}

export function createSessionToken(
  role: ResolvedRole,
  secret = getSessionSecret(),
  now = Math.floor(Date.now() / 1000),
) {
  const payload = base64UrlJson({ ...role, exp: now + SESSION_TTL_SECONDS });
  return `${payload}.${sign(payload, secret)}`;
}

export function verifySessionToken(
  token: string | undefined,
  secret?: string,
  now = Math.floor(Date.now() / 1000),
): ResolvedRole | null {
  if (!token) return null;
  const signingSecret = secret ?? getSessionSecret();
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload, signingSecret);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionPayload;
    if (parsed.exp < now) return null;
    return {
      userId: parsed.userId,
      role: parsed.role,
      shopId: parsed.shopId,
      staffRole: parsed.staffRole,
    };
  } catch {
    return null;
  }
}

async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function registerShopWithPassword(reg: ShopRegistration): Promise<ResolvedRole> {
  return withTransaction(async (client) => {
    const existing = await client.query("select id from staff where lower(email) = lower($1)", [
      reg.email,
    ]);
    if (existing.rowCount) {
      throw new Error("email_already_registered");
    }

    const shop = await client.query<{ id: UUID }>(
      "insert into shops (name, location, contact_phone) values ($1, $2, $3) returning id",
      [reg.shopName, reg.location || null, reg.contactPhone || null],
    );
    const passwordHash = await hashPassword(reg.password);
    const staff = await client.query<{ id: UUID; role: StaffRole }>(
      `
        insert into staff (shop_id, full_name, email, password_hash, role)
        values ($1, $2, lower($3), $4, 'owner')
        returning id, role
      `,
      [shop.rows[0].id, reg.ownerName, reg.email, passwordHash],
    );

    return {
      userId: staff.rows[0].id,
      role: "staff",
      shopId: shop.rows[0].id,
      staffRole: staff.rows[0].role,
    };
  });
}

export async function loginStaffWithPassword(
  email: string,
  password: string,
): Promise<ResolvedRole> {
  const result = await getPool().query<{
    id: UUID;
    shop_id: UUID;
    role: StaffRole;
    password_hash: string;
  }>("select id, shop_id, role, password_hash from staff where lower(email) = lower($1)", [email]);
  const staff = result.rows[0];

  if (!staff || !(await verifyPassword(password, staff.password_hash))) {
    throw new Error("invalid_credentials");
  }

  return {
    userId: staff.id,
    role: "staff",
    shopId: staff.shop_id,
    staffRole: staff.role,
  };
}

export function issueSessionCookie(role: ResolvedRole) {
  return {
    name: SESSION_COOKIE_NAME,
    value: createSessionToken(role),
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    },
  };
}

export function clearSessionCookieOptions() {
  return {
    name: SESSION_COOKIE_NAME,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 0,
    },
  };
}

export function resolveCookieSession(token: string | undefined): ResolvedRole {
  return (
    verifySessionToken(token) ?? {
      userId: null,
      role: null,
      shopId: null,
      staffRole: null,
    }
  );
}
