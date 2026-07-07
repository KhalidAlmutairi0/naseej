// send-otp — issue a dev-mode login code. Pre-auth.
// Contract: api-contracts.md §1. Delivery is dev-mode (code returned + logged, no SMS).
// The swap point for a real SMS provider is this file only.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SAUDI_PHONE_REGEX = /^\+9665\d{8}$/;
const CODE_TTL_SECONDS = 300; // 5 minutes
const RATE_WINDOW_MINUTES = 10;
const RATE_MAX = 3;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function fail(status: number, code: string, message: string) {
  return json({ error: { code, message } }, status);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail(405, "method_not_allowed", "Use POST.");

  let phone: string;
  try {
    ({ phone } = await req.json());
  } catch {
    return fail(400, "invalid_phone", "Malformed request body.");
  }

  if (typeof phone !== "string" || !SAUDI_PHONE_REGEX.test(phone)) {
    return fail(400, "invalid_phone", "رقم الجوال غير صحيح. الصيغة: +9665XXXXXXXX");
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Rate limit: max RATE_MAX codes per phone per RATE_WINDOW_MINUTES.
  const windowStart = new Date(Date.now() - RATE_WINDOW_MINUTES * 60_000).toISOString();
  const { count, error: countErr } = await supabase
    .from("otp_codes")
    .select("id", { count: "exact", head: true })
    .eq("phone", phone)
    .gte("created_at", windowStart);

  if (countErr) {
    console.error("send-otp count error", countErr);
    return fail(500, "internal_error", "تعذر إرسال الرمز. حاول مرة أخرى.");
  }
  if ((count ?? 0) >= RATE_MAX) {
    return fail(429, "too_many_requests", "أرسلت رموزاً كثيرة. انتظر قليلاً ثم حاول مجدداً.");
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + CODE_TTL_SECONDS * 1000).toISOString();

  const { error: insertErr } = await supabase.from("otp_codes").insert({
    phone,
    code,
    expires_at: expiresAt,
  });
  if (insertErr) {
    console.error("send-otp insert error", insertErr);
    return fail(500, "internal_error", "تعذر إرسال الرمز. حاول مرة أخرى.");
  }

  // DEV DELIVERY: real SMS would be sent here instead of returning the code.
  console.log(`[send-otp] dev code for ${phone}: ${code}`);

  return json({ success: true, dev_code: code, expires_in: CODE_TTL_SECONDS });
});
