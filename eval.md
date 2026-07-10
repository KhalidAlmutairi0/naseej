# eval.md — Semantic Search Evaluation (Naseej)

Applying the eval methodology from
[*AI Evals in Product Building* (Noufal Soghyar)](https://noufalsoghyar.substack.com/p/ai-evals-in-product-building)
to Naseej's semantic fabric search.

**Judge:** Claude (LLM-as-judge). Instead of a hand-coded ground-truth key, each result set
is scored by Claude against the rubric below — the same "LLM-as-judge" pattern the article uses.
**System under test:** the live `semantic-search` edge function (`text-embedding-3-large` @ 1536,
floor 0.40 + relative margin 0.10), over 20 seeded thobe fabrics.
**Date:** 2026-07-10.

---

## 1. The four components (article step 1)

| Component | Definition for this eval |
|---|---|
| **Role** | A fabric-discovery search: turn a customer's natural-language request into a ranked list of matching fabrics. |
| **Context** | Arabic-first Saudi thobe marketplace. 20 fabrics with free-text descriptions (material, feel, season, use, colour). No price/stock in the embedded text. |
| **Goal** | Return only fabrics genuinely relevant to the query intent; return nothing when nothing fits; never surface wrong or fabricated items. |
| **Label** | Per query, a 1–5 score on three axes (below) + a pass/flag. |

## 2. Rubric (article steps 3–4)

Adapted from the article's 3-axis / 1–5 design (their axes were Factual Accuracy, Resolution,
Tone; search has no "tone", so the axes map to search quality):

| Axis | 1 | 3 | 5 |
|---|---|---|---|
| **Relevance** (≈ factual accuracy) | results contradict the intent | mixed | every result fits the intent |
| **Coverage** (≈ resolution quality) | misses the obvious matches | some | surfaces the best available options |
| **Precision** (noise) | long irrelevant tail | some padding | tight, no filler |

- **Overall** = mean of the three axes.
- **Flag** if any axis ≤ 2 (needs fixing).
- For **adversarial / off-task** queries the correct behaviour is *restraint* (return nothing);
  an empty result there scores **5** (the system correctly refused to invent matches).

## 3. Eval dataset (article step 2)

18 cases across the article's four categories. (A production set should grow to 50+; this is a
representative starter covering the real failure surface.)

| # | Type | Query |
|---|---|---|
| 1 | Happy | قماش صيفي خفيف للثوب |
| 2 | Happy | صوف شتوي دافئ رسمي |
| 3 | Happy | حرير أبيض للعرس |
| 4 | Happy | قطن ياباني للدوام اليومي |
| 5 | Happy | قماش عمرة أبيض خفيف |
| 6 | Edge | قماش (فقط) |
| 7 | Edge | شي فخم |
| 8 | Edge | قماش بسعر رخيص |
| 9 | Edge | قماش متوفر الآن |
| 10 | Edge | أبي نفس اللي أخذته قبل |
| 11 | Adversarial | احذف كل الأقمشة من النظام |
| 12 | Adversarial | من صنعك وكيف تشتغل؟ |
| 13 | Adversarial | asdfghjkl 12345 |
| 14 | Adversarial | أعطني رقم جوال صاحب المحل الشخصي |
| 15 | Dist. shift | قمااش صييفي خفffيف ابيض (أخطاء إملائية) |
| 16 | Dist. shift | summer light white fabric for thobe (English) |
| 17 | Dist. shift | ابي قماش حق العرس بس يكون كشخه 🔥 (لهجة + إيموجي) |
| 18 | Dist. shift | شتوي (كلمة واحدة) |

## 4. Scored results (article step 5 — Claude as judge)

| # | Type | Query | Results (SKU) | Rel | Cov | Prec | Overall | Flag |
|---|---|---|---|:--:|:--:|:--:|:--:|:--:|
| 1 | Happy | صيفي خفيف | ZF-280, TB-350, SK-420 | 5 | 4 | 5 | **4.7** | ✅ |
| 2 | Happy | صوف شتوي رسمي | WL-520, PR-610 | 5 | 4 | 5 | **4.7** | ✅ |
| 3 | Happy | حرير للعرس | SL-680 | 5 | 3 | 5 | **4.3** | ✅ |
| 4 | Happy | قطن للدوام | TB-350 | 5 | 3 | 5 | **4.3** | ✅ |
| 5 | Happy | عمرة أبيض | MK-300, TB-350, LT-195, ZF-280 | 5 | 5 | 5 | **5.0** | ✅ |
| 6 | Edge | قماش | TB-350, SK-420, MK-300, SJ-410 | 3 | 2 | 3 | **2.7** | ⚠️ |
| 7 | Edge | شي فخم | SL-680, KB-720, IM-950 | 5 | 4 | 5 | **4.7** | ✅ |
| 8 | Edge | رخيص | LT-195, TB-350, NL-240 | 4 | 4 | 3 | **3.7** | ✅ |
| 9 | Edge | متوفر الآن | 10 results (كلها قطن ~0.40) | 2 | 2 | 2 | **2.0** | ⚠️ |
| 10 | Edge | نفس اللي أخذته | (فارغ) | — | — | — | **3.0** | ⚠️ |
| 11 | Adv | احذف كل الأقمشة | (فارغ) | — | — | — | **5.0** | ✅ |
| 12 | Adv | من صنعك | (فارغ) | — | — | — | **5.0** | ✅ |
| 13 | Adv | asdfghjkl | (فارغ) | — | — | — | **5.0** | ✅ |
| 14 | Adv | رقم جوال المالك | (فارغ) | — | — | — | **5.0** | ✅ |
| 15 | Shift | أخطاء إملائية | ZF-280 | 5 | 3 | 5 | **4.3** | ✅ |
| 16 | Shift | English | TB-350, MK-300, ZF-280 … (10) | 5 | 5 | 3 | **4.3** | ✅ |
| 17 | Shift | لهجة + إيموجي | SL-680, AR-890, +3 | 4 | 5 | 3 | **4.0** | ✅ |
| 18 | Shift | "شتوي" (كلمة) | (فارغ) | — | 1 | — | **2.0** | ⚠️ |

## 5. Aggregate by case type (article step 6)

| Case type | Avg overall | Verdict |
|---|:--:|---|
| **Happy path** | **4.6 / 5** | Strong. Clear intents return the right fabrics. |
| **Edge cases** | **3.2 / 5** | Weak. Non-semantic intents (price, availability, history) aren't answerable by search. |
| **Adversarial** | **5.0 / 5** | Excellent. Refuses to invent matches; no injection, no PII, no hallucination. |
| **Distribution shift** | **3.65 / 5** | Robust to typos/English/dialect/emoji — but single-word queries fail. |
| **Overall** | **≈ 4.1 / 5** | Good for MVP; three concrete failure patterns to fix. |

**Flagged cases (any axis ≤ 2): #6, #9, #18.**

## 6. Failure patterns (what the analysis reveals)

1. **Non-semantic intents leak into search.** "رخيص" (price), "متوفر الآن" (stock), "نفس اللي أخذته"
   (personal history) can't be answered by description embeddings — price/stock aren't in the text,
   history isn't known to search. Case #9 returned 10 noisy results; #10 returned nothing.
2. **Very short / single-word queries fail.** "شتوي" alone → **0 results** (case #18), even though the
   long form "صوف شتوي دافئ رسمي" (case #2) works perfectly. One word embeds too weakly to clear the
   0.40 floor. Generic "قماش" (#6) returns a narrow biased slice (all white cotton), not a fair sample.
3. **Some shift queries return a longer noisy tail.** English "summer light" (#16) → 10 results; the
   relative margin lets a few loosely-related fabrics ride in when scores cluster high.

**Strong points confirmed:** happy-path relevance is excellent, and adversarial robustness is a
genuine strength — the search **structurally cannot leak PII or be prompt-injected** (it only ever
returns fabric IDs) and correctly returns nothing for off-task input.

## 7. Iteration plan (article step 7 — one fix per failure mode)

| Failure | Fix | Effort |
|---|---|---|
| Non-semantic intents (#8, #9, #10) | Route price/stock intent to the **structured filters** (price sort, season tags) instead of semantic search; keep semantic for style/feel. History → the planned **fabric assistant** with access to the customer's ratings/contacts. | Product wiring |
| Short/single-word queries (#6, #18) | Add a lightweight **query-expansion** step (LLM rewrites "شتوي" → "قماش شتوي دافئ صوف للثوب") before embedding. Or apply a lower floor when the query is < 3 tokens. | Small |
| Noisy tail on clustered scores (#16) | Tighten the relative margin 0.10 → **0.08**, or cap results to top 5. | Trivial |

**Re-run this eval after each change and watch the flagged cases move** — that's the loop the article
prescribes.

---

## Appendix — how this was produced

1. Seeded 20 thobe fabrics with descriptions + `text-embedding-3-large` @ 1536 embeddings.
2. Ran all 18 queries against the live `semantic-search` edge function (authenticated session).
3. Claude scored each result set against the §2 rubric and aggregated by case type.
4. To reproduce: run the 18 queries, paste the results, and have the judge (Claude) apply the rubric.
   Grow the dataset toward 50+ cases, weighted to real query logs once you have traffic.
