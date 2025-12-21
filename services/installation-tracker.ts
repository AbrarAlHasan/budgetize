import { supabase } from "@/services/supabase/client";
import type {
  DeviceInstallationInsert,
  DeviceInstallationUpdate,
} from "@/types/installation";
import { getOrCreateDeviceId } from "@/utils/device-id";
import { logError, logWarn } from "@/utils/logger";
import { getDeviceInfo } from "@/utils/support";

/**
 * Tracks device installation and app opens in Supabase
 *
 * This function:
 * - Gets or creates a device ID
 * - Collects device information
 * - Checks if device record exists in Supabase
 * - If exists: Updates last_opened_at timestamp
 * - If not exists: Inserts new record with all device information
 *
 * This is non-blocking and handles errors gracefully.
 */
export async function trackInstallation(): Promise<void> {
  try {
    if (__DEV__) {
      return;
    }
    // Get or create device ID
    const deviceId = await getOrCreateDeviceId();

    // Collect device information
    const deviceInfo = await getDeviceInfo();

    // Prepare the current timestamp
    const now = new Date().toISOString();

    // Check if device record exists
    const { data: existingRecord, error: selectError } = await supabase
      .from("device_installations")
      .select("device_id")
      .eq("device_id", deviceId)
      .single();

    if (selectError && selectError.code !== "PGRST116") {
      // PGRST116 is "not found" which is expected for new devices
      // Other errors should be logged
      logWarn(
        "Error checking for existing device record:",
        selectError.message
      );
    }

    if (existingRecord) {
      // Device exists, update last_opened_at
      const updateData: DeviceInstallationUpdate = {
        last_opened_at: now,
        updated_at: now,
        app_version: deviceInfo.appVersion,
      };

      const { error: updateError } = await supabase
        .from("device_installations")
        .update(updateData)
        .eq("device_id", deviceId);

      if (updateError) {
        logError("Error updating device installation:", updateError);
      }
    } else {
      // Device doesn't exist, insert new record
      const insertData: DeviceInstallationInsert = {
        device_id: deviceId,
        first_opened_at: now,
        last_opened_at: now,
        device_name: deviceInfo.deviceName,
        device_model: deviceInfo.deviceModel,
        os_name: deviceInfo.osName,
        os_version: deviceInfo.osVersion,
        platform: deviceInfo.platform,
        brand: deviceInfo.brand,
        manufacturer: deviceInfo.manufacturer,
        app_version: deviceInfo.appVersion,
      };

      const { error: insertError } = await supabase
        .from("device_installations")
        .insert(insertData);

      if (insertError) {
        logError("Error inserting device installation:", insertError);
      }
    }
  } catch (error) {
    // Log error but don't throw - this should not block app startup
    logError("Unexpected error in installation tracking:", error);
  }
}
