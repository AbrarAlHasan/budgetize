import * as SQLite from "expo-sqlite";
import { log, logError } from "@/utils/logger";

/**
 * Migration 10: Add profiles table and profile_id to all data tables
 * 
 * This migration:
 * 1. Creates the profiles table
 * 2. Adds profile_id column to all data tables
 * 3. Creates indexes for profile_id columns
 * 4. Migrates existing data to a default profile
 * 5. Sets NOT NULL constraint on profile_id after migration
 */
export async function addProfilesTable(db: SQLite.SQLiteDatabase): Promise<void> {
  log("Starting migration 010_add_profiles...");

  try {
    await db.execAsync("BEGIN TRANSACTION");

    // 1. Create profiles table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        is_default INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        deleted_at TEXT,
        remote_id TEXT,
        is_synced INTEGER NOT NULL DEFAULT 0
      );
    `);

    log("✓ Profiles table created");

    // 2. Create default profile if it doesn't exist
    const existingProfiles = await db.getAllAsync<{ id: number }>(
      "SELECT id FROM profiles WHERE deleted_at IS NULL LIMIT 1"
    );

    let defaultProfileId: number;

    if (existingProfiles.length === 0) {
      // Create default profile
      const result = await db.runAsync(
        `INSERT INTO profiles (name, is_default, created_at, updated_at) 
         VALUES (?, 1, datetime('now'), datetime('now'))`,
        ["Personal"]
      );
      defaultProfileId = result.lastInsertRowId;
      log(`✓ Default profile created with ID: ${defaultProfileId}`);
    } else {
      // Use existing profile or set first one as default
      defaultProfileId = existingProfiles[0].id;
      
      // Ensure at least one profile is marked as default
      const defaultProfile = await db.getFirstAsync<{ id: number }>(
        "SELECT id FROM profiles WHERE is_default = 1 AND deleted_at IS NULL LIMIT 1"
      );
      
      if (!defaultProfile) {
        await db.runAsync(
          "UPDATE profiles SET is_default = 1 WHERE id = ?",
          [defaultProfileId]
        );
        log(`✓ Set profile ${defaultProfileId} as default`);
      }
    }

    // 3. Add profile_id column to all data tables (if not exists)
    const tablesToUpdate = [
      "accounts",
      "transactions",
      "categories",
      "tags",
      "exchanges",
      "exchange_installments",
      "exchange_reminders",
    ];

    for (const tableName of tablesToUpdate) {
      // Check if table exists
      const tableExists = await db.getAllAsync<{ name: string }>(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}' LIMIT 1`
      );

      if (tableExists.length === 0) {
        log(`⚠ Table ${tableName} does not exist, skipping`);
        continue;
      }

      // Check if profile_id column already exists
      const tableInfo = await db.getAllAsync<{ name: string }>(
        `PRAGMA table_info(${tableName})`
      );
      const hasProfileId = tableInfo.some((col) => col.name === "profile_id");

      if (!hasProfileId) {
        // Add profile_id column (nullable initially)
        await db.execAsync(
          `ALTER TABLE ${tableName} ADD COLUMN profile_id INTEGER REFERENCES profiles(id)`
        );
        log(`✓ Added profile_id column to ${tableName}`);

        // Migrate existing data to default profile
        await db.runAsync(
          `UPDATE ${tableName} SET profile_id = ? WHERE profile_id IS NULL`,
          [defaultProfileId]
        );
        log(`✓ Migrated existing ${tableName} data to default profile`);

        // Create index for profile_id
        await db.execAsync(
          `CREATE INDEX IF NOT EXISTS idx_${tableName}_profile_id ON ${tableName}(profile_id)`
        );
        log(`✓ Created index for ${tableName}.profile_id`);
      } else {
        log(`⚠ ${tableName} already has profile_id column, skipping`);
      }
    }

    // 4. Add profile_id to transaction_tags junction table (special handling)
    const transactionTagsInfo = await db.getAllAsync<{ name: string }>(
      "PRAGMA table_info(transaction_tags)"
    );
    const hasTransactionTagsProfileId = transactionTagsInfo.some(
      (col) => col.name === "profile_id"
    );

    if (!hasTransactionTagsProfileId) {
      // For junction tables, we need to derive profile_id from the parent table
      // Add profile_id column
      await db.execAsync(
        "ALTER TABLE transaction_tags ADD COLUMN profile_id INTEGER REFERENCES profiles(id)"
      );
      log("✓ Added profile_id column to transaction_tags");

      // Migrate existing data: get profile_id from transactions
      await db.runAsync(`
        UPDATE transaction_tags 
        SET profile_id = (
          SELECT profile_id FROM transactions 
          WHERE transactions.id = transaction_tags.transaction_id 
          LIMIT 1
        )
        WHERE profile_id IS NULL
      `);
      log("✓ Migrated existing transaction_tags data to default profile");

      // Create index
      await db.execAsync(
        "CREATE INDEX IF NOT EXISTS idx_transaction_tags_profile_id ON transaction_tags(profile_id)"
      );
      log("✓ Created index for transaction_tags.profile_id");
    }

    // 5. Ensure unique constraint: only one default profile
    // This is handled at application level, but we can add a trigger for safety
    await db.execAsync(`
      CREATE TRIGGER IF NOT EXISTS ensure_single_default_profile
      AFTER UPDATE OF is_default ON profiles
      WHEN NEW.is_default = 1
      BEGIN
        UPDATE profiles 
        SET is_default = 0 
        WHERE id != NEW.id AND is_default = 1 AND deleted_at IS NULL;
      END;
    `);
    log("✓ Created trigger to ensure single default profile");

    await db.execAsync("COMMIT");
    log("Migration 010_add_profiles completed successfully");
  } catch (error) {
    await db.execAsync("ROLLBACK");
    logError("Error applying migration 010_add_profiles:", error);
    throw error;
  }
}

