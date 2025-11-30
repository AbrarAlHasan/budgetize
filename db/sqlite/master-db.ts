import * as SQLite from 'expo-sqlite';
import { log, logError } from '@/utils/logger';

let masterDbInstance: SQLite.SQLiteDatabase | null = null;
let masterOpeningPromise: Promise<SQLite.SQLiteDatabase> | null = null;

const PROFILES_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  description TEXT,
  db_path TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_profiles_db_path ON profiles(db_path);
`;

/**
 * Get the master database instance (singleton)
 * Master DB stores profile registry only, no transaction data
 */
export async function getMasterDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (masterDbInstance) {
    return masterDbInstance;
  }

  if (masterOpeningPromise) {
    return masterOpeningPromise;
  }

  masterOpeningPromise = (async () => {
    try {
      const db = await SQLite.openDatabaseAsync('master.db');
      await initializeMasterDatabase(db);
      masterDbInstance = db;
      masterOpeningPromise = null;
      log('✓ Master database initialized');
      return db;
    } catch (error) {
      logError('Error opening master database:', error);
      masterOpeningPromise = null;
      throw error;
    }
  })();

  return masterOpeningPromise;
}

/**
 * Initialize master database schema
 */
export async function initializeMasterDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    await db.execAsync(PROFILES_TABLE_SQL);
    log('✓ Master database schema initialized');
  } catch (error) {
    logError('Error initializing master database schema:', error);
    throw error;
  }
}

/**
 * Close the master database connection
 */
export async function closeMasterDatabase(): Promise<void> {
  if (masterDbInstance) {
    await masterDbInstance.closeAsync();
    masterDbInstance = null;
    log('✓ Master database closed');
  }
}

