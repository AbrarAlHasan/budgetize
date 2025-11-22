import { getDatabase } from '@/db/sqlite/db';

/**
 * Clears all data from the database
 * This will delete all transactions, accounts, categories, tags, and transaction_tags
 * 
 * @returns Promise that resolves when database is cleared
 */
export async function clearDatabase(): Promise<void> {
  const db = await getDatabase();
  const tables = [
    'transaction_tags',
    'transactions',
    'accounts',
    'tags',
    'categories',
  ];

  // Use transaction for atomicity
  await db.execAsync('BEGIN TRANSACTION');
  
  try {
    for (const table of tables) {
      await db.runAsync(`DELETE FROM ${table}`);
    }
    await db.execAsync('COMMIT');
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  }
}

