// verify-otp — exchange a code for a session. Pre-auth.
// Contract: api-contracts.md §2. Implicit registration: first successful verify for an
// unknown phone creates auth.users + customers (service role — no client insert policy).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
function fail(status: number, code: string, message: string) {
  return json({ error: { code, message } }, status);
}

// Deterministic alias email so a phone maps to one auth.users row.
// The real identity is the phone stored in customers; this email is an internal handle.
function aliasEmail(phone: string) {
  return `p${phone.replace(/\D/g, "")}@phone.naseej.local`;
}

function randomPassword() {
  return crypto.randomUUID() + crypto.randomUUID();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail(405, "method_not_allowed", "Use POST.");

  let phone: string, code: string, full_name: string | undefined;
  try {
    ({ phone, code, full_name } = await req.json());
  } catch {
    return fail(400, "invalid_code", "Malformed request body.");
  }
  if (typeof phone !== "string" || typeof code !== "string") {
    return fail(401, "invalid_code", "الرمز غير صحيح.");
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Validate the code: latest unconsumed, unexpired row for this phone.
  const { data: otp, error: otpErr } = await admin
    .from("otp_codes")
    .select("id, code, expires_at, consumed")
    .eq("phone", phone)
    .eq("consumed", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (otpErr) {
    console.error("verify-otp lookup error", otpErr);
    return fail(500, "internal_error", "تعذر التحقق. حاول مرة أخرى.");
  }
  if (!otp || otp.code !== code || new Date(otp.expires_at).getTime() < Date.now()) {
    return fail(401, "invalid_code", "الرمز غير صحيح أو منتهي الصلاحية.");
  }

  // Single use: consume immediately.
  await admin.from("otp_codes").update({ consumed: true }).eq("id", otp.id);

  // Existing customer?
  const { data: existing, error: custErr } = await admin
    .from("customers")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();
  if (custErr) {
    console.error("verify-otp customer lookup error", custErr);
    return fail(500, "internal_error", "تعذر التحقق. حاول مرة أخرى.");
  }

  const isNew = !existing;
  if (isNew && (typeof full_name !== "string" || full_name.trim() === "")) {
    return fail(400, "name_required", "الاسم مطلوب لإنشاء حساب جديد.");
  }

  const email = aliasEmail(phone);
  const password = randomPassword();
  let userId: string;

  if (isNew) {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      phone,
      phone_confirm: true,
      user_metadata: { full_name, phone },
    });
    if (createErr || !created.user) {
      console.error("verify-otp createUser error", createErr);
      return fail(500, "internal_error", "تعذر إنشاء الحساب.");
    }
    userId = created.user.id;

    const { error: insErr } = await admin.from("customers").insert({
      id: userId,
      full_name: full_name!.trim(),
      phone,
    });
    if (insErr) {
      console.error("verify-otp customers insert error", insErr);
      return fail(500, "internal_error", "تعذر إنشاء الحساب.");
    }
  } else {
    userId = existing!.id;
    // Rotate the password so we can mint a fresh session below without storing secrets.
    const { error: updErr } = await admin.auth.admin.updateUserById(userId, {
      password,
    });
    if (updErr) {
      console.error("verify-otp updateUser error", updErr);
      return fail(500, "internal_error", "تعذر تسجيل الدخول.");
    }
  }

  // Mint a session with the anon client (service role can't issue user JWTs directly).
  const anon = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data: signIn, error: signErr } = await anon.auth.signInWithPassword({
    email,
    password,
  });
  if (signErr || !signIn.session) {
    console.error("verify-otp signIn error", signErr);
    return fail(500, "internal_error", "تعذر تسجيل الدخول.");
  }

  return json({
    session: {
      access_token: signIn.session.access_token,
      refresh_token: signIn.session.refresh_token,
    },
    customer_id: userId,
    is_new: isNew,
  });
});
