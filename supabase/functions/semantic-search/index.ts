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

// Hybrid re-rank. Pure vector similarity confuses antonyms: a "ثقيل" (heavy) query scores
// high on "خفيف" (light) descriptions because both are weight words in the same context.
// After the vector step we add a lexical signal: +1 for each query attribute word that
// literally appears in the description, -1 when its ANTONYM appears. This lets exact
// attributes (heavy vs light, winter vs summer) decide the ranking.
const LEXICAL_WEIGHT = 0.2;
const CANDIDATE_THRESHOLD = 0.25; // wider pool to re-rank
const CANDIDATE_COUNT = 40;
const STOPWORDS = new Set([
  "قماش", "ثوب", "ثياب", "ابي", "حق", "بس", "شي", "يكون", "هذا", "الي", "اللي",
  "مع", "من", "في", "على", "عن", "او", "حلو", "ابغى", "خامة",
]);
const ANTONYMS: Record<string, string[]> = {
  "ثقيل": ["خفيف"], "خفيف": ["ثقيل"],
  "دافئ": ["بارد"], "بارد": ["دافئ"],
  "شتوي": ["صيفي"], "صيفي": ["شتوي"],
  "غامق": ["فاتح"], "فاتح": ["غامق"],
  "فاخر": ["اقتصادي", "رخيص"], "رخيص": ["فاخر"], "اقتصادي": ["فاخر"],
  "اسود": ["ابيض"], "ابيض": ["اسود"],
};

// Synonyms: map Arabizi / English words to the Arabic tokens used in descriptions, so
// "بلاك"/"black" match "أسود", "كوتن"/"cotton" match "قطن", etc. Values are normalized
// (matches normalizeAr output). "شتوي" also maps to "شتاء" since descriptions say "الشتاء".
const SYNONYMS: Record<string, string[]> = {
  "بلاك": ["اسود"], "black": ["اسود"],
  "وايت": ["ابيض"], "white": ["ابيض"],
  "قراي": ["رمادي"], "جراي": ["رمادي"], "gray": ["رمادي"], "grey": ["رمادي"],
  "براون": ["بني"], "brown": ["بني"],
  "قولد": ["ذهبي"], "gold": ["ذهبي"], "golden": ["ذهبي"],
  "بلو": ["ازرق", "زرق"], "blue": ["ازرق", "زرق"], "navy": ["ازرق"],
  "كوتن": ["قطن"], "cotton": ["قطن"],
  "wool": ["صوف"],
  "سلك": ["حرير"], "silk": ["حرير"],
  "linen": ["كتان"],
  "summer": ["صيفي"], "winter": ["شتاء", "شتوي"], "شتوي": ["شتاء"],
  "light": ["خفيف"], "heavy": ["ثقيل"],
  "formal": ["رسمي"], "luxury": ["فاخر", "فخم"], "luxurious": ["فاخر", "فخم"],
};

function expand(term: string): string[] {
  return [term, ...(SYNONYMS[term] ?? [])];
}
function antonymsOf(term: string): string[] {
  return expand(term).flatMap((p) => ANTONYMS[p] ?? []);
}

function normalizeAr(s: string): string {
  return s
    .replace(/[ً-ْ]/g, "") // tashkeel
    .replace(/ـ/g, "") // tatweel
    .replace(/[أإآ]/g, "ا") // أ إ آ -> ا
    .replace(/ى/g, "ي") // ى -> ي
    .replace(/ة/g, "ه") // ة -> ه
    .toLowerCase();
}
function contentTerms(q: string): string[] {
  return normalizeAr(q)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

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
  // Fetch a wider candidate pool (lower threshold) so the hybrid re-rank has material.
  const { data, error } = await admin.rpc("match_fabrics", {
    query_embedding: vector,
    match_threshold: CANDIDATE_THRESHOLD,
    match_count: CANDIDATE_COUNT,
  });
  if (error) {
    console.error("semantic-search rpc error", error);
    return fail(500, "search_failed", "تعذّر تنفيذ البحث.");
  }

  const candidates = (data ?? []) as { id: string; shop_id: string; similarity: number }[];

  // Descriptions for the candidate pool, to compute the lexical / antonym signal.
  const descById = new Map<string, string>();
  if (candidates.length > 0) {
    const { data: rows } = await admin
      .from("fabrics")
      .select("id, description")
      .in("id", candidates.map((c) => c.id));
    for (const r of (rows ?? []) as { id: string; description: string | null }[]) {
      descById.set(r.id, normalizeAr(r.description ?? ""));
    }
  }

  const terms = contentTerms(query);
  const scored = candidates
    .map((c) => {
      const desc = descById.get(c.id) ?? "";
      let boost = 0;
      for (const t of terms) {
        if (expand(t).some((p) => desc.includes(p))) boost += 1;
        if (antonymsOf(t).some((a) => desc.includes(a))) boost -= 1;
      }
      const lexical = terms.length > 0 ? boost / terms.length : 0;
      return { ...c, final: c.similarity + LEXICAL_WEIGHT * lexical };
    })
    .sort((a, b) => b.final - a.final);

  // Floor + relative cutoff applied on the hybrid score: a fabric whose antonym matches
  // is pushed below the floor and dropped, while an exact attribute match is lifted.
  const kept = scored.filter((c) => c.final >= SIMILARITY_THRESHOLD);
  const top = kept.length > 0 ? kept[0].final : 0;
  const results = kept
    .filter((c) => c.final >= top - RELATIVE_MARGIN)
    .slice(0, cappedLimit)
    .map((c) => ({ fabric_id: c.id, shop_id: c.shop_id, similarity: c.similarity }));
  return json({ results });
});
