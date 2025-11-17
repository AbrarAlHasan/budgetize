import { BaseRepository } from './base.repository';
import { Category } from '@/db/schema/types';
import { encrypt, decrypt } from '@/services/encryption';
import { getDatabase } from '@/db/sqlite/db';
import * as SQLite from 'expo-sqlite';

export class CategoryRepository extends BaseRepository<Category> {
  protected tableName = 'categories';
  protected primaryKey = 'id';

  async create(input: { name: string }): Promise<Category> {
    // Encrypt sensitive fields
    const encryptedName = await encrypt(input.name);

    const db = await getDatabase();
    await db.execAsync('BEGIN TRANSACTION');

    try {
      const now = new Date().toISOString();
      const result = await db.runAsync(
        `INSERT INTO ${this.tableName} 
         (name, created_at, updated_at, is_synced)
         VALUES (?, ?, ?, 0)`,
        [encryptedName, now, now]
      );

      await db.execAsync('COMMIT');

      const category = await this.findById(result.lastInsertRowId);
      if (!category) {
        throw new Error('Failed to create category');
      }
      return category;
    } catch (error) {
      await db.execAsync('ROLLBACK');
      console.error('Error creating category:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to create category');
    }
  }

  async update(id: number, input: { name: string }): Promise<Category> {
    // Encrypt sensitive fields
    const encryptedName = await encrypt(input.name);

    const db = await getDatabase();
    await db.execAsync('BEGIN TRANSACTION');

    try {
      const now = new Date().toISOString();
      await db.runAsync(
        `UPDATE ${this.tableName} SET name = ?, updated_at = ?, is_synced = 0 WHERE id = ?`,
        [encryptedName, now, id]
      );

      await db.execAsync('COMMIT');

      const category = await this.findById(id);
      if (!category) {
        throw new Error('Category not found');
      }
      return category;
    } catch (error) {
      await db.execAsync('ROLLBACK');
      console.error('Error updating category:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to update category');
    }
  }

  async findAll(): Promise<Category[]> {
    return this.executeQuery<Category>(
      `SELECT * FROM ${this.tableName} WHERE deleted_at IS NULL ORDER BY name ASC`
    );
  }

  async findByName(name: string): Promise<Category | null> {
    // Since names are encrypted, we need to decrypt all categories and search in memory
    const allCategories = await this.findAll();
    const decryptedCategories = await this.decryptCategories(allCategories);
    return decryptedCategories.find(c => c.name === name) || null;
  }

  /**
   * Decrypt category for display
   */
  async decryptCategory(category: Category): Promise<Omit<Category, 'name'> & {
    name: string;
  }> {
    const name = await decrypt(category.name);

    return {
      ...category,
      name,
    };
  }

  /**
   * Decrypt multiple categories
   */
  async decryptCategories(categories: Category[]): Promise<Array<Omit<Category, 'name'> & {
    name: string;
  }>> {
    return Promise.all(categories.map((c) => this.decryptCategory(c)));
  }
}

export const categoryRepository = new CategoryRepository();

