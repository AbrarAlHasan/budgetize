import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import { logError, logWarn } from "@/utils/logger";

const DEVICE_ID_STORAGE_KEY = "device_installation_id";

/**
 * Gets or creates a persistent device identifier
 * This ID persists across app updates but will be regenerated if the app is uninstalled
 * 
 * @returns The device ID (UUID string)
 */
export async function getOrCreateDeviceId(): Promise<string> {
  try {
    // Try to retrieve existing device ID
    const existingId = await SecureStore.getItemAsync(DEVICE_ID_STORAGE_KEY);
    
    if (existingId) {
      return existingId;
    }

    // Generate new device ID if none exists
    // Use async method for consistency with expo-crypto
    const randomBytes = await Crypto.getRandomBytesAsync(16);
    
    // Set version (4) and variant bits according to UUID v4 spec
    randomBytes[6] = (randomBytes[6] & 0x0f) | 0x40; // Version 4
    randomBytes[8] = (randomBytes[8] & 0x3f) | 0x80; // Variant 10
    
    // Convert to UUID string format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    const hex = Array.from(randomBytes)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    
    const newDeviceId = [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20, 32),
    ].join("-");
    
    try {
      await SecureStore.setItemAsync(DEVICE_ID_STORAGE_KEY, newDeviceId);
      return newDeviceId;
    } catch (storageError) {
      logError("Failed to store device ID:", storageError);
      // Return the ID anyway, even if storage failed
      // This ensures the app can still function
      return newDeviceId;
    }
  } catch (error) {
    logError("Error getting or creating device ID:", error);
    // Fallback: generate a temporary ID using crypto API
    // This won't persist, but allows the app to function
    try {
      const fallbackBytes = await Crypto.getRandomBytesAsync(16);
      fallbackBytes[6] = (fallbackBytes[6] & 0x0f) | 0x40;
      fallbackBytes[8] = (fallbackBytes[8] & 0x3f) | 0x80;
      const hex = Array.from(fallbackBytes)
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
      const fallbackId = [
        hex.slice(0, 8),
        hex.slice(8, 12),
        hex.slice(12, 16),
        hex.slice(16, 20),
        hex.slice(20, 32),
      ].join("-");
      logWarn("Using fallback device ID (may not persist)");
      return fallbackId;
    } catch {
      // Last resort: return a simple timestamp-based ID
      return `fallback-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    }
  }
}

