import { BaseRepository } from "./base.repository";
import { getDatabase } from "@/db/sqlite/db";
import { logError } from "@/utils/logger";
import * as SQLite from "expo-sqlite";

export interface Profile {
  id: number;
  name: string;
  is_default: number; // SQLite boolean (0 or 1)
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
  deleted_at: string | null; // ISO date string
  remote_id: string | null;
  is_synced: number; // SQLite boolean (0 or 1)
}

export interface CreateProfileInput {
  name: string;
  is_default?: boolean;
}

export interface UpdateProfileInput {
  id: number;
  name?: string;
  is_default?: boolean;
}

export class ProfileRepository extends BaseRepository<Profile> {
  protected tableName = "profiles";
  protected primaryKey = "id";

  /**
   * Create a new profile
   * If is_default is true, unset other default profiles
   */
  async create(input: CreateProfileInput): Promise<Profile> {
    const db = await getDatabase();
    await db.execAsync("BEGIN TRANSACTION");

    try {
      // If this is set as default, unset other defaults
      if (input.is_default) {
        await db.runAsync(
          `UPDATE ${this.tableName} 
           SET is_default = 0, updated_at = datetime('now'), is_synced = 0 
           WHERE is_default = 1 AND deleted_at IS NULL`
        );
      }

      const now = new Date().toISOString();
      const result = await db.runAsync(
        `INSERT INTO ${this.tableName} 
         (name, is_default, created_at, updated_at, is_synced)
         VALUES (?, ?, ?, ?, 0)`,
        [input.name, input.is_default ? 1 : 0, now, now]
      );

      await db.execAsync("COMMIT");

      const profile = await this.findById(result.lastInsertRowId);
      if (!profile) {
        throw new Error("Failed to create profile");
      }
      return profile;
    } catch (error) {
      await db.execAsync("ROLLBACK");
      logError("Error creating profile:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to create profile"
      );
    }
  }

  /**
   * Update a profile
   * If is_default is set to true, unset other default profiles
   */
  async update(input: UpdateProfileInput): Promise<Profile> {
    const db = await getDatabase();
    await db.execAsync("BEGIN TRANSACTION");

    try {
      // If setting as default, unset other defaults
      if (input.is_default === true) {
        await db.runAsync(
          `UPDATE ${this.tableName} 
           SET is_default = 0, updated_at = datetime('now'), is_synced = 0 
           WHERE id != ? AND is_default = 1 AND deleted_at IS NULL`,
          [input.id]
        );
      }

      const updateData: any = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.is_default !== undefined)
        updateData.is_default = input.is_default ? 1 : 0;

      if (Object.keys(updateData).length > 0) {
        const fields = Object.keys(updateData)
          .map((key) => `${key} = ?`)
          .join(", ");
        const values: (string | number)[] = Object.values(updateData);
        const now = new Date().toISOString();

        await db.runAsync(
          `UPDATE ${this.tableName} SET ${fields}, updated_at = ?, is_synced = 0 WHERE id = ?`,
          [...values, now, input.id]
        );
      }

      await db.execAsync("COMMIT");

      const profile = await this.findById(input.id);
      if (!profile) {
        throw new Error("Profile not found");
      }
      return profile;
    } catch (error) {
      await db.execAsync("ROLLBACK");
      logError("Error updating profile:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to update profile"
      );
    }
  }

  /**
   * Get the default profile
   */
  async findDefault(): Promise<Profile | null> {
    const results = await this.executeQuery<Profile>(
      `SELECT * FROM ${this.tableName} 
       WHERE is_default = 1 AND deleted_at IS NULL 
       LIMIT 1`
    );
    return results[0] || null;
  }

  /**
   * Set a profile as default (unset others)
   */
  async setDefault(profileId: number): Promise<void> {
    const db = await getDatabase();
    await db.execAsync("BEGIN TRANSACTION");

    try {
      // Unset all defaults
      await db.runAsync(
        `UPDATE ${this.tableName} 
         SET is_default = 0, updated_at = datetime('now'), is_synced = 0 
         WHERE is_default = 1 AND deleted_at IS NULL`
      );

      // Set this profile as default
      const now = new Date().toISOString();
      await db.runAsync(
        `UPDATE ${this.tableName} 
         SET is_default = 1, updated_at = ?, is_synced = 0 
         WHERE id = ? AND deleted_at IS NULL`,
        [now, profileId]
      );

      await db.execAsync("COMMIT");
    } catch (error) {
      await db.execAsync("ROLLBACK");
      logError("Error setting default profile:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to set default profile"
      );
    }
  }

  /**
   * Delete a profile and all its associated data
   * Cannot delete if it's the only profile or if it's the default and there are other profiles
   */
  async delete(profileId: number): Promise<void> {
    const db = await getDatabase();
    await db.execAsync("BEGIN TRANSACTION");

    try {
      // Check if this is the only profile
      const allProfiles = await this.findAll();
      if (allProfiles.length <= 1) {
        throw new Error("Cannot delete the only profile");
      }

      const profile = await this.findById(profileId);
      if (!profile) {
        throw new Error("Profile not found");
      }

      // If this is the default profile, set another profile as default
      if (profile.is_default === 1) {
        const otherProfile = allProfiles.find((p) => p.id !== profileId);
        if (otherProfile) {
          await this.setDefault(otherProfile.id);
        }
      }

      // Soft delete the profile
      const now = new Date().toISOString();
      await db.runAsync(
        `UPDATE ${this.tableName} 
         SET deleted_at = ?, updated_at = ?, is_synced = 0 
         WHERE id = ?`,
        [now, now, profileId]
      );

      // Hard delete all associated data
      const tablesToClean = [
        "accounts",
        "transactions",
        "categories",
        "tags",
        "exchanges",
        "exchange_installments",
        "exchange_reminders",
        "transaction_tags",
      ];

      for (const tableName of tablesToClean) {
        // Check if table exists
        const tableExists = await db.getAllAsync<{ name: string }>(
          `SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}' LIMIT 1`
        );

        if (tableExists.length > 0) {
          await db.runAsync(
            `DELETE FROM ${tableName} WHERE profile_id = ?`,
            [profileId]
          );
        }
      }

      await db.execAsync("COMMIT");
    } catch (error) {
      await db.execAsync("ROLLBACK");
      logError("Error deleting profile:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to delete profile"
      );
    }
  }

  /**
   * Get all profiles including deleted ones (for restore purposes)
   */
  async findAllIncludingDeleted(): Promise<Profile[]> {
    return this.executeQuery<Profile>(
      `SELECT * FROM ${this.tableName} ORDER BY created_at DESC`
    );
  }
}

export const profileRepository = new ProfileRepository();

