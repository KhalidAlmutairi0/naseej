// Single home for cross-cutting constants. No magic numbers scattered in components.

// The exact measurement field set (database.md §measurements, plan.md §8).
// Do not add, remove, or rename. `thobe_length` is nullable (thobe-focused shops).
export const MEASUREMENT_FIELDS = [
  "chest",
  "waist",
  "hip",
  "shoulder",
  "sleeve_length",
  "inseam",
  "neck",
  "thobe_length",
] as const;

export type MeasurementField = (typeof MEASUREMENT_FIELDS)[number];

// Arabic labels for the 8 fields (UI is Arabic-first, RTL). Display only.
export const MEASUREMENT_FIELD_LABELS: Record<MeasurementField, string> = {
  chest: "الصدر",
  waist: "الوسط",
  hip: "الأرداف",
  shoulder: "الكتف",
  sleeve_length: "طول الكم",
  inseam: "طول الساق الداخلي",
  neck: "الرقبة",
  thobe_length: "طول الثوب",
};

// Minimum cosine similarity for semantic-search results. Start at 0.3, tune with real data.
// Below-threshold results are dropped; an empty result set is a valid answer.
export const SIMILARITY_THRESHOLD = 0.3;

// Max results a semantic-search request may return (api-contracts.md caps at 50).
export const SEMANTIC_SEARCH_MAX_LIMIT = 50;

// Contact-request dedup window: same (customer, fabric, shop) collapses within this many hours.
// Enforced at the application layer — there is deliberately no DB unique constraint.
export const CONTACT_DEDUP_WINDOW_HOURS = 24;

// Saudi phone format: +9665 followed by 8 digits.
export const SAUDI_PHONE_REGEX = /^\+9665\d{8}$/;
