import * as SQLite from 'expo-sqlite';
import { runMigrations } from '../migrations/runner';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let openingPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  if (openingPromise) {
    return openingPromise;
  }

  openingPromise = (async () => {
    const db = await SQLite.openDatabaseAsync('budgetize.db');
    await runMigrations(db);
    dbInstance = db;
    openingPromise = null;
    return db;
  })();

  return openingPromise;
}

export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.closeAsync();
    dbInstance = null;
  }
}

