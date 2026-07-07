import { supabase } from "./supabaseClient";
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
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new ApiCallError("invalid_credentials", "البريد أو كلمة المرور غير صحيحة.");
}

export interface ShopRegistration {
  shopName: string;
  location: string;
  contactPhone: string;
  ownerName: string;
  email: string;
  password: string;
}

// F2: create the staff auth user, then atomically create shop + owner-staff via RPC.
export async function registerShop(reg: ShopRegistration): Promise<UUID> {
  const { data: signUp, error: signUpErr } = await supabase.auth.signUp({
    email: reg.email,
    password: reg.password,
  });
  if (signUpErr) {
    throw new ApiCallError("signup_failed", signUpErr.message);
  }
  // If email confirmation is off, signUp already returns a session; otherwise force one.
  if (!signUp.session) {
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: reg.email,
      password: reg.password,
    });
    if (signInErr) {
      throw new ApiCallError(
        "confirm_email",
        "تم إنشاء الحساب. فعّل بريدك الإلكتروني ثم سجّل الدخول.",
      );
    }
  }

  const { data, error } = await supabase.rpc("register_shop", {
    p_shop_name: reg.shopName,
    p_location: reg.location,
    p_contact_phone: reg.contactPhone,
    p_owner_name: reg.ownerName,
  });
  if (error) {
    const code = error.message.includes("already_registered")
      ? "already_registered"
      : "register_failed";
    throw new ApiCallError(code, "تعذر إنشاء المحل. حاول مرة أخرى.");
  }
  return data as UUID;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
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
