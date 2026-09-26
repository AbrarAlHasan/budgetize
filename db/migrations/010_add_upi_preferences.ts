import { log, logError } from "@/utils/logger";
import * as SQLite from "expo-sqlite";

/**
 * Migration 010: Create upi_preferences table.
 *
 * Stores the last-used category, note, payment mode, and tags for each
 * unique UPI ID so that the next transaction to the same payee can be
 * auto-filled.
 *
 * The `upi_id` column is UNIQUE — an INSERT OR REPLACE (upsert) overwrites
 * existing preferences whenever a new transaction is created.
 *
 * `tag_ids` is stored as a JSON array string (e.g. "[1,3,7]") since SQLite
 * doesn't support array columns and we always read/write the full set.
 */
export async function addUpiPreferences(
  db: SQLite.SQLiteDatabase,
): Promise<void> {
  log("Starting migration 010_add_upi_preferences...");

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS upi_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      upi_id TEXT NOT NULL UNIQUE,
      category_id INTEGER,
      note TEXT,
      payment_mode TEXT,
      tag_ids TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE INDEX IF NOT EXISTS idx_upi_preferences_upi_id ON upi_preferences(upi_id);
  `);

  log("Migration 010_add_upi_preferences completed.");
}
