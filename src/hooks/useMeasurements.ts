import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { MEASUREMENT_FIELDS, type MeasurementField } from "@/lib/constants";
import type { Measurement, UUID } from "@/lib/types";

const MEASUREMENT_COLS =
  "id, customer_id, shop_id, recorded_by, chest, waist, hip, shoulder, sleeve_length, inseam, neck, thobe_length, notes, created_at";

export type MeasurementValues = Partial<Record<MeasurementField, number | null>>;

export interface MeasurementWithShop extends Measurement {
  shop: { name: string } | null;
}

// F5: customer's FULL measurement history across ALL shops, newest first.
// RLS (measurements_read: customer_id = auth.uid()) returns cross-shop rows.
export function useCustomerHistory() {
  return useQuery<MeasurementWithShop[]>({
    queryKey: ["measurements", "history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("measurements")
        .select(`${MEASUREMENT_COLS}, shop:shops(name)`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as MeasurementWithShop[];
    },
  });
}

// Staff view: measurements THIS shop recorded for a given customer (RLS: shop_id = mine).
export function useCustomerMeasurementsAtShop(customerId: UUID | null, shopId: UUID | null) {
  return useQuery<Measurement[]>({
    queryKey: ["measurements", "shop", shopId, customerId],
    enabled: !!customerId && !!shopId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("measurements")
        .select(MEASUREMENT_COLS)
        .eq("customer_id", customerId!)
        .eq("shop_id", shopId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Measurement[];
    },
  });
}

// F4: staff records a measurement. shop_id + recorded_by are enforced by RLS
// (measurements_staff_insert: shop_id = auth_shop_id() and recorded_by = auth.uid()).
export function useRecordMeasurement(shopId: UUID | null, recordedBy: UUID | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      customerId,
      values,
      notes,
    }: {
      customerId: UUID;
      values: MeasurementValues;
      notes: string;
    }) => {
      if (!shopId || !recordedBy) throw new Error("no_session");
      const row: Record<string, unknown> = {
        customer_id: customerId,
        shop_id: shopId,
        recorded_by: recordedBy,
        notes: notes.trim() === "" ? null : notes.trim(),
      };
      for (const f of MEASUREMENT_FIELDS) row[f] = values[f] ?? null;
      const { data, error } = await supabase
        .from("measurements")
        .insert(row)
        .select(MEASUREMENT_COLS)
        .single();
      if (error) throw error;
      return data as Measurement;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["measurements"] }),
  });
}
