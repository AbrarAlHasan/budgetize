import * as SQLite from 'expo-sqlite';
import { File, Directory, Paths } from 'expo-file-system';
import { log, logError, logWarn } from '@/utils/logger';
import { getMasterDatabase } from '@/db/sqlite/master-db';
import { runMigrations } from './runner';

/**
 * Migration to convert existing budgetize.db to profile system
 * This migration:
 * 1. Creates master.db if it doesn't exist
 * 2. Checks if profiles table has any profiles
 * 3. If no profiles exist and budgetize.db exists, migrate it to profile_1.db
 * 4. Creates "Personal" profile entry
 */
export async function migrateToProfiles(): Promise<void> {
  try {
    log('Starting profile migration...');

    // 1. Ensure master database exists and is initialized
    const masterDb = await getMasterDatabase();

    // 2. Check if profiles already exist
    const existingProfiles = await masterDb.getAllAsync<{ id: number }>(
      'SELECT id FROM profiles LIMIT 1'
    );

    if (existingProfiles.length > 0) {
      log('✓ Profiles already exist, skipping migration');
      return;
    }

    // 3. Check if legacy budgetize.db exists
    const uri = Paths.document.uri;
    const legacyDbPath = `${uri}/SQLite/budgetize.db`;
    const legacyDbFile = new File(legacyDbPath);

    if (!legacyDbFile.exists) {
      log('✓ No legacy database found, creating default "Personal" profile');
      // Create default profile with new DB
      await createDefaultProfile(masterDb);
      return;
    }

    // 4. Migrate existing budgetize.db to profile_1.db
    log('Migrating existing budgetize.db to profile system...');

    const newDbPath = `${uri}/SQLite/profile_1.db`;
    const newDbFile = new File(newDbPath);

    // Check if profile_1.db already exists
    if (newDbFile.exists) {
      logWarn('⚠ profile_1.db already exists, skipping file migration');
    } else {
      // Copy budgetize.db to profile_1.db
      try {
        legacyDbFile.copy(newDbFile);
        log('✓ Copied budgetize.db to profile_1.db');
      } catch (error) {
        logError('Error copying database file:', error);
        throw error;
      }
    }

    // 5. Create "Personal" profile entry
    await createPersonalProfile(masterDb, 'profile_1.db');

    log('✓ Profile migration completed successfully');
  } catch (error) {
    logError('Error during profile migration:', error);
    throw error;
  }
}

/**
 * Create default "Personal" profile with a new database
 */
async function createDefaultProfile(masterDb: SQLite.SQLiteDatabase): Promise<void> {
  const profileId = 1;
  const dbPath = `profile_${profileId}.db`;

  // Insert profile entry
  await masterDb.runAsync(
    `INSERT INTO profiles (id, name, db_path, created_at, updated_at)
     VALUES (?, ?, ?, datetime('now'), datetime('now'))`,
    [profileId, 'Personal', dbPath]
  );

  // Create and initialize the database file
  try {
    const db = await SQLite.openDatabaseAsync(dbPath);
    await runMigrations(db);
    await db.closeAsync();
    log('✓ Created and initialized default "Personal" profile database');
  } catch (error) {
    logError('Error creating default profile database:', error);
    throw error;
  }

  log('✓ Created default "Personal" profile');
}

/**
 * Create "Personal" profile entry for migrated database
 */
async function createPersonalProfile(
  masterDb: SQLite.SQLiteDatabase,
  dbPath: string
): Promise<void> {
  const profileId = 1;

  // Insert profile entry
  await masterDb.runAsync(
    `INSERT INTO profiles (id, name, db_path, created_at, updated_at)
     VALUES (?, ?, ?, datetime('now'), datetime('now'))`,
    [profileId, 'Personal', dbPath]
  );

  log('✓ Created "Personal" profile for migrated database');
}

