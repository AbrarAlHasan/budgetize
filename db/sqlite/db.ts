import { log, logError } from '@/utils/logger';
import * as SQLite from 'expo-sqlite';
import { runMigrations } from '../migrations/runner';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let openingPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    // Verify exchanges table exists even if database is cached
    try {
      await dbInstance.getAllAsync("SELECT name FROM sqlite_master WHERE type='table' AND name='exchanges' LIMIT 1");
    } catch (error) {
      logError('Error checking exchanges table:', error);
      // If check fails, force re-run migrations
      log('Forcing migration re-run due to table check failure');
      await closeDatabase();
      // Fall through to reopen
    }
    
    // Double-check: if exchanges table doesn't exist, force migration
    try {
      const result = await dbInstance.getAllAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='exchanges' LIMIT 1"
      );
      if (result.length === 0) {
        log('Exchanges table missing - forcing migration re-run');
        await closeDatabase();
        // Fall through to reopen
      } else {
        return dbInstance;
      }
    } catch (error) {
      logError('Error verifying exchanges table:', error);
      await closeDatabase();
      // Fall through to reopen
    }
  }

  if (openingPromise) {
    return openingPromise;
  }

  openingPromise = (async () => {
    try {
      const db = await SQLite.openDatabaseAsync('budgetize.db');
      log('Database opened, running migrations...');
      await runMigrations(db);
      log('Migrations completed successfully');
      
      // Verify exchanges table was created
      const verifyResult = await db.getAllAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='exchanges' LIMIT 1"
      );
      if (verifyResult.length === 0) {
        logError('CRITICAL: Exchanges table not found after migrations!');
        throw new Error('Exchanges table was not created by migrations');
      }
      log('Verified: exchanges table exists');
      
      dbInstance = db;
      openingPromise = null;
      return db;
    } catch (error) {
      logError('Error opening database or running migrations:', error);
      openingPromise = null;
      throw error;
    }
  })();

  return openingPromise;
}

export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.closeAsync();
    dbInstance = null;
  }
  openingPromise = null;
}

/**
 * Force re-initialize the database connection and re-run migrations
 * Useful when migrations are added or updated
 */
export async function reinitializeDatabase(): Promise<SQLite.SQLiteDatabase> {
  log('Forcing database re-initialization...');
  await closeDatabase();
  return getDatabase();
}

