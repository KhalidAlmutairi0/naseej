// TS types mirroring database.md tables 1:1. If these drift from the migration,
// the migration wins and these get fixed.

export type UUID = string;

export interface Customer {
  id: UUID;
  full_name: string;
  phone: string;
  created_at: string;
}

export interface Shop {
  id: UUID;
  name: string;
  location: string | null;
  contact_phone: string | null;
  created_at: string;
}

export type StaffRole = "owner" | "staff";

export interface Staff {
  id: UUID;
  shop_id: UUID;
  full_name: string;
  role: StaffRole;
  created_at: string;
}

export interface Fabric {
  id: UUID;
  shop_id: UUID;
  sku: string;
  description: string | null;
  price: number | null;
  season_tags: string[];
  // embedding is server-side only (vector(1536)); never selected into the client.
  image_url: string | null;
  created_at: string;
}

export interface Measurement {
  id: UUID;
  customer_id: UUID;
  shop_id: UUID;
  recorded_by: UUID;
  chest: number | null;
  waist: number | null;
  hip: number | null;
  shoulder: number | null;
  sleeve_length: number | null;
  inseam: number | null;
  neck: number | null;
  thobe_length: number | null;
  notes: string | null;
  created_at: string;
}

export interface ContactRequest {
  id: UUID;
  customer_id: UUID;
  fabric_id: UUID;
  shop_id: UUID;
  created_at: string;
}

export interface Rating {
  id: UUID;
  customer_id: UUID;
  fabric_id: UUID;
  stars: number;
  review_text: string | null;
  created_at: string;
}

// ---- Edge function payloads (api-contracts.md) ----

export interface ApiError {
  error: { code: string; message: string };
}

export interface SendOtpRequest {
  phone: string;
}
export interface SendOtpResponse {
  success: true;
  dev_code: string;
  expires_in: number;
}

export interface VerifyOtpRequest {
  phone: string;
  code: string;
  full_name?: string;
}
export interface VerifyOtpResponse {
  session: { access_token: string; refresh_token: string };
  customer_id: UUID;
  is_new: boolean;
}

export interface EmbedFabricRequest {
  fabric_id: UUID;
}
export type EmbedFabricResponse = { success: true } | { success: false; reason: "no_description" };

export interface SemanticSearchRequest {
  query: string;
  limit?: number;
}
export interface SemanticSearchHit {
  fabric_id: UUID;
  shop_id: UUID;
  similarity: number;
}
export interface SemanticSearchResponse {
  results: SemanticSearchHit[];
}
