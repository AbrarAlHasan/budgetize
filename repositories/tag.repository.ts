import { BaseRepository } from './base.repository';
import { Tag, CreateTagInput, UpdateTagInput } from '@/db/schema/types';
import { encrypt, decrypt } from '@/services/encryption';
import { getDatabase } from '@/db/sqlite/db';
import * as SQLite from 'expo-sqlite';

export class TagRepository extends BaseRepository<Tag> {
  protected tableName = 'tags';
  protected primaryKey = 'id';

  async create(input: CreateTagInput): Promise<Tag> {
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
   */
  async decryptTags(tags: Tag[]): Promise<Array<Omit<Tag, 'name'> & {
    name: string;
  }>> {
    return Promise.all(tags.map((t) => this.decryptTag(t)));
  }
}

export const tagRepository = new TagRepository();

