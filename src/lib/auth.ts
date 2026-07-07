import { createServerFn } from "@tanstack/react-start";
import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import { isSupabaseConfigured, supabase } from "./supabaseClient";
import { SAUDI_PHONE_REGEX } from "./constants";
import type { SendOtpResponse, VerifyOtpResponse, StaffRole, UUID } from "./types";

// Structured error carrying the api-contracts.md envelope { code, message }.
export class ApiCallError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "ApiCallError";
  }
}

// Invoke an edge function and normalize its response/error envelope.
async function callFn<T>(name: string, body: unknown): Promise<T> {
  if (!isSupabaseConfigured()) {
    throw new ApiCallError("not_migrated", "تسجيل الدخول غير متاح حالياً على نسخة CranL.");
  }

  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let code = "function_error";
    let message = "حدث خطأ. حاول مرة أخرى.";
    // FunctionsHttpError exposes the raw Response on `context`; our envelope lives there.
    const ctx = (error as { context?: { json?: () => Promise<unknown> } }).context;
    if (ctx?.json) {
      try {
        const parsed = (await ctx.json()) as { error?: { code: string; message: string } };
        if (parsed?.error) {
          code = parsed.error.code;
          message = parsed.error.message;
        }
      } catch {
        /* non-JSON body — keep defaults */
      }
    }
    throw new ApiCallError(code, message);
  }
  if (data && typeof data === "object" && "error" in data) {
    const e = (data as { error: { code: string; message: string } }).error;
    throw new ApiCallError(e.code, e.message);
  }
  return data as T;
}

// Convert local Saudi input ("05X…", "5X…", "9665X…") to canonical +9665XXXXXXXX.
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  let out: string;
  if (digits.startsWith("966")) out = `+${digits}`;
  else if (digits.startsWith("0")) out = `+966${digits.slice(1)}`;
  else out = `+966${digits}`;
  return out;
}

export function isValidSaudiPhone(phone: string): boolean {
  return SAUDI_PHONE_REGEX.test(phone);
}

// ---- Customer OTP flow ----

export function sendOtp(phone: string): Promise<SendOtpResponse> {
  return callFn<SendOtpResponse>("send-otp", { phone });
}

export async function verifyOtp(
  phone: string,
  code: string,
  fullName?: string,
): Promise<VerifyOtpResponse> {
  const res = await callFn<VerifyOtpResponse>("verify-otp", {
    phone,
    code,
    full_name: fullName,
  });
  // Persist the minted session so the SDK attaches the JWT to subsequent RLS calls.
  await supabase.auth.setSession({
    access_token: res.session.access_token,
    refresh_token: res.session.refresh_token,
  });
  return res;
}

// ---- Staff email/password flow ----

export async function staffLogin(email: string, password: string): Promise<void> {
  try {
    await staffLoginOnCranl({ data: { email, password } });
  } catch {
    throw new ApiCallError("invalid_credentials", "البريد أو كلمة المرور غير صحيحة.");
  }
}

export interface ShopRegistration {
  shopName: string;
  location: string;
  contactPhone: string;
  ownerName: string;
  email: string;
  password: string;
}

const staffLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const shopRegistrationSchema = z.object({
  shopName: z.string().min(1),
  location: z.string(),
  contactPhone: z.string(),
  ownerName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
});

const staffLoginOnCranl = createServerFn({ method: "POST" })
  .validator((data: unknown) => staffLoginSchema.parse(data))
  .handler(async ({ data }) => {
    const { loginStaffWithPassword, issueSessionCookie } = await import("./auth-db.server");
    const role = await loginStaffWithPassword(data.email, data.password);
    const cookie = issueSessionCookie(role);
    setCookie(cookie.name, cookie.value, cookie.options);
    return role;
  });

const registerShopOnCranl = createServerFn({ method: "POST" })
  .validator((data: unknown) => shopRegistrationSchema.parse(data))
  .handler(async ({ data }) => {
    const { registerShopWithPassword, issueSessionCookie } = await import("./auth-db.server");
    const role = await registerShopWithPassword(data);
    const cookie = issueSessionCookie(role);
    setCookie(cookie.name, cookie.value, cookie.options);
    return role.shopId;
  });

const signOutFromCranl = createServerFn({ method: "POST" }).handler(async () => {
  const { clearSessionCookieOptions } = await import("./auth-db.server");
  const cookie = clearSessionCookieOptions();
  deleteCookie(cookie.name, cookie.options);
  return { success: true };
});

const resolveRoleFromCranl = createServerFn({ method: "GET" }).handler(async () => {
  const { clearSessionCookieOptions, resolveCookieSession } = await import("./auth-db.server");
  const cookie = clearSessionCookieOptions();
  return resolveCookieSession(getCookie(cookie.name));
});

// F2: create shop + first owner staff row in one CranL PostgreSQL transaction.
export async function registerShop(reg: ShopRegistration): Promise<UUID> {
  try {
    return await registerShopOnCranl({ data: reg });
  } catch (error) {
    if (error instanceof Error && error.message === "email_already_registered") {
      throw new ApiCallError("already_registered", "البريد الإلكتروني مسجل مسبقاً.");
    }
    throw new ApiCallError("register_failed", "تعذر إنشاء المحل. حاول مرة أخرى.");
  }
}

export async function signOut(): Promise<void> {
  await signOutFromCranl();

  if (isSupabaseConfigured()) {
    await supabase.auth.signOut();
  }
}

// ---- Role detection ----
// architecture.md: presence of a staff row = staff session; otherwise customer.

export interface ResolvedRole {
  userId: UUID | null;
  role: "customer" | "staff" | null;
  shopId: UUID | null;
  staffRole: StaffRole | null;
}

export async function resolveRole(): Promise<ResolvedRole> {
  const cranlRole = await resolveRoleFromCranl();
  if (cranlRole.userId) return cranlRole;

  if (!isSupabaseConfigured()) {
    return { userId: null, role: null, shopId: null, staffRole: null };
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id ?? null;
  if (!userId) return { userId: null, role: null, shopId: null, staffRole: null };

  const { data: staffRow } = await supabase
    .from("staff")
    .select("shop_id, role")
    .eq("id", userId)
    .maybeSingle();

  if (staffRow) {
    return {
      userId,
      role: "staff",
      shopId: staffRow.shop_id,
      staffRole: staffRow.role as StaffRole,
    };
  }
  return { userId, role: "customer", shopId: null, staffRole: null };
}
