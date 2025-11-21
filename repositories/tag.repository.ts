import { BaseRepository } from './base.repository';
import { Tag, CreateTagInput, UpdateTagInput } from '@/db/schema/types';
import { encrypt, decrypt } from '@/services/encryption';
import { getDatabase } from '@/db/sqlite/db';
import * as SQLite from 'expo-sqlite';

export class TagRepository extends BaseRepository<Tag> {
  protected tableName = 'tags';
  protected primaryKey = 'id';

  async create(input: CreateTagInput): Promise<Tag> {
    // Check if a soft-deleted tag with this name exists
    const existingDeletedTag = await this.findDeletedByName(input.name);
    
    if (existingDeletedTag) {
      // Reactivate the soft-deleted tag
      return this.reactivate(existingDeletedTag.id);
    }

    // Encrypt sensitive fields
    const encryptedName = await encrypt(input.name);

    const db = await getDatabase();
    await db.execAsync('BEGIN TRANSACTION');

    try {
      const now = new Date().toISOString();
      const result = await db.runAsync(
        `INSERT INTO ${this.tableName} 
         (name, created_at, updated_at, is_synced, remote_id)
         VALUES (?, ?, ?, 0, ?)`,
        [encryptedName, now, now, null]
      );

      await db.execAsync('COMMIT');

      const tag = await this.findById(result.lastInsertRowId);
      if (!tag) {
        throw new Error('Failed to create tag');
      }
      return tag;
    } catch (error) {
      await db.execAsync('ROLLBACK');
      console.error('Error creating tag:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to create tag');
    }
  }

  async update(input: UpdateTagInput): Promise<Tag> {
    // Encrypt sensitive fields
    const encryptedName = await encrypt(input.name);

    const db = await getDatabase();
    await db.execAsync('BEGIN TRANSACTION');

    try {
      const now = new Date().toISOString();
      await db.runAsync(
        `UPDATE ${this.tableName} SET name = ?, updated_at = ?, is_synced = 0 WHERE id = ?`,
        [encryptedName, now, input.id]
      );

      await db.execAsync('COMMIT');

      const tag = await this.findById(input.id);
      if (!tag) {
        throw new Error('Tag not found');
      }
      return tag;
    } catch (error) {
      await db.execAsync('ROLLBACK');
      console.error('Error updating tag:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to update tag');
    }
  }

  async findByName(name: string): Promise<Tag | null> {
    // Since names are encrypted, we need to decrypt all tags and search in memory
    const allTags = await this.findAll();
    const decryptedTags = await this.decryptTags(allTags);
    return decryptedTags.find(t => t.name === name) || null;
  }

  async findDeletedByName(name: string): Promise<Tag | null> {
    // Find deleted tags (including soft-deleted ones)
    const db = await getDatabase();
    const deletedTags = await db.getAllAsync<Tag>(
      `SELECT * FROM ${this.tableName} WHERE deleted_at IS NOT NULL`
    );
    
    if (!deletedTags || deletedTags.length === 0) {
      return null;
    }

    // Decrypt and search for matching name
    const decryptedTags = await this.decryptTags(deletedTags);
    return decryptedTags.find(t => t.name.toLowerCase() === name.trim().toLowerCase()) || null;
  }

  async reactivate(id: number): Promise<Tag> {
    // Reactivate a soft-deleted tag by clearing deleted_at
    const db = await getDatabase();
    await db.execAsync('BEGIN TRANSACTION');

    try {
      const now = new Date().toISOString();
      await db.runAsync(
        `UPDATE ${this.tableName} SET deleted_at = NULL, updated_at = ?, is_synced = 0 WHERE id = ?`,
        [now, id]
      );

      await db.execAsync('COMMIT');

      const tag = await this.findById(id);
      if (!tag) {
        throw new Error('Tag not found');
      }
      return tag;
    } catch (error) {
      await db.execAsync('ROLLBACK');
      console.error('Error reactivating tag:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to reactivate tag');
    }
  }

  /**
   * Find a tag by ID including deleted ones (useful for reports)
   */
  async findByIdIncludingDeleted(id: number): Promise<Tag | null> {
    const db = await getDatabase();
    const tag = await db.getFirstAsync<Tag>(
      `SELECT * FROM ${this.tableName} WHERE id = ?`,
      [id]
    );
    return tag || null;
  }

  /**
   * Decrypt tag for display
   */
  async decryptTag(tag: Tag): Promise<Omit<Tag, 'name'> & {
    name: string;
  }> {
    const name = await decrypt(tag.name);

    return {
      ...tag,
      name,
    };
  }

  /**
   * Decrypt multiple tags
   * Optimized: Decrypts all names in parallel instead of decrypting each tag sequentially
   */
  async decryptTags(tags: Tag[]): Promise<Array<Omit<Tag, 'name'> & {
    name: string;
  }>> {
    if (tags.length === 0) return [];

    // Decrypt all names in parallel
    const names = await Promise.all(
      tags.map((t) => decrypt(t.name))
    );

    // Combine results
    return tags.map((tag, index) => ({
      ...tag,
      name: names[index],
    }));
  }
}

export const tagRepository = new TagRepository();

