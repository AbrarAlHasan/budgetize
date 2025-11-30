import * as SQLite from 'expo-sqlite';
import { getMasterDatabase } from '@/db/sqlite/master-db';
import { getDatabase, switchProfile } from '@/db/sqlite/db';
import { runMigrations } from '@/db/migrations/runner';
import { log, logError } from '@/utils/logger';
import { Profile } from '@/store/profile-store';
import { File, Directory, Paths } from 'expo-file-system';

interface CreateProfileInput {
  name: string;
  icon?: string | null;
  color?: string | null;
  description?: string | null;
}

interface UpdateProfileInput {
  name?: string;
  icon?: string | null;
  color?: string | null;
  description?: string | null;
}

export class ProfileRepository {
  protected tableName = 'profiles';
  protected primaryKey = 'id';

  /**
   * Get master database (not profile database)
   */
  protected async getMasterDb(): Promise<SQLite.SQLiteDatabase> {
    return getMasterDatabase();
  }

  /**
   * Find profile by ID
   */
  async findById(id: number): Promise<Profile | null> {
    const db = await this.getMasterDb();
    const results = await db.getAllAsync<Profile>(
      `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = ?`,
      [id]
    );
    return results[0] || null;
  }

  /**
   * Find all profiles
   */
  async findAll(): Promise<Profile[]> {
    const db = await this.getMasterDb();
    return db.getAllAsync<Profile>(
      `SELECT * FROM ${this.tableName} ORDER BY created_at ASC`
    );
  }

  /**
   * Find default profile (Personal or first profile)
   */
  async findDefaultProfile(): Promise<Profile | null> {
    const profiles = await this.findAll();
    return profiles.find((p) => p.name === 'Personal') || profiles[0] || null;
  }

  /**
   * Get database file path for a profile
   */
  async getProfileDbPath(profileId: number): Promise<string | null> {
    const profile = await this.findById(profileId);
    return profile?.db_path || null;
  }

  /**
   * Create a new profile
   * This creates:
   * 1. Profile entry in master.db
   * 2. New SQLite database file for the profile
   * 3. Runs migrations on the new database
   */
  async create(input: CreateProfileInput): Promise<Profile> {
    const masterDb = await this.getMasterDb();

    // Start transaction
    await masterDb.execAsync('BEGIN TRANSACTION');

    try {
      // Get next profile ID
      const existingProfiles = await this.findAll();
      const nextId = existingProfiles.length > 0 
        ? Math.max(...existingProfiles.map(p => p.id)) + 1 
        : 1;

      const dbPath = `profile_${nextId}.db`;
      const now = new Date().toISOString();

      // Insert profile into master.db
      const result = await masterDb.runAsync(
        `INSERT INTO ${this.tableName} (id, name, icon, color, description, db_path, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          nextId,
          input.name,
          input.icon || null,
          input.color || null,
          input.description || null,
          dbPath,
          now,
          now,
        ]
      );

      // Create and initialize the profile database
      await this.createProfileDatabase(nextId, dbPath);

      await masterDb.execAsync('COMMIT');

      log(`✓ Created profile: ${input.name} (ID: ${nextId})`);

      // Return the created profile
      const profile = await this.findById(nextId);
      if (!profile) {
        throw new Error('Failed to retrieve created profile');
      }

      return profile;
    } catch (error) {
      await masterDb.execAsync('ROLLBACK');
      logError('Error creating profile:', error);
      throw error;
    }
  }

  /**
   * Create and initialize a profile database file
   */
  private async createProfileDatabase(profileId: number, dbPath: string): Promise<void> {
    try {
      // Open the new database (this will create the file)
      const db = await SQLite.openDatabaseAsync(dbPath);
      
      // Run migrations to set up schema
      await runMigrations(db);
      
      // Close the database (it will be reopened when needed)
      await db.closeAsync();
      
      log(`✓ Created and initialized profile database: ${dbPath}`);
    } catch (error) {
      logError(`Error creating profile database ${dbPath}:`, error);
      throw error;
    }
  }

  /**
   * Update profile metadata
   */
  async update(id: number, input: UpdateProfileInput): Promise<void> {
    const db = await this.getMasterDb();
    const now = new Date().toISOString();

    const updates: string[] = [];
    const values: any[] = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      values.push(input.name);
    }
    if (input.icon !== undefined) {
      updates.push('icon = ?');
      values.push(input.icon);
    }
    if (input.color !== undefined) {
      updates.push('color = ?');
      values.push(input.color);
    }
    if (input.description !== undefined) {
      updates.push('description = ?');
      values.push(input.description);
    }

    if (updates.length === 0) {
      return; // No updates
    }

    updates.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await db.runAsync(
      `UPDATE ${this.tableName} SET ${updates.join(', ')} WHERE ${this.primaryKey} = ?`,
      values
    );

    log(`✓ Updated profile: ${id}`);
  }

  /**
   * Delete a profile
   * This removes the profile entry and deletes the associated database file
   */
  async delete(id: number): Promise<void> {
    const db = await this.getMasterDb();

    // Get profile to find db_path
    const profile = await this.findById(id);
    if (!profile) {
      throw new Error(`Profile with id ${id} not found`);
    }

    // Start transaction
    await db.execAsync('BEGIN TRANSACTION');

    try {
      // Delete profile entry from master.db
      await db.runAsync(
        `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = ?`,
        [id]
      );

      // Delete the profile database file
      await this.deleteProfileDatabase(profile.db_path);

      await db.execAsync('COMMIT');

      log(`✓ Deleted profile: ${id}`);
    } catch (error) {
      await db.execAsync('ROLLBACK');
      logError(`Error deleting profile ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a profile database file
   */
  private async deleteProfileDatabase(dbPath: string): Promise<void> {
    try {
      const uri = Paths.document.uri;
      const fullPath = `${uri}/SQLite/${dbPath}`;
      const dbFile = new File(fullPath);

      if (dbFile.exists) {
        dbFile.delete();
        log(`✓ Deleted profile database file: ${dbPath}`);
      } else {
        log(`⚠ Profile database file not found: ${dbPath}`);
      }
    } catch (error) {
      logError(`Error deleting profile database file ${dbPath}:`, error);
      // Don't throw - file deletion failure shouldn't prevent profile deletion
    }
  }
}

export const profileRepository = new ProfileRepository();

