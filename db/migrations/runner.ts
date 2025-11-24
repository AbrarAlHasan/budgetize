import * as SQLite from 'expo-sqlite';
import { encryptExistingData } from './003_encrypt_existing_data';
import { addCurrencyToAccounts } from './004_add_currency_to_accounts';

const INITIAL_SCHEMA_SQL = `
-- Accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('debit', 'credit', 'borrowed', 'lent')),
  bank_name TEXT,
  credit_limit REAL,
  billing_start_date TEXT,
  billing_end_date TEXT,
  payment_due_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  remote_id TEXT,
  is_synced INTEGER NOT NULL DEFAULT 0
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,
  amount TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('expense', 'income')),
  date TEXT NOT NULL,
  note TEXT,
  payment_mode TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  remote_id TEXT,
  is_synced INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  remote_id TEXT,
  is_synced INTEGER NOT NULL DEFAULT 0
);

-- Transaction tags junction table
CREATE TABLE IF NOT EXISTS transaction_tags (
  transaction_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (transaction_id, tag_id),
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_deleted_at ON transactions(deleted_at);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(type);
CREATE INDEX IF NOT EXISTS idx_accounts_deleted_at ON accounts(deleted_at);
CREATE INDEX IF NOT EXISTS idx_tags_deleted_at ON tags(deleted_at);
CREATE INDEX IF NOT EXISTS idx_transaction_tags_transaction_id ON transaction_tags(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_tags_tag_id ON transaction_tags(tag_id);
`;

const CATEGORIES_MIGRATION_SQL = `
-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  remote_id TEXT,
  is_synced INTEGER NOT NULL DEFAULT 0
);

-- Insert default categories
INSERT OR IGNORE INTO categories (name) VALUES ('Food');
INSERT OR IGNORE INTO categories (name) VALUES ('Transport');
INSERT OR IGNORE INTO categories (name) VALUES ('Medicine');
INSERT OR IGNORE INTO categories (name) VALUES ('Shopping');
INSERT OR IGNORE INTO categories (name) VALUES ('Entertainment');
INSERT OR IGNORE INTO categories (name) VALUES ('Bills');
INSERT OR IGNORE INTO categories (name) VALUES ('Education');
INSERT OR IGNORE INTO categories (name) VALUES ('Other');

-- Index for better query performance
CREATE INDEX IF NOT EXISTS idx_categories_deleted_at ON categories(deleted_at);
`;

const MIGRATIONS = [
  {
    version: 1,
    name: '001_initial_schema',
    sql: INITIAL_SCHEMA_SQL,
  },
  {
    version: 2,
    name: '002_add_categories',
    sql: CATEGORIES_MIGRATION_SQL,
  },
];

export async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  // Create migrations table to track which migrations have been run
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Get applied migrations
  const result = await db.getAllAsync<{ version: number }>(
    'SELECT version FROM schema_migrations ORDER BY version'
  );
  const appliedVersions = new Set(result.map((r) => Number(r.version)));

  // Run pending migrations
  for (const migration of MIGRATIONS) {
    if (!appliedVersions.has(migration.version)) {
      try {
        // Special handling for migration 2 (add categories)
        if (migration.version === 2) {
          // Execute the migration SQL (creates categories table, inserts defaults, creates indexes)
          await db.execAsync(migration.sql);
          
          // Check if category_id column already exists, if not add it
          const tableInfo = await db.getAllAsync<{ name: string }>(
            "PRAGMA table_info(transactions)"
          );
          const hasCategoryId = tableInfo.some(col => col.name === 'category_id');
          
          if (!hasCategoryId) {
            // Add category_id column to transactions
            try {
              await db.execAsync('ALTER TABLE transactions ADD COLUMN category_id INTEGER REFERENCES categories(id)');
            } catch (e: any) {
              const message = e?.message ?? String(e);
              // Ignore if another concurrent runner added the column first
              if (!message.includes('duplicate column name: category_id')) {
                throw e;
              }
            }
            // Create index for category_id
            await db.execAsync('CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id)');
          }
        } else {
          // Execute migration normally
          await db.execAsync(migration.sql);
        }
        
        // Record migration
        await db.runAsync(
          'INSERT OR IGNORE INTO schema_migrations (version, name) VALUES (?, ?)',
          [migration.version, migration.name]
        );
        
        log(`Migration ${migration.name} applied successfully`);
      } catch (error) {
        logError(`Error applying migration ${migration.name}:`, error);
        throw error;
      }
    }
  }

  // Run data migration 3 (encrypt existing data)
  if (!appliedVersions.has(3)) {
    try {
      await encryptExistingData(db);
      
      // Record migration
      await db.runAsync(
        'INSERT OR IGNORE INTO schema_migrations (version, name) VALUES (?, ?)',
        [3, '003_encrypt_existing_data']
      );
      
      log('Migration 003_encrypt_existing_data applied successfully');
    } catch (error) {
      logError('Error applying migration 003_encrypt_existing_data:', error);
      throw error;
    }
  }

  // Run migration 4 (add currency to accounts)
  if (!appliedVersions.has(4)) {
    try {
      await addCurrencyToAccounts(db);
      
      // Record migration
      await db.runAsync(
        'INSERT OR IGNORE INTO schema_migrations (version, name) VALUES (?, ?)',
        [4, '004_add_currency_to_accounts']
      );
      
      log('Migration 004_add_currency_to_accounts applied successfully');
    } catch (error) {
      logError('Error applying migration 004_add_currency_to_accounts:', error);
      throw error;
    }
  }

  // Run migration 5 (add composite indexes for performance)
  if (!appliedVersions.has(5)) {
    try {
      const compositeIndexesSQL = `
-- Composite indexes for better query performance on large datasets
-- These indexes help with common query patterns in reports

-- Index for date range queries with deleted_at filter (most common pattern)
CREATE INDEX IF NOT EXISTS idx_transactions_date_deleted ON transactions(date, deleted_at);

-- Index for date range queries with deleted_at and type filter
CREATE INDEX IF NOT EXISTS idx_transactions_date_deleted_type ON transactions(date, deleted_at, type);

-- Index for account_id + date queries (common in reports)
CREATE INDEX IF NOT EXISTS idx_transactions_account_date ON transactions(account_id, date, deleted_at);

-- Index for category_id + date queries
CREATE INDEX IF NOT EXISTS idx_transactions_category_date ON transactions(category_id, date, deleted_at);

-- Index for type + date queries (for filtering expenses/income)
CREATE INDEX IF NOT EXISTS idx_transactions_type_date ON transactions(type, date, deleted_at);
      `;
      
      await db.execAsync(compositeIndexesSQL);
      
      // Record migration
      await db.runAsync(
        'INSERT OR IGNORE INTO schema_migrations (version, name) VALUES (?, ?)',
        [5, '005_add_composite_indexes']
      );
      
      log('Migration 005_add_composite_indexes applied successfully');
    } catch (error) {
      logError('Error applying migration 005_add_composite_indexes:', error);
      throw error;
    }
  }
}

