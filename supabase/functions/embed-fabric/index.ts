// embed-fabric - generate/store a fabric description embedding. Auth: staff.
// Contract: api-contracts.md §3. The embeddings API key lives ONLY here and in
// semantic-search. Model: OpenAI text-embedding-3-small → vector(1536).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const EMBEDDING_MODEL = "text-embedding-3-large";
const EMBEDDING_DIMENSIONS = 1536; // 3-large truncated to 1536 keeps the vector(1536) schema + hnsw index

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
function fail(status: number, code: string, message: string) {
  return json({ error: { code, message } }, status);
}

async function embed(text: string): Promise<number[]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: text, dimensions: EMBEDDING_DIMENSIONS }),
  });
  if (!res.ok) {
    throw new Error(`embeddings ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.data[0].embedding as number[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail(405, "method_not_allowed", "Use POST.");

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return fail(401, "unauthorized", "مطلوب تسجيل الدخول.");

  let fabric_id: string;
  try {
    ({ fabric_id } = await req.json());
  } catch {
    return fail(400, "bad_request", "Malformed request body.");
  }
  if (typeof fabric_id !== "string") {
    return fail(400, "bad_request", "fabric_id required.");
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  // Identify the caller from their JWT.
  const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData } = await userClient.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return fail(401, "unauthorized", "الجلسة غير صالحة.");

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: staffRow } = await admin
    .from("staff")
    .select("shop_id")
    .eq("id", uid)
    .maybeSingle();
  if (!staffRow) return fail(403, "not_your_shop", "غير مصرح.");

  const { data: fabric, error: fabErr } = await admin
    .from("fabrics")
    .select("shop_id, description")
    .eq("id", fabric_id)
    .maybeSingle();
  if (fabErr || !fabric) return fail(403, "not_your_shop", "القماش غير موجود.");
  if (fabric.shop_id !== staffRow.shop_id) {
    return fail(403, "not_your_shop", "هذا القماش لا يخص محلك.");
  }

  const description = (fabric.description ?? "").trim();
  if (description === "") {
    // Clean no-op - expected, not an error.
    return json({ success: false, reason: "no_description" });
  }

  let vector: number[];
  try {
    vector = await embed(description);
  } catch (e) {
    console.error("embed-fabric embedding error", e);
    return fail(502, "embedding_failed", "تعذّر توليد الفهرس الدلالي. حاول مرة أخرى.");
  }

  // pgvector accepts the bracketed literal form.
  const { error: updErr } = await admin
    .from("fabrics")
    .update({ embedding: `[${vector.join(",")}]` })
    .eq("id", fabric_id);
  if (updErr) {
    console.error("embed-fabric update error", updErr);
    return fail(502, "embedding_failed", "تعذّر حفظ الفهرس الدلالي.");
  }

  return json({ success: true });
});
