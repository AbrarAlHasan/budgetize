import { File } from "expo-file-system";
import { supabase } from "./client";
import { log, logError, logWarn } from "@/utils/logger";

const BACKUP_BUCKET = process.env.EXPO_PUBLIC_BACKUP_BUCKET as string;
const MAX_BACKUPS = 3;

export interface CloudBackup {
  id: string;
  name: string;
  created_at: string;
  size: number;
  path: string;
}

/**
 * Upload a backup file to Supabase Storage
 */
export async function uploadBackup(
  localFilePath: string,
  userId: string
): Promise<{ error: Error | null; path: string | null }> {
  try {
    const file = new File(localFilePath);
    if (!file.exists) {
      return { error: new Error("Backup file does not exist"), path: null };
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `backup-${timestamp}.zip`;
    const storagePath = `${userId}/${fileName}`;

    // Read file bytes using new FileSystem API
    const fileBytes = await file.bytes();

    // Upload raw bytes directly (Supabase supports ArrayBuffer/Uint8Array)
    // We don't need to create a Blob manually which causes issues in RN

    log("storagePath:", storagePath);

    const { data, error } = await supabase.storage
      .from(BACKUP_BUCKET)
      .upload(storagePath, fileBytes, {
        contentType: "application/zip",
        upsert: false,
      });

    if (error) {
      logError("Upload error:", error);
      return { error, path: null };
    }

    return { error: null, path: data.path };
  } catch (error) {
    logError("Unexpected error uploading backup:", error);
    return { error: error as Error, path: null };
  }
}

/**
 * List all backups for a user (returns max 3 latest)
 */
export async function listBackups(
  userId: string
): Promise<{ backups: CloudBackup[]; error: Error | null }> {
  try {
    const { data, error } = await supabase.storage
      .from("transactions")
      .list(userId, {
        sortBy: { column: "created_at", order: "desc" },
        limit: MAX_BACKUPS,
      });

    if (error) {
      logError("List backups error:", error);
      return { backups: [], error };
    }

    const backups: CloudBackup[] = (data || [])
      .filter((file) => file.name.endsWith(".zip"))
      .map((file) => ({
        id: file.id || file.name,
        name: file.name,
        created_at: file.created_at || new Date().toISOString(),
        size: file.metadata?.size || 0,
        path: `${userId}/${file.name}`,
      }));

    return { backups, error: null };
  } catch (error) {
    logError("Unexpected error listing backups:", error);
    return { backups: [], error: error as Error };
  }
}

/**
 * Download a backup file from Supabase Storage
 */
export async function downloadBackup(
  storagePath: string,
  localFilePath: string
): Promise<{ error: Error | null }> {
  try {
    const { data, error } = await supabase.storage
      .from(BACKUP_BUCKET)
      .download(storagePath);

    if (error) {
      logError("Download error:", error);
      return { error };
    }

    if (!data) {
      return { error: new Error("No data received from storage") };
    }

    // Convert blob to base64 using FileReader (works in RN)
    const blob = data;
    const reader = new FileReader();
    
    const base64Promise = new Promise<string>((resolve, reject) => {
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix if present (e.g., "data:application/zip;base64,")
        const base64 = result.split(',')[1] || result;
        resolve(base64);
      };
      reader.onerror = () => {
        reject(new Error('Failed to read blob'));
      };
      reader.readAsDataURL(blob);
    });

    const base64Data = await base64Promise;
    
    // Convert base64 to Uint8Array
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const uint8Array = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      uint8Array[i] = binaryString.charCodeAt(i);
    }

    // Create file and write bytes using new FileSystem API
    const file = new File(localFilePath);
    file.write(uint8Array);

    return { error: null };
  } catch (error) {
    logError("Unexpected error downloading backup:", error);
    return { error: error as Error };
  }
}

/**
 * Delete a backup file from Supabase Storage
 */
export async function deleteBackup(
  storagePath: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.storage
      .from(BACKUP_BUCKET)
      .remove([storagePath]);

    if (error) {
      logError("Delete backup error:", error);
      return { error };
    }

    return { error: null };
  } catch (error) {
    logError("Unexpected error deleting backup:", error);
    return { error: error as Error };
  }
}

/**
 * Clean up old backups beyond the limit
 */
export async function cleanupOldBackups(
  userId: string
): Promise<{ error: Error | null }> {
  try {
    const { backups, error: listError } = await listBackups(userId);

    if (listError) {
      return { error: listError };
    }

    // If we have more than MAX_BACKUPS, delete the oldest ones
    if (backups.length > MAX_BACKUPS) {
      const backupsToDelete = backups.slice(MAX_BACKUPS);

      for (const backup of backupsToDelete) {
        const { error: deleteError } = await deleteBackup(backup.path);
        if (deleteError) {
          logWarn(
            "Failed to delete old backup:",
            backup.path,
            deleteError
          );
        }
      }
    }

    return { error: null };
  } catch (error) {
    logError("Unexpected error cleaning up backups:", error);
    return { error: error as Error };
  }
}
