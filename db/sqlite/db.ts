import * as SQLite from 'expo-sqlite';
import { runMigrations } from '../migrations/runner';
import { log, logError } from '@/utils/logger';

// Map of profileId -> database instance
const dbInstances = new Map<number, SQLite.SQLiteDatabase>();
// Map of profileId -> opening promise (to prevent concurrent opens)
const openingPromises = new Map<number, Promise<SQLite.SQLiteDatabase>>();

// Currently active profile ID
let activeProfileId: number | null = null;

/**
 * Set the active profile ID
 * @param profileId - Profile ID to set as active
 */
export function setActiveProfileId(profileId: number | null): void {
  activeProfileId = profileId;
}

/**
 * Get the active profile ID
 * @returns The currently active profile ID or null
 */
export function getActiveProfileId(): number | null {
  return activeProfileId;
}

/**
 * Get database for a specific profile
 * @param profileId - Profile ID (optional, uses current profile from store if not provided)
 */
export async function getDatabase(profileId?: number): Promise<SQLite.SQLiteDatabase> {
  // If no profileId provided, use activeProfileId or get from store
  let targetProfileId = profileId;
  
  if (!targetProfileId) {
    // First try to use the activeProfileId from this module
    if (activeProfileId !== null) {
      targetProfileId = activeProfileId;
    } else {
      // Fallback to store if activeProfileId is not set
      const { useProfileStore } = await import('@/store/profile-store');
      const currentProfileId = useProfileStore.getState().currentProfileId;
      targetProfileId = currentProfileId ?? 1; // Default to profile 1 if no profile selected
      // Sync activeProfileId with store value
      activeProfileId = currentProfileId;
    }
  }

  // Return existing instance if available
  const existingInstance = dbInstances.get(targetProfileId);
  if (existingInstance) {
    return existingInstance;
  }

  // Return existing opening promise if available
  const existingPromise = openingPromises.get(targetProfileId);
  if (existingPromise) {
    return existingPromise;
  }

  // Create new opening promise
  const promise = (async () => {
    try {
      const dbFileName = `profile_${targetProfileId}.db`;
      const db = await SQLite.openDatabaseAsync(dbFileName);
      await runMigrations(db);
      dbInstances.set(targetProfileId, db);
      openingPromises.delete(targetProfileId);
      log(`✓ Opened database for profile ${targetProfileId}: ${dbFileName}`);
      return db;
    } catch (error) {
      openingPromises.delete(targetProfileId);
      logError(`Error opening database for profile ${targetProfileId}:`, error);
      throw error;
    }
  })();

  openingPromises.set(targetProfileId, promise);
  return promise;
}

/**
 * Close database for a specific profile
 * @param profileId - Profile ID (optional, closes all if not provided)
 */
export async function closeDatabase(profileId?: number): Promise<void> {
  if (profileId !== undefined) {
    const db = dbInstances.get(profileId);
    if (db) {
      await db.closeAsync();
      dbInstances.delete(profileId);
      log(`✓ Closed database for profile ${profileId}`);
    }
  } else {
    // Close all databases
    const closePromises = Array.from(dbInstances.entries()).map(async ([id, db]) => {
      await db.closeAsync();
      log(`✓ Closed database for profile ${id}`);
    });
    await Promise.all(closePromises);
    dbInstances.clear();
    openingPromises.clear();
  }
}

/**
 * Switch to a different profile (closes old, opens new)
 * @param newProfileId - Profile ID to switch to
 */
export async function switchProfile(newProfileId: number): Promise<SQLite.SQLiteDatabase> {
  // Set active profile ID first
  activeProfileId = newProfileId;
  
  // Close all existing databases
  await closeDatabase();
  
  // Open new profile database
  return getDatabase(newProfileId);
}

