import { closeDatabase, getDatabase } from "@/db/sqlite/db";
import { getMasterDatabase } from "@/db/sqlite/master-db";
import { profileRepository } from "@/repositories/profile.repository";
import { Directory, File, Paths } from "expo-file-system";
import * as SecureStore from "expo-secure-store";
import * as Sharing from "expo-sharing";
import { unzip, zip } from "react-native-zip-archive";
import { log, logWarn, logError } from "@/utils/logger";

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

    // 1. Force WAL checkpoint for all profile databases
    try {
      const profiles = await profileRepository.findAll();
      for (const profile of profiles) {
        try {
          const db = await getDatabase(profile.id);
          await db.execAsync("PRAGMA wal_checkpoint(FULL)");
          log(`✓ WAL checkpoint completed for profile ${profile.id}`);
        } catch (error) {
          logWarn(`⚠ Failed to run WAL checkpoint for profile ${profile.id}:`, error);
        }
      }
    } catch (error) {
      logWarn("⚠ Failed to run WAL checkpoints:", error);
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

    // 3. Copy master database
    const masterDbPath = `${uri}/SQLite/master.db`;
    const masterDbFile = new File(masterDbPath);
    if (masterDbFile.exists) {
      const destMasterPath = `${tempBackupDir.uri}/master.db`;
      const destMasterFile = new File(destMasterPath);
      masterDbFile.copy(destMasterFile);
      log("✓ Master database copied");
    } else {
      logWarn("⚠ Master database file not found");
    }

    // 4. Copy all profile databases
    try {
      const profiles = await profileRepository.findAll();
      const profilesDir = new Directory(`${tempBackupDir.uri}/profiles`);
      profilesDir.create({ intermediates: true });

      for (const profile of profiles) {
        const profileDbPath = `${uri}/SQLite/${profile.db_path}`;
        const profileDbFile = new File(profileDbPath);
        
        if (profileDbFile.exists) {
          const destProfilePath = `${profilesDir.uri}/${profile.db_path}`;
          const destProfileFile = new File(destProfilePath);
          profileDbFile.copy(destProfileFile);
          log(`✓ Profile database copied: ${profile.db_path}`);
        } else {
          logWarn(`⚠ Profile database not found: ${profile.db_path}`);
        }
      }
    } catch (error) {
      logWarn("⚠ Failed to copy profile databases:", error);
    }

    // 5. Copy MMKV storage directory
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

    // 6. Read encryption key and settings from SecureStore and save them
    const ENCRYPTION_KEY_STORAGE_KEY = "budgetize_encryption_key";
    const SETTINGS_STORE_KEY = "app_settings";
    const NOTIFICATION_STORE_KEY = "notification_preferences";

    // Save encryption key
    try {
      const encryptionKey = await SecureStore.getItemAsync(
        ENCRYPTION_KEY_STORAGE_KEY
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

    // Save app settings (theme, currency, income calculation)
    try {
      const appSettings = await SecureStore.getItemAsync(SETTINGS_STORE_KEY);
      if (appSettings) {
        const settingsFilePath = `${tempBackupDir.uri}/app_settings.txt`;
        const settingsFile = new File(settingsFilePath);
        settingsFile.write(appSettings);
        log("✓ App settings saved");
      } else {
        logWarn("⚠ App settings not found in SecureStore");
      }
    } catch (error) {
      logWarn("⚠ Failed to read app settings:", error);
    }

    // Save notification preferences
    try {
      const notificationPrefs = await SecureStore.getItemAsync(
        NOTIFICATION_STORE_KEY
      );
      if (notificationPrefs) {
        const notifFilePath = `${tempBackupDir.uri}/notification_preferences.txt`;
        const notifFile = new File(notifFilePath);
        notifFile.write(notificationPrefs);
        log("✓ Notification preferences saved");
      } else {
        logWarn("⚠ Notification preferences not found in SecureStore");
      }
    } catch (error) {
      logWarn("⚠ Failed to read notification preferences:", error);
    }

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
 * Picks a backup file using the system file picker
 *
 * @returns Path to the selected backup file, or null if cancelled/failed
 */
export async function pickBackupFile(): Promise<string | null> {
  try {
    // Use File.pickFileAsync() from the new FileSystem API
    const fileResult = await File.pickFileAsync();

    // Handle both single file and array of files
    const file = Array.isArray(fileResult) ? fileResult[0] : fileResult;

    if (file && file.exists) {
      log("✓ Backup file selected:", file.uri);
      return file.uri;
    }
    return null;
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

    const backupFile = new File(backupPath);
    if (!backupFile.exists) {
      logError("ERROR: Backup file does not exist:", backupPath);
      return false;
    }

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

    // 5. Close database connections before restoring
    try {
      await closeDatabase(); // Closes all profile databases
      log("✓ Database connections closed");
    } catch (error) {
      logWarn("⚠ Failed to close databases:", error);
      // Continue anyway
    }

    // 6. Restore master database
    const restoredMasterPath = `${tempRestoreDir.uri}/master.db`;
    const restoredMasterFile = new File(restoredMasterPath);
    if (restoredMasterFile.exists) {
      const masterDbPath = `${uri}/SQLite/master.db`;
      const targetMasterFile = new File(masterDbPath);
      
      // Backup existing master.db if it exists
      if (targetMasterFile.exists) {
        const backupMasterPath = `${uri}/SQLite/master.db.backup`;
        const backupMasterFile = new File(backupMasterPath);
        targetMasterFile.copy(backupMasterFile);
        log("✓ Backed up existing master.db");
      }
      
      restoredMasterFile.copy(targetMasterFile);
      log("✓ Master database restored");
    } else {
      logWarn("⚠ Master database not found in backup");
    }

    // 7. Restore profile databases
    const profilesDir = new Directory(`${tempRestoreDir.uri}/profiles`);
    if (profilesDir.exists) {
      const profileItems = profilesDir.list();
      for (const item of profileItems) {
        if (item instanceof File && item.name.endsWith('.db')) {
          const profileFileName = item.name;
          const targetProfilePath = `${uri}/SQLite/${profileFileName}`;
          const targetProfileFile = new File(targetProfilePath);
          
          // Backup existing profile DB if it exists
          if (targetProfileFile.exists) {
            const backupProfilePath = `${uri}/SQLite/${profileFileName}.backup`;
            const backupProfileFile = new File(backupProfilePath);
            targetProfileFile.copy(backupProfileFile);
            log(`✓ Backed up existing ${profileFileName}`);
          }
          
          item.copy(targetProfileFile);
          log(`✓ Profile database restored: ${profileFileName}`);
        }
      }
    } else {
      // Legacy backup: try to restore old budgetize.db as profile_1.db
      const restoredDbPath = `${tempRestoreDir.uri}/database.sqlite`;
      const restoredDbFile = new File(restoredDbPath);
      if (restoredDbFile.exists) {
        const legacyProfilePath = `${uri}/SQLite/profile_1.db`;
        const legacyProfileFile = new File(legacyProfilePath);
        
        // Backup existing profile_1.db if it exists
        if (legacyProfileFile.exists) {
          const backupProfilePath = `${uri}/SQLite/profile_1.db.backup`;
          const backupProfileFile = new File(backupProfilePath);
          legacyProfileFile.copy(backupProfileFile);
          log("✓ Backed up existing profile_1.db");
        }
        
        restoredDbFile.copy(legacyProfileFile);
        log("✓ Legacy database restored as profile_1.db");
        
        // Create master.db entry if it doesn't exist
        try {
          const masterDb = await getMasterDatabase();
          const existingProfiles = await masterDb.getAllAsync<{ id: number }>(
            'SELECT id FROM profiles WHERE id = 1'
          );
          if (existingProfiles.length === 0) {
            await masterDb.runAsync(
              `INSERT INTO profiles (id, name, db_path, created_at, updated_at)
               VALUES (1, 'Personal', 'profile_1.db', datetime('now'), datetime('now'))`
            );
            log("✓ Created Personal profile entry in master.db");
          }
        } catch (error) {
          logWarn("⚠ Failed to create profile entry:", error);
        }
      }
    }

    // 8. Restore MMKV storage
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
          logWarn(
            "⚠ Failed to delete existing temp restore folder:",
            error
          );
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
        log(
          `✓ MMKV files copied to temporary folder (${filesCopied} files)`
        );

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
                error
              );
            }
          } else if (
            existingItem instanceof Directory &&
            existingItem.name === mmkvStorageId
          ) {
            try {
              existingItem.delete();
              log(
                `✓ Deleted existing MMKV directory: ${existingItem.name}`
              );
            } catch (error) {
              logWarn(
                `⚠ Failed to delete existing MMKV directory ${existingItem.name}:`,
                error
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
          logWarn(
            "⚠ Failed to cleanup temp folder on error:",
            cleanupError
          );
        }
        logWarn("⚠ Failed to restore MMKV storage:", error);
        throw error;
      }
    } else {
      logWarn("⚠ MMKV directory not found in backup");
    }

    // 9. Restore encryption key and settings
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
          encryptionKey
        );
        log("✓ Encryption key restored");
      } catch (error) {
        logWarn("⚠ Failed to restore encryption key:", error);
      }
    } else {
      logWarn("⚠ Encryption key not found in backup");
    }

    // Restore app settings (theme, currency, income calculation)
    const restoredSettingsPath = `${tempRestoreDir.uri}/app_settings.txt`;
    const restoredSettingsFile = new File(restoredSettingsPath);

    if (restoredSettingsFile.exists) {
      const appSettings = restoredSettingsFile.textSync();

      try {
        await SecureStore.setItemAsync(SETTINGS_STORE_KEY, appSettings);
        log("✓ App settings restored");
      } catch (error) {
        logWarn("⚠ Failed to restore app settings:", error);
      }
    } else {
      logWarn("⚠ App settings not found in backup");
    }

    // Restore notification preferences
    const restoredNotifPath = `${tempRestoreDir.uri}/notification_preferences.txt`;
    const restoredNotifFile = new File(restoredNotifPath);

    if (restoredNotifFile.exists) {
      const notificationPrefs = restoredNotifFile.textSync();

      try {
        await SecureStore.setItemAsync(
          NOTIFICATION_STORE_KEY,
          notificationPrefs
        );
        log("✓ Notification preferences restored");
      } catch (error) {
        logWarn("⚠ Failed to restore notification preferences:", error);
      }
    } else {
      logWarn("⚠ Notification preferences not found in backup");
    }

    // 10. Reopen database connection (will trigger migrations if needed)
    try {
      await getDatabase();
      log("✓ Database connection reopened");
    } catch (error) {
      logError("ERROR reopening database:", error);
      return false;
    }

    // 11. Reload profiles from master.db after restore
    try {
      const { useProfileStore } = await import('@/store/profile-store');
      await useProfileStore.getState().loadProfiles();
      log("✓ Profiles reloaded after restore");
    } catch (error) {
      logWarn("⚠ Failed to reload profiles:", error);
    }

    // 12. Clean up temporary directory
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
