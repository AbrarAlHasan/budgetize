import { log, logError } from '@/utils/logger';
import * as SQLite from 'expo-sqlite';

/**
 * Migration: Add exchanges table for tracking money lent and borrowed
 * This allows users to track exchanges separately from transactions
 */
export async function addExchangesTable(db: SQLite.SQLiteDatabase): Promise<void> {
  log('Running migration: 007_add_exchanges_table');

  try {
    // Check if exchanges table already exists
    const tableInfo = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='exchanges'"
    );
    
    log(`Table check result: ${tableInfo.length} tables found with name 'exchanges'`);
    
    if (tableInfo.length > 0) {
      log('Exchanges table already exists - verifying structure');
      
      // Verify the table has the correct structure by checking for key columns
      const columns = await db.getAllAsync<{ name: string; type: string }>(
        "PRAGMA table_info(exchanges)"
      );
      log(`Found ${columns.length} columns in exchanges table`);
      
      const hasRequiredColumns = columns.some(c => c.name === 'person_name') &&
                                 columns.some(c => c.name === 'amount') &&
                                 columns.some(c => c.name === 'type') &&
                                 columns.some(c => c.name === 'status');
      
      if (hasRequiredColumns) {
        log('Exchanges table exists with correct structure');
        return;
      } else {
        log('Exchanges table exists but structure is incorrect - will recreate');
        // Drop and recreate if structure is wrong
        await db.execAsync('DROP TABLE IF EXISTS exchanges');
        log('Dropped existing exchanges table');
      }
    }

    log('Creating exchanges table');

    // Start transaction
    await db.execAsync('BEGIN TRANSACTION');
    log('Transaction started');

    // Create exchanges table
    log('Executing CREATE TABLE statement...');
    await db.execAsync(`
      CREATE TABLE exchanges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        person_name TEXT NOT NULL,
        amount TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('lent', 'borrowed')),
        status TEXT NOT NULL CHECK(status IN ('pending', 'paid', 'received')) DEFAULT 'pending',
        date TEXT NOT NULL,
        due_date TEXT,
        note TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        deleted_at TEXT,
        remote_id TEXT,
        is_synced INTEGER NOT NULL DEFAULT 0
      )
    `);
    log('CREATE TABLE statement executed successfully');

    // Create indexes for better query performance
    log('Creating indexes...');
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_exchanges_type ON exchanges(type);
      CREATE INDEX IF NOT EXISTS idx_exchanges_status ON exchanges(status);
      CREATE INDEX IF NOT EXISTS idx_exchanges_date ON exchanges(date);
      CREATE INDEX IF NOT EXISTS idx_exchanges_deleted_at ON exchanges(deleted_at);
      CREATE INDEX IF NOT EXISTS idx_exchanges_type_status ON exchanges(type, status, deleted_at);
      CREATE INDEX IF NOT EXISTS idx_exchanges_date_deleted ON exchanges(date, deleted_at);
    `);
    log('Indexes created successfully');

    await db.execAsync('COMMIT');
    log('Transaction committed');

    // Verify table was created
    const verifyTable = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='exchanges'"
    );
    
    if (verifyTable.length === 0) {
      logError('CRITICAL: Table verification failed - exchanges table not found after creation!');
      throw new Error('Exchanges table was not created successfully');
    }
    
    log(`Table verification successful - exchanges table exists (${verifyTable.length} found)`);
    log('Successfully created exchanges table and indexes');
  } catch (error) {
    logError('Error in addExchangesTable migration:', error);
    try {
      await db.execAsync('ROLLBACK');
      log('Transaction rolled back');
    } catch (rollbackError) {
      logError('Error during rollback:', rollbackError);
    }
    throw error;
  }
}

