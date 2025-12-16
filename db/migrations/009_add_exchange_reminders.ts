import { log, logError } from '@/utils/logger';
import * as SQLite from 'expo-sqlite';

/**
 * Migration: Add exchange_reminders table for tracking reminders
 * This allows users to set reminders for exchanges with due dates
 */
export async function addExchangeRemindersTable(db: SQLite.SQLiteDatabase): Promise<void> {
  log('Running migration: 009_add_exchange_reminders');

  try {
    // Check if table already exists
    const tableInfo = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='exchange_reminders'"
    );
    
    if (tableInfo.length > 0) {
      log('exchange_reminders table already exists - verifying structure');
      
      const columns = await db.getAllAsync<{ name: string; type: string }>(
        "PRAGMA table_info(exchange_reminders)"
      );
      
      const hasRequiredColumns = columns.some(c => c.name === 'exchange_id') &&
                                 columns.some(c => c.name === 'reminder_type') &&
                                 columns.some(c => c.name === 'reminder_date');
      
      if (hasRequiredColumns) {
        log('exchange_reminders table exists with correct structure');
        return;
      } else {
        log('exchange_reminders table exists but structure is incorrect - will recreate');
        await db.execAsync('DROP TABLE IF EXISTS exchange_reminders');
      }
    }

    log('Creating exchange_reminders table');

    await db.execAsync('BEGIN TRANSACTION');

    await db.execAsync(`
      CREATE TABLE exchange_reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        exchange_id INTEGER NOT NULL,
        reminder_type TEXT NOT NULL CHECK(reminder_type IN ('due_date', 'overdue', 'periodic')),
        reminder_date TEXT NOT NULL,
        is_sent INTEGER NOT NULL DEFAULT 0,
        notification_id TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        deleted_at TEXT,
        remote_id TEXT,
        is_synced INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (exchange_id) REFERENCES exchanges(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for better query performance
    log('Creating indexes for exchange_reminders...');
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_exchange_reminders_exchange_id ON exchange_reminders(exchange_id);
      CREATE INDEX IF NOT EXISTS idx_exchange_reminders_reminder_date ON exchange_reminders(reminder_date);
      CREATE INDEX IF NOT EXISTS idx_exchange_reminders_is_sent ON exchange_reminders(is_sent);
      CREATE INDEX IF NOT EXISTS idx_exchange_reminders_deleted_at ON exchange_reminders(deleted_at);
      CREATE INDEX IF NOT EXISTS idx_exchange_reminders_date_sent ON exchange_reminders(reminder_date, is_sent, deleted_at);
    `);

    await db.execAsync('COMMIT');
    log('Transaction committed');

    // Verify table was created
    const verifyTable = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='exchange_reminders'"
    );
    
    if (verifyTable.length === 0) {
      logError('CRITICAL: Table verification failed - exchange_reminders table not found after creation!');
      throw new Error('exchange_reminders table was not created successfully');
    }
    
    log(`Table verification successful - exchange_reminders table exists`);
    log('Successfully created exchange_reminders table and indexes');
  } catch (error) {
    logError('Error in addExchangeRemindersTable migration:', error);
    try {
      await db.execAsync('ROLLBACK');
      log('Transaction rolled back');
    } catch (rollbackError) {
      logError('Error during rollback:', rollbackError);
    }
    throw error;
  }
}

