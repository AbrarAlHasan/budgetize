import { getDatabase } from '@/db/sqlite/db';
import { useProfileStore } from '@/store/profile-store';
import { log, logError } from '@/utils/logger';

/**
 * Clears all data for the active profile from the database
 * This will delete all transactions, accounts, categories, tags, transaction_tags,
 * exchanges, exchange_installments, and exchange_reminders for the active profile only
 * 
 * @param profileId - Optional profile ID. If not provided, uses the active profile from the store
 * @returns Promise that resolves when database is cleared
 */
export async function clearDatabase(profileId?: number): Promise<void> {
  const db = await getDatabase();
  
  // Get profile ID - use provided one or get from store
  let activeProfileId = profileId;
  if (!activeProfileId) {
    activeProfileId = useProfileStore.getState().activeProfileId;
  }
  
  if (!activeProfileId) {
    throw new Error('No active profile found. Cannot clear data.');
  }

  const tables = [
    'transaction_tags',
    'transactions',
    'accounts',
    'tags',
    'categories',
    'exchanges',
    'exchange_installments',
    'exchange_reminders',
  ];

  // Use transaction for atomicity
  await db.execAsync('BEGIN TRANSACTION');
  
  try {
    for (const table of tables) {
      // Check if table exists before trying to delete
      const tableExists = await db.getAllAsync<{ name: string }>(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='${table}' LIMIT 1`
      );
      
      if (tableExists.length === 0) {
        log(`⚠ Table ${table} does not exist, skipping`);
        continue;
      }
      
      // Check if table has profile_id column
      const tableInfo = await db.getAllAsync<{ name: string }>(
        `PRAGMA table_info(${table})`
      );
      const hasProfileId = tableInfo.some((col) => col.name === 'profile_id');
      
      if (!hasProfileId) {
        log(`⚠ Table ${table} does not have profile_id column, skipping`);
        continue;
      }
      
      // Delete only data for the active profile
      const result = await db.runAsync(
        `DELETE FROM ${table} WHERE profile_id = ?`,
        [activeProfileId]
      );
      log(`✓ Cleared ${result.changes || 0} rows from ${table}`);
    }
    await db.execAsync('COMMIT');
    log(`✓ Successfully cleared all data for profile ${activeProfileId}`);
  } catch (error) {
    await db.execAsync('ROLLBACK');
    logError('Error clearing database:', error);
    throw error;
  }
}

/**
 * Clears ALL data from ALL profiles (use with extreme caution!)
 * This will delete all transactions, accounts, categories, tags, transaction_tags,
 * exchanges, exchange_installments, and exchange_reminders from ALL profiles
 * 
 * @returns Promise that resolves when database is cleared
 */
export async function clearAllProfilesData(): Promise<void> {
  const db = await getDatabase();
  const tables = [
    'transaction_tags',
    'transactions',
    'accounts',
    'tags',
    'categories',
    'exchanges',
    'exchange_installments',
    'exchange_reminders',
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

