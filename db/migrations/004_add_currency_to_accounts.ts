import * as SQLite from 'expo-sqlite';

/**
 * Migration: Add currency field to accounts table
 * This allows each account to have its own currency
 */
export async function addCurrencyToAccounts(db: SQLite.SQLiteDatabase): Promise<void> {
  console.log('Running migration: 004_add_currency_to_accounts');

  // Check if currency column already exists
  const tableInfo = await db.getAllAsync<{ name: string }>(
    'PRAGMA table_info(accounts)'
  );
  const hasCurrency = tableInfo.some((col) => col.name === 'currency');

  if (!hasCurrency) {
    // Add currency column with default value 'USD'
    await db.execAsync(
      "ALTER TABLE accounts ADD COLUMN currency TEXT NOT NULL DEFAULT 'USD'"
    );
    console.log('Added currency column to accounts table');
  } else {
    console.log('Currency column already exists in accounts table');
  }
}

