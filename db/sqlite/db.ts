import { log, logError } from '@/utils/logger';
import * as SQLite from 'expo-sqlite';
import { runMigrations } from '../migrations/runner';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let openingPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let connectionGate: Promise<void> = Promise.resolve();

/**
 * Serializes open/close/reinitialize so a connection is never released
 * while another caller is still opening or closing it.
 */
function runExclusive<T>(operation: () => Promise<T>): Promise<T> {
  const result = connectionGate.then(operation, operation);
  connectionGate = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

async function verifyExchangesTable(db: SQLite.SQLiteDatabase): Promise<void> {
  const verifyResult = await db.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='exchanges' LIMIT 1",
  );

  if (verifyResult.length === 0) {
    logError('CRITICAL: Exchanges table not found after migrations!');
    throw new Error('Exchanges table was not created by migrations');
  }
}

async function openDatabaseConnection(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync('budgetize.db');
  log('Database opened, running migrations...');
  await runMigrations(db);
  log('Migrations completed successfully');
  await verifyExchangesTable(db);
  log('Verified: exchanges table exists');
  return db;
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  return runExclusive(async () => {
    if (dbInstance) {
      return dbInstance;
    }

    if (openingPromise) {
      return openingPromise;
    }

    openingPromise = (async () => {
      try {
        const db = await openDatabaseConnection();
        dbInstance = db;
        return db;
      } catch (error) {
        logError('Error opening database or running migrations:', error);
        throw error;
      } finally {
        openingPromise = null;
      }
    })();

    return openingPromise;
  });
}

export async function closeDatabase(): Promise<void> {
  return runExclusive(async () => {
    if (openingPromise) {
      await openingPromise.catch(() => undefined);
    }

    if (dbInstance) {
      await dbInstance.closeAsync();
      dbInstance = null;
    }

    openingPromise = null;
  });
}

/**
 * Force re-initialize the database connection and re-run migrations.
 * Serialized with other connection lifecycle operations.
 */
export async function reinitializeDatabase(): Promise<SQLite.SQLiteDatabase> {
  return runExclusive(async () => {
    log('Forcing database re-initialization...');

    if (openingPromise) {
      await openingPromise.catch(() => undefined);
    }

    if (dbInstance) {
      await dbInstance.closeAsync();
      dbInstance = null;
    }

    openingPromise = null;

    const db = await openDatabaseConnection();
    dbInstance = db;
    return db;
  });
}
