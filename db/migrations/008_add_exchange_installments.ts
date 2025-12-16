import { log, logError } from '@/utils/logger';
import * as SQLite from 'expo-sqlite';

/**
 * Migration: Add exchange_installments table for tracking partial payments
 * This allows users to track multiple payments toward a single exchange
 */
export async function addExchangeInstallmentsTable(db: SQLite.SQLiteDatabase): Promise<void> {
  log('Running migration: 008_add_exchange_installments');

  try {
    // Check if table already exists
    const tableInfo = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='exchange_installments'"
    );
    
    if (tableInfo.length > 0) {
      log('exchange_installments table already exists - verifying structure');
      
      const columns = await db.getAllAsync<{ name: string; type: string }>(
        "PRAGMA table_info(exchange_installments)"
      );
      
      const hasRequiredColumns = columns.some(c => c.name === 'exchange_id') &&
                                 columns.some(c => c.name === 'amount') &&
                                 columns.some(c => c.name === 'payment_date');
      
      if (hasRequiredColumns) {
        log('exchange_installments table exists with correct structure');
        return;
      } else {
        log('exchange_installments table exists but structure is incorrect - will recreate');
        await db.execAsync('DROP TABLE IF EXISTS exchange_installments');
      }
    }

    log('Creating exchange_installments table');

    await db.execAsync('BEGIN TRANSACTION');

    await db.execAsync(`
      CREATE TABLE exchange_installments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        exchange_id INTEGER NOT NULL,
        amount TEXT NOT NULL,
        payment_date TEXT NOT NULL,
        note TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        deleted_at TEXT,
        remote_id TEXT,
        is_synced INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (exchange_id) REFERENCES exchanges(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for better query performance
    log('Creating indexes for exchange_installments...');
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_exchange_installments_exchange_id ON exchange_installments(exchange_id);
      CREATE INDEX IF NOT EXISTS idx_exchange_installments_payment_date ON exchange_installments(payment_date);
      CREATE INDEX IF NOT EXISTS idx_exchange_installments_deleted_at ON exchange_installments(deleted_at);
      CREATE INDEX IF NOT EXISTS idx_exchange_installments_exchange_deleted ON exchange_installments(exchange_id, deleted_at);
    `);

    await db.execAsync('COMMIT');
    log('Transaction committed');

    // Verify table was created
    const verifyTable = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='exchange_installments'"
    );
    
    if (verifyTable.length === 0) {
      logError('CRITICAL: Table verification failed - exchange_installments table not found after creation!');
      throw new Error('exchange_installments table was not created successfully');
    }
    
    log(`Table verification successful - exchange_installments table exists`);
    log('Successfully created exchange_installments table and indexes');
  } catch (error) {
    logError('Error in addExchangeInstallmentsTable migration:', error);
    try {
      await db.execAsync('ROLLBACK');
      log('Transaction rolled back');
    } catch (rollbackError) {
      logError('Error during rollback:', rollbackError);
    }
    throw error;
  }
}

