// semantic-search - natural-language fabric search. Auth: customer or staff.
// Contract: api-contracts.md §4. Returns IDs + scores only; the client hydrates rows.
// The embeddings key lives ONLY here and in embed-fabric.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const EMBEDDING_MODEL = "text-embedding-3-large";
const EMBEDDING_DIMENSIONS = 1536; // 3-large truncated to 1536 keeps the vector(1536) schema + hnsw index
const MAX_LIMIT = 50;
// Keep in sync with SIMILARITY_THRESHOLD in src/lib/constants.ts (edge can't import it).
// Absolute floor: anything below this is never relevant.
const SIMILARITY_THRESHOLD = 0.4;
// Relative cutoff: keep only results within this margin of the top score. Arabic embedding
// scores are compressed and the top score varies per query, so a single absolute cutoff
// leaves a long irrelevant tail. Dropping results far below the best one removes that noise.
const RELATIVE_MARGIN = 0.1;

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
  if (!res.ok) throw new Error(`embeddings ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.data[0].embedding as number[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail(405, "method_not_allowed", "Use POST.");

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return fail(401, "unauthorized", "مطلوب تسجيل الدخول.");

  let query: string, limit: number | undefined;
  try {
    ({ query, limit } = await req.json());
  } catch {
    return fail(400, "empty_query", "Malformed request body.");
  }
  if (typeof query !== "string" || query.trim() === "") {
    return fail(400, "empty_query", "أدخل نص البحث.");
  }
  const cappedLimit = Math.min(typeof limit === "number" && limit > 0 ? limit : 20, MAX_LIMIT);

  const url = Deno.env.get("SUPABASE_URL")!;
  // Validate the caller is authenticated (customer or staff).
  const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData } = await userClient.auth.getUser();
  if (!userData.user) return fail(401, "unauthorized", "الجلسة غير صالحة.");

  let vector: number[];
  try {
    vector = await embed(query.trim());
  } catch (e) {
    console.error("semantic-search embedding error", e);
    return fail(502, "embedding_failed", "تعذّر تنفيذ البحث. حاول مرة أخرى.");
  }

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data, error } = await admin.rpc("match_fabrics", {
    query_embedding: vector,
    match_threshold: SIMILARITY_THRESHOLD,
    match_count: cappedLimit,
  });
  if (error) {
    console.error("semantic-search rpc error", error);
    return fail(500, "search_failed", "تعذّر تنفيذ البحث.");
  }

  const ranked = (data ?? []).map((r: { id: string; shop_id: string; similarity: number }) => ({
    fabric_id: r.id,
    shop_id: r.shop_id,
    similarity: r.similarity,
  }));

  // Relative cutoff: drop anything far below the best match, so only the genuinely
  // relevant fabrics are returned instead of a long weakly-similar tail.
  const top = ranked.length > 0 ? ranked[0].similarity : 0;
  const results = ranked.filter(
    (r: { similarity: number }) => r.similarity >= top - RELATIVE_MARGIN,
  );
  return json({ results });
});
