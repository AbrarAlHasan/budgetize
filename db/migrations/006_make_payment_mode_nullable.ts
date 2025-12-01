import { log } from '@/utils/logger';
import * as SQLite from 'expo-sqlite';

/**
 * Migration: Make payment_mode nullable in transactions table
 * This allows transactions to be created without a payment mode
 */
export async function makePaymentModeNullable(db: SQLite.SQLiteDatabase): Promise<void> {
  log('Running migration: 006_make_payment_mode_nullable');

  // SQLite doesn't support ALTER COLUMN directly, so we need to:
  // 1. Create a new table with the updated schema
  // 2. Copy data from old table to new table
  // 3. Drop old table
  // 4. Rename new table to original name
  // 5. Recreate indexes

  // Check if payment_mode is already nullable
  const tableInfo = await db.getAllAsync<{ name: string; notnull: number }>(
    'PRAGMA table_info(transactions)'
  );
  const paymentModeColumn = tableInfo.find((col) => col.name === 'payment_mode');
  
  if (paymentModeColumn && paymentModeColumn.notnull === 0) {
    log('Payment mode column is already nullable');
    return;
  }

  log('Making payment_mode nullable in transactions table');

  // Start transaction
  await db.execAsync('BEGIN TRANSACTION');

  try {
    // Create new table with nullable payment_mode
    await db.execAsync(`
      CREATE TABLE transactions_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL,
        amount TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('expense', 'income')),
        date TEXT NOT NULL,
        note TEXT,
        payment_mode TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        deleted_at TEXT,
        remote_id TEXT,
        is_synced INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (account_id) REFERENCES accounts(id)
      )
    `);

    // Copy data from old table to new table
    await db.execAsync(`
      INSERT INTO transactions_new 
      (id, account_id, amount, type, date, note, payment_mode, created_at, updated_at, deleted_at, remote_id, is_synced)
      SELECT 
        id, account_id, amount, type, date, note, payment_mode, created_at, updated_at, deleted_at, remote_id, is_synced
      FROM transactions
    `);

    // Drop old table
    await db.execAsync('DROP TABLE transactions');

    // Rename new table to original name
    await db.execAsync('ALTER TABLE transactions_new RENAME TO transactions');

    // Recreate indexes
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
      CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
      CREATE INDEX IF NOT EXISTS idx_transactions_deleted_at ON transactions(deleted_at);
    `);

    await db.execAsync('COMMIT');
    log('Successfully made payment_mode nullable in transactions table');
  } catch (error) {
    await db.execAsync('ROLLBACK');
    log(`Error making payment_mode nullable: ${error}`);
    throw error;
  }
}

