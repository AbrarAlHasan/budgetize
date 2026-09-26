import { UpsertUpiPreferenceInput } from "@/db/schema/types";
import { upiPreferenceRepository } from "@/repositories/upi-preference.repository";
import { logError } from "@/utils/logger";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const QUERY_KEYS = {
  all: ["upi-preferences"] as const,
  byUpiId: (upiId: string) =>
    [...QUERY_KEYS.all, upiId.toLowerCase()] as const,
};

/**
 * Fetch stored preferences for a given UPI ID.
 * Enabled only when `upiId` is a non-empty string.
 */
export function useUpiPreference(upiId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.byUpiId(upiId ?? ""),
    queryFn: () => upiPreferenceRepository.findByUpiId(upiId!),
    enabled: !!upiId && upiId.length > 0,
  });
}

/**
 * Upsert (insert or replace) preferences for a UPI ID.
 * Call this after a transaction is successfully created.
 */
export function useUpsertUpiPreference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpsertUpiPreferenceInput) =>
      upiPreferenceRepository.upsert(input),
    onSuccess: (_data, input) => {
      // Invalidate the specific UPI ID query so future lookups get fresh data
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.byUpiId(input.upi_id),
      });
    },
    onError: (error) => {
      // Non-critical — don't block the user, just log
      logError("[useUpsertUpiPreference] failed to save UPI preferences:", error);
    },
  });
}
