import { closeDatabase, getDatabase } from "@/db/sqlite/db";
import { clearEncryptionKeyCache } from "@/services/encryption";
import { mmkv } from "@/storage/mmkv";
import { useNotificationStore } from "@/store/notification-store";
import { useSettingsStore } from "@/store/settings-store";
import { log, logError, logWarn } from "@/utils/logger";
import * as DocumentPicker from "expo-document-picker";
import { Directory, File, Paths } from "expo-file-system";
import * as LegacyFileSystem from "expo-file-system/legacy";
import * as SecureStore from "expo-secure-store";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import { unzip, zip } from "react-native-zip-archive";

const BACKUP_ZIP_MIME_TYPES = [
  "application/zip",
  "application/x-zip-compressed",
  "application/octet-stream",
] as const;

const IMPORTED_BACKUP_ZIP = "imported-backup.zip";

interface BackupMetadata {
  createdAt: string;
  version: string;
}

/**
 * Generic function that creates a backup ZIP file and returns the file location.
 * This function only creates the backup file - it does NOT share it.
 *
 * Exports all application data:
 * - SQLite database (with WAL checkpoint)
 * - MMKV storage directory
 * - Encryption key from SecureStore
 * - Metadata (timestamp, version)
 *
 * @returns Path to the created backup ZIP file, or null on failure
 */
export async function createBackupFile(): Promise<string | null> {
  let tempBackupDir: Directory | null = null;

  try {
    const uri = Paths.document.uri;
    log("Starting backup process...");

    // 1. Force WAL checkpoint to ensure all data is in main database file
    try {
      const db = await getDatabase();
      await db.execAsync("PRAGMA wal_checkpoint(FULL)");
      log("✓ WAL checkpoint completed");
    } catch (error) {
      logWarn("⚠ Failed to run WAL checkpoint:", error);
      // Continue anyway - backup will still work
    }

    // 2. Create temporary backup directory
    tempBackupDir = new Directory(uri, "backup-temp");
    if (tempBackupDir.exists) {
      try {
        tempBackupDir.delete();
      } catch (error) {
        logWarn("⚠ Failed to delete existing temp directory:", error);
      }
    }
    tempBackupDir.create({ intermediates: true });
    log("✓ Temporary backup directory created");

    // 3. Copy SQLite database file
    const dbPath = `${uri}/SQLite/budgetize.db`;
    const sourceDbFile = new File(dbPath);

    if (sourceDbFile.exists) {
      const destDbPath = `${tempBackupDir.uri}/database.sqlite`;
      const destDbFile = new File(destDbPath);
      sourceDbFile.copy(destDbFile);
      log("✓ Database copied");
    } else {
      logWarn("⚠ Database file not found, continuing without it");
    }

    // 4. Copy MMKV storage directory
    // MMKV typically stores files in platform-specific locations
    // On Android: /data/data/[package]/files/mmkv/[storageId]
    // On iOS: [App Documents]/mmkv/[storageId]
    // We'll try common paths
    const mmkvStorageId = "moneyManagerStorage";
    const mmkvPaths = [
      `${uri}/mmkv/${mmkvStorageId}`,
      `${uri}/mmkv`,
      `${uri}/${mmkvStorageId}`,
    ];

    let mmkvCopied = false;
    for (const mmkvPath of mmkvPaths) {
      try {
        const mmkvDir = new Directory(mmkvPath);
        if (mmkvDir.exists) {
          const destMmkvPath = `${tempBackupDir.uri}/mmkv`;
          const destMmkvDir = new Directory(destMmkvPath);
          mmkvDir.copy(destMmkvDir);
          log("✓ MMKV storage copied from:", mmkvPath);
          mmkvCopied = true;
          break;
        }
      } catch (error) {
        // Continue to next path
        continue;
      }
    }

    if (!mmkvCopied) {
      logWarn("⚠ MMKV directory not found, continuing without it");
    }

    // 5. Read encryption key and settings from SecureStore and save them
    const ENCRYPTION_KEY_STORAGE_KEY = "budgetize_encryption_key";
    const SETTINGS_STORE_KEY = "app_settings";
    const NOTIFICATION_STORE_KEY = "notification_preferences";

    // Save encryption key
    try {
      const encryptionKey = await SecureStore.getItemAsync(
        ENCRYPTION_KEY_STORAGE_KEY,
      );
      if (encryptionKey) {
        const keyFilePath = `${tempBackupDir.uri}/encryption_key.txt`;
        const keyFile = new File(keyFilePath);
        keyFile.write(encryptionKey);
        log("✓ Encryption key saved");
      } else {
        logWarn("⚠ Encryption key not found in SecureStore");
      }
    } catch (error) {
      logWarn("⚠ Failed to read encryption key:", error);
    }

    // Save app settings (theme, currency, income calculation) from MMKV
    try {
      const appSettings = mmkv.getString(SETTINGS_STORE_KEY);
      if (appSettings) {
        const settingsFilePath = `${tempBackupDir.uri}/app_settings.txt`;
        const settingsFile = new File(settingsFilePath);
        settingsFile.write(appSettings);
        log("✓ App settings saved");
      } else {
        logWarn("⚠ App settings not found in MMKV");
      }
    } catch (error) {
      logWarn("⚠ Failed to read app settings:", error);
    }

    // Save notification preferences from MMKV
    try {
      const notificationPrefs = mmkv.getString(NOTIFICATION_STORE_KEY);
      if (notificationPrefs) {
        const notifFilePath = `${tempBackupDir.uri}/notification_preferences.txt`;
        const notifFile = new File(notifFilePath);
        notifFile.write(notificationPrefs);
        log("✓ Notification preferences saved");
      } else {
        logWarn("⚠ Notification preferences not found in MMKV");
      }
    } catch (error) {
      logWarn("⚠ Failed to read notification preferences:", error);
    }

    // Note: Device ID is NOT backed up as it's device-specific and should not be migrated

    // 6. Create metadata.json
    const metadata: BackupMetadata = {
      createdAt: new Date().toISOString(),
      version: "1.0",
    };
    const metadataFilePath = `${tempBackupDir.uri}/metadata.json`;
    const metadataFile = new File(metadataFilePath);
    metadataFile.write(JSON.stringify(metadata, null, 2));
    log("✓ Metadata created");

    // 7. Generate unique backup filename with timestamp
    const now = new Date();
    const timestamp = now
      .toISOString()
      .replace(/T/, "-")
      .replace(/:/g, "-")
      .replace(/\.\d{3}Z$/, "");

    const backupFileName = `backup-${timestamp}.zip`;
    const backupZipPath = `${uri}/${backupFileName}`;

    // 8. Zip the backup-temp directory
    await zip(tempBackupDir.uri, backupZipPath);
    log("✓ Backup ZIP created:", backupZipPath);

    // 9. Clean up temporary directory
    if (tempBackupDir.exists) {
      try {
        tempBackupDir.delete();
        log("✓ Temporary directory cleaned up");
      } catch (error) {
        logWarn("⚠ Failed to clean up temp directory:", error);
      }
    }

    log("✓ Backup file created successfully");
    return backupZipPath;
  } catch (error) {
    logError("ERROR IN BACKUP:", error);

    // Clean up on error
    if (tempBackupDir?.exists) {
      try {
        tempBackupDir.delete();
      } catch (cleanupError) {
        logError("Failed to clean up temp directory:", cleanupError);
      }
    }

    return null;
  }
}

/**
 * Complete backup function that exports all application data and shares it.
 * This function creates a backup and automatically opens the share dialog.
 *
 * @deprecated Use createBackupFile() and Sharing.shareAsync() separately for more control
 * @returns Path to the created backup ZIP file, or null on failure
 */
export async function backupAppData(): Promise<string | null> {
  try {
    // 1. Create the backup file
    const backupPath = await createBackupFile();
    if (!backupPath) {
      return null;
    }

    // 2. Share the backup via system share dialog
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(backupPath);
        log("✓ Backup shared via system dialog");
      } else {
        logWarn("⚠ Sharing not available on this platform");
      }
    } catch (error) {
      logWarn("⚠ Failed to share backup:", error);
      // Continue anyway - backup file is still created
    }

    return backupPath;
  } catch (error) {
    logError("ERROR IN BACKUP:", error);
    return null;
  }
}

/**
 * Ensures the backup zip is on a local file:// path that unzip can read.
 * DocumentPicker (with copyToCacheDirectory) already returns file:// on iOS/Android.
 * content:// URIs must be copied into app documents first.
 */
async function resolveBackupPathForUnzip(
  sourceUri: string,
): Promise<string | null> {
  if (sourceUri.startsWith("file://")) {
    return sourceUri;
  }

  const destPath = `${Paths.document.uri}/${IMPORTED_BACKUP_ZIP}`;
  const destFile = new File(destPath);
  const sourceFile = new File(sourceUri);

  if (destFile.exists) {
    destFile.delete();
  }

  try {
    await sourceFile.copy(destFile, { overwrite: true });
    if (destFile.exists) {
      log("✓ Backup copied for restore:", destPath);
      return destPath;
    }
  } catch (error) {
    logWarn("⚠ File.copy failed, trying legacy copyAsync:", error);
  }

  try {
    await LegacyFileSystem.copyAsync({ from: sourceUri, to: destPath });
    if (destFile.exists) {
      log("✓ Backup copied via legacy API for restore:", destPath);
      return destPath;
    }
  } catch (error) {
    logWarn("⚠ legacy copyAsync failed, trying bytes read:", error);
  }

  try {
    const bytes = await sourceFile.bytes();
    destFile.write(bytes);
    if (destFile.exists) {
      log("✓ Backup written for restore:", destPath);
      return destPath;
    }
  } catch (error) {
    logError("ERROR: Could not read backup file:", sourceUri, error);
  }

  return null;
}

/**
 * Picks a backup file using the system file picker
 *
 * @returns Path to the selected backup file, or null if cancelled/failed
 */
export async function pickBackupFile(): Promise<string | null> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type:
        Platform.OS === "android"
          ? [...BACKUP_ZIP_MIME_TYPES, "*/*"]
          : [...BACKUP_ZIP_MIME_TYPES],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.[0]?.uri) {
      return null;
    }

    log("✓ Backup file selected:", result.assets[0].uri);
    return result.assets[0].uri;
  } catch (error) {
    logError("ERROR PICKING BACKUP FILE:", error);
    return null;
  }
}

/**
 * Restores application data from a backup ZIP file
 *
 * Process:
 * 1. Extract the backup ZIP to a temporary directory
 * 2. Close the database connection
 * 3. Restore SQLite database
 * 4. Restore MMKV storage
 * 5. Restore encryption key
 * 6. Reopen database connection
 * 7. Clean up temporary files
 *
 * @param backupZipPath Path to the backup ZIP file (optional, will prompt if not provided)
 * @returns true if restore was successful, false otherwise
 */
export async function restoreAppData(backupZipPath?: string): Promise<boolean> {
  let tempRestoreDir: Directory | null = null;
  let backupPath: string | null = backupZipPath || null;

  try {
    const uri = Paths.document.uri;
    log("Starting restore process...");

    // 1. Pick backup file if not provided
    if (!backupPath) {
      backupPath = await pickBackupFile();
      if (!backupPath) {
        logWarn("⚠ No backup file selected");
        return false;
      }
    }

    const resolvedBackupPath = await resolveBackupPathForUnzip(backupPath);
    if (!resolvedBackupPath) {
      return false;
    }
    backupPath = resolvedBackupPath;

    // 2. Create temporary restore directory
    tempRestoreDir = new Directory(uri, "restore-temp");
    if (tempRestoreDir.exists) {
      try {
        tempRestoreDir.delete();
      } catch (error) {
        logWarn("⚠ Failed to delete existing temp directory:", error);
      }
    }
    tempRestoreDir.create({ intermediates: true });
    log("✓ Temporary restore directory created");

    // 3. Extract the backup ZIP file
    await unzip(backupPath, tempRestoreDir.uri);
    log("✓ Backup ZIP extracted");

    // 4. Read and verify metadata
    const metadataPath = `${tempRestoreDir.uri}/metadata.json`;
    const metadataFile = new File(metadataPath);
    if (metadataFile.exists) {
      const metadataContent = metadataFile.textSync();
      const metadata: BackupMetadata = JSON.parse(metadataContent);
      log("✓ Backup metadata:", metadata);
    } else {
      logWarn("⚠ Metadata file not found in backup");
    }

    // 5. Close database connection before restoring
    try {
      await closeDatabase();
      log("✓ Database connection closed");
    } catch (error) {
      logWarn("⚠ Failed to close database:", error);
      // Continue anyway
    }

    // 6. Restore SQLite database
    const restoredDbPath = `${tempRestoreDir.uri}/database.sqlite`;
    const restoredDbFile = new File(restoredDbPath);

    if (restoredDbFile.exists) {
      const dbPath = `${uri}/SQLite/budgetize.db`;
      const targetDbFile = new File(dbPath);

      // Ensure SQLite directory exists
      const sqliteDir = new Directory(uri, "SQLite");
      if (!sqliteDir.exists) {
        sqliteDir.create({ intermediates: true });
      }

      // Delete existing database file if it exists
      if (targetDbFile.exists) {
        try {
          targetDbFile.delete();
          log("✓ Existing database deleted");
        } catch (error) {
          logWarn("⚠ Failed to delete existing database:", error);
          // Continue anyway - try to overwrite
        }
      }

      // Copy the restored database
      restoredDbFile.copy(targetDbFile);
      log("✓ Database restored");
    } else {
      logWarn("⚠ Database file not found in backup");
    }

    // 7. Restore MMKV storage
    const mmkvStorageId = "moneyManagerStorage";
    const restoredMmkvPath = `${tempRestoreDir.uri}/mmkv`;
    const restoredMmkvDir = new Directory(restoredMmkvPath);

    // Check if MMKV directory exists in backup
    if (restoredMmkvDir.exists) {
      const parentDir = new Directory(uri, "mmkv");
      if (!parentDir.exists) {
        parentDir.create({ intermediates: true });
      }

      // Create temporary restore folder inside mmkv/
      const tempRestoreMmkvPath = `${uri}/mmkv/restore`;
      const tempRestoreMmkvDir = new Directory(tempRestoreMmkvPath);

      // Delete temp restore folder if it exists from previous failed restore
      if (tempRestoreMmkvDir.exists) {
        try {
          tempRestoreMmkvDir.delete();
        } catch (error) {
          logWarn("⚠ Failed to delete existing temp restore folder:", error);
        }
      }

      // Check for nested structure: restore-temp/mmkv/moneyManagerStorage/
      const nestedMmkvPath = `${restoredMmkvPath}/${mmkvStorageId}`;
      const nestedMmkvDir = new Directory(nestedMmkvPath);

      // Determine source directory (nested or flat structure)
      let sourceMmkvDir: Directory;
      if (nestedMmkvDir.exists) {
        // Nested structure: restore-temp/mmkv/moneyManagerStorage/
        sourceMmkvDir = nestedMmkvDir;
        log("✓ Found nested MMKV structure");
      } else {
        // Flat structure: restore-temp/mmkv/ (files directly)
        sourceMmkvDir = restoredMmkvDir;
        log("✓ Found flat MMKV structure");
      }

      // Create temporary restore directory
      tempRestoreMmkvDir.create({ intermediates: true });

      // Copy MMKV files to temporary restore folder
      try {
        const mmkvContents = sourceMmkvDir.list();
        let filesCopied = 0;

        for (const item of mmkvContents) {
          if (item instanceof File) {
            const tempFilePath = `${tempRestoreMmkvDir.uri}/${item.name}`;
            const tempFile = new File(tempFilePath);

            // Delete temp file if it exists
            if (tempFile.exists) {
              tempFile.delete();
            }

            item.copy(tempFile);
            filesCopied++;
          } else if (item instanceof Directory) {
            // Handle subdirectories recursively
            const tempSubDirPath = `${tempRestoreMmkvDir.uri}/${item.name}`;
            const tempSubDir = new Directory(tempSubDirPath);

            if (tempSubDir.exists) {
              tempSubDir.delete();
            }

            tempSubDir.create({ intermediates: true });

            // Recursively copy subdirectory contents
            const subContents = item.list();
            for (const subItem of subContents) {
              if (subItem instanceof File) {
                const subTempPath = `${tempSubDir.uri}/${subItem.name}`;
                const subTempFile = new File(subTempPath);
                if (subTempFile.exists) {
                  subTempFile.delete();
                }
                subItem.copy(subTempFile);
                filesCopied++;
              }
            }
          }
        }
        log(`✓ MMKV files copied to temporary folder (${filesCopied} files)`);

        // Delete existing MMKV files/directories in mmkv/ folder
        // MMKV stores files like: mmkv/moneyManagerStorage, mmkv/moneyManagerStorage.crc
        const existingMmkvFiles = parentDir.list();
        for (const existingItem of existingMmkvFiles) {
          // Delete any file or directory that matches the storage ID or related files
          if (
            existingItem instanceof File &&
            existingItem.name.startsWith(mmkvStorageId)
          ) {
            try {
              existingItem.delete();
              log(`✓ Deleted existing MMKV file: ${existingItem.name}`);
            } catch (error) {
              logWarn(
                `⚠ Failed to delete existing MMKV file ${existingItem.name}:`,
                error,
              );
            }
          } else if (
            existingItem instanceof Directory &&
            existingItem.name === mmkvStorageId
          ) {
            try {
              existingItem.delete();
              log(`✓ Deleted existing MMKV directory: ${existingItem.name}`);
            } catch (error) {
              logWarn(
                `⚠ Failed to delete existing MMKV directory ${existingItem.name}:`,
                error,
              );
            }
          }
        }

        // Copy files from temporary restore folder directly to mmkv/ folder
        const tempContents = tempRestoreMmkvDir.list();
        for (const item of tempContents) {
          if (item instanceof File) {
            // Copy directly to mmkv/ folder
            const finalFilePath = `${parentDir.uri}/${item.name}`;
            const finalFile = new File(finalFilePath);
            if (finalFile.exists) {
              finalFile.delete();
            }
            item.copy(finalFile);
          } else if (item instanceof Directory) {
            // For directories, copy their contents to mmkv/ folder
            const subContents = item.list();
            for (const subItem of subContents) {
              if (subItem instanceof File) {
                const subFinalPath = `${parentDir.uri}/${subItem.name}`;
                const subFinalFile = new File(subFinalPath);
                if (subFinalFile.exists) {
                  subFinalFile.delete();
                }
                subItem.copy(subFinalFile);
              }
            }
          }
        }

        // Delete the temporary restore folder
        try {
          tempRestoreMmkvDir.delete();
          log("✓ Temporary restore folder cleaned up");
        } catch (error) {
          logWarn("⚠ Failed to delete temporary restore folder:", error);
        }

        log("✓ MMKV storage restored");
      } catch (error) {
        // Clean up temp folder on error
        try {
          if (tempRestoreMmkvDir.exists) {
            tempRestoreMmkvDir.delete();
          }
        } catch (cleanupError) {
          logWarn("⚠ Failed to cleanup temp folder on error:", cleanupError);
        }
        logWarn("⚠ Failed to restore MMKV storage:", error);
        throw error;
      }
    } else {
      logWarn("⚠ MMKV directory not found in backup");
    }

    // 8. Restore encryption key and settings
    const ENCRYPTION_KEY_STORAGE_KEY = "budgetize_encryption_key";
    const SETTINGS_STORE_KEY = "app_settings";
    const NOTIFICATION_STORE_KEY = "notification_preferences";

    // Restore encryption key
    const restoredKeyPath = `${tempRestoreDir.uri}/encryption_key.txt`;
    const restoredKeyFile = new File(restoredKeyPath);

    if (restoredKeyFile.exists) {
      const encryptionKey = restoredKeyFile.textSync();

      try {
        await SecureStore.setItemAsync(
          ENCRYPTION_KEY_STORAGE_KEY,
          encryptionKey,
        );
        // Clear the encryption key cache so the newly restored key is used
        clearEncryptionKeyCache();
        log("✓ Encryption key restored and cache cleared");
      } catch (error) {
        logWarn("⚠ Failed to restore encryption key:", error);
      }
    } else {
      logWarn("⚠ Encryption key not found in backup");
    }

    // Restore app settings (theme, currency, income calculation) to MMKV and Zustand
    const restoredSettingsPath = `${tempRestoreDir.uri}/app_settings.txt`;
    const restoredSettingsFile = new File(restoredSettingsPath);

    if (restoredSettingsFile.exists) {
      const appSettingsJson = restoredSettingsFile.textSync();

      try {
        // The exported data is already in Zustand persist format: { state: {...}, version: 0 }
        // Restore directly to MMKV
        mmkv.set(SETTINGS_STORE_KEY, appSettingsJson);

        // Parse and extract the settings to update Zustand store directly
        const zustandPersistedData = JSON.parse(appSettingsJson);
        if (zustandPersistedData?.state?.settings) {
          // Force update Zustand store directly so it's immediately reflected
          useSettingsStore.setState({
            settings: zustandPersistedData.state.settings,
            isMigrated: zustandPersistedData.state.isMigrated ?? true,
          });
          log("✓ App settings restored to MMKV and Zustand");
        } else {
          // Legacy format: just the settings object
          const restoredSettings = zustandPersistedData;
          useSettingsStore.setState({
            settings: restoredSettings,
            isMigrated: true,
          });
          // Also update MMKV in correct format
          const zustandState = {
            state: {
              settings: restoredSettings,
              isLoading: false,
              isMigrated: true,
            },
            version: 0,
          };
          mmkv.set(SETTINGS_STORE_KEY, JSON.stringify(zustandState));
          log("✓ App settings restored (legacy format) to MMKV and Zustand");
        }
      } catch (error) {
        logWarn("⚠ Failed to restore app settings:", error);
      }
    } else {
      logWarn("⚠ App settings not found in backup");
    }

    // Restore notification preferences to MMKV and Zustand
    const restoredNotifPath = `${tempRestoreDir.uri}/notification_preferences.txt`;
    const restoredNotifFile = new File(restoredNotifPath);

    if (restoredNotifFile.exists) {
      const notificationPrefsJson = restoredNotifFile.textSync();

      try {
        // The exported data is already in Zustand persist format: { state: {...}, version: 0 }
        // Restore directly to MMKV
        mmkv.set(NOTIFICATION_STORE_KEY, notificationPrefsJson);

        // Parse and extract the preferences to update Zustand store directly
        const zustandPersistedData = JSON.parse(notificationPrefsJson);
        if (zustandPersistedData?.state?.preferences) {
          // Force update Zustand store directly so it's immediately reflected
          useNotificationStore.setState({
            preferences: zustandPersistedData.state.preferences,
            isMigrated: zustandPersistedData.state.isMigrated ?? true,
          });
          log("✓ Notification preferences restored to MMKV and Zustand");
        } else {
          // Legacy format: just the preferences object
          const restoredPrefs = zustandPersistedData;
          useNotificationStore.setState({
            preferences: restoredPrefs,
            isMigrated: true,
          });
          // Also update MMKV in correct format
          const zustandState = {
            state: {
              preferences: restoredPrefs,
              isLoading: false,
              isMigrated: true,
            },
            version: 0,
          };
          mmkv.set(NOTIFICATION_STORE_KEY, JSON.stringify(zustandState));
          log(
            "✓ Notification preferences restored (legacy format) to MMKV and Zustand",
          );
        }
      } catch (error) {
        logWarn("⚠ Failed to restore notification preferences:", error);
      }
    } else {
      logWarn("⚠ Notification preferences not found in backup");
    }

    // Note: Device ID is NOT restored as it's device-specific and should remain unique per device

    // 9. Reopen database connection (will trigger migrations if needed)
    try {
      await getDatabase();
      log("✓ Database connection reopened");
    } catch (error) {
      logError("ERROR reopening database:", error);
      return false;
    }

    // 10. Clean up temporary directory
    if (tempRestoreDir.exists) {
      try {
        tempRestoreDir.delete();
        log("✓ Temporary directory cleaned up");
      } catch (error) {
        logWarn("⚠ Failed to clean up temp directory:", error);
      }
    }

    log("✓ Restore completed successfully");
    return true;
  } catch (error) {
    logError("ERROR IN RESTORE:", error);

    // Clean up on error
    if (tempRestoreDir?.exists) {
      try {
        tempRestoreDir.delete();
      } catch (cleanupError) {
        logError("Failed to clean up temp directory:", cleanupError);
      }
    }

    // Try to reopen database even on error
    try {
      await getDatabase();
    } catch (dbError) {
      logError("Failed to reopen database after error:", dbError);
    }

    return false;
  }
}

/**
 * Legacy function for backing up only SQLite database
 * Kept for backward compatibility
 *
 * @returns Path to the backup file, or null on failure
 */
export async function backupSqlLiteData(): Promise<string | null> {
  try {
    const uri = Paths.document.uri;
    const dbPath = `${uri}/SQLite/budgetize.db`;

    const now = new Date();
    const timestamp = now
      .toISOString()
      .replace(/T/, "-")
      .replace(/:/g, "-")
      .replace(/\.\d{3}Z$/, "");

    const backupFileName = `backup-${timestamp}.db`;
    const backupPath = `${uri}/SQLite/${backupFileName}`;

    const sourceFile = new File(dbPath);
    const destinationFile = new File(backupPath);

    sourceFile.copy(destinationFile);

    return destinationFile.uri;
  } catch (error) {
    logError("ERROR IN GETTING SQLITE DATA", error);
    return null;
  }
}
