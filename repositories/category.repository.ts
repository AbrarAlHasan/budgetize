import { BaseRepository } from './base.repository';
import { Category, CreateCategoryInput, UpdateCategoryInput } from '@/db/schema/types';
import { encrypt, decrypt } from '@/services/encryption';
import { getDatabase } from '@/db/sqlite/db';
import * as SQLite from 'expo-sqlite';

export class CategoryRepository extends BaseRepository<Category> {
  protected tableName = 'categories';
  protected primaryKey = 'id';

  async create(input: CreateCategoryInput): Promise<Category> {
    // Check if a soft-deleted category with this name exists
    const existingDeletedCategory = await this.findDeletedByName(input.name);
    
    if (existingDeletedCategory) {
      // Reactivate the soft-deleted category
      return this.reactivate(existingDeletedCategory.id);
    }

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

  async update(input: UpdateCategoryInput): Promise<Category> {
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

      const category = await this.findById(input.id);
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

  async findDeletedByName(name: string): Promise<Category | null> {
    // Find deleted categories (including soft-deleted ones)
    const db = await getDatabase();
    const deletedCategories = await db.getAllAsync<Category>(
      `SELECT * FROM ${this.tableName} WHERE deleted_at IS NOT NULL`
    );
    
    if (!deletedCategories || deletedCategories.length === 0) {
      return null;
    }

    // Decrypt and search for matching name
    const decryptedCategories = await this.decryptCategories(deletedCategories);
    return decryptedCategories.find(c => c.name.toLowerCase() === name.trim().toLowerCase()) || null;
  }

  async reactivate(id: number): Promise<Category> {
    // Reactivate a soft-deleted category by clearing deleted_at
    const db = await getDatabase();
    await db.execAsync('BEGIN TRANSACTION');

    try {
      const now = new Date().toISOString();
      await db.runAsync(
        `UPDATE ${this.tableName} SET deleted_at = NULL, updated_at = ?, is_synced = 0 WHERE id = ?`,
        [now, id]
      );

      await db.execAsync('COMMIT');

      const category = await this.findById(id);
      if (!category) {
        throw new Error('Category not found');
      }
      return category;
    } catch (error) {
      await db.execAsync('ROLLBACK');
      console.error('Error reactivating category:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to reactivate category');
    }
  }

  /**
   * Find a category by ID including deleted ones (useful for reports and transaction displays)
   */
  async findByIdIncludingDeleted(id: number): Promise<Category | null> {
    const db = await getDatabase();
    const category = await db.getFirstAsync<Category>(
      `SELECT * FROM ${this.tableName} WHERE id = ?`,
      [id]
    );
    return category || null;
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
   * Optimized: Decrypts all names in parallel instead of decrypting each category sequentially
   */
  async decryptCategories(categories: Category[]): Promise<Array<Omit<Category, 'name'> & {
    name: string;
  }>> {
    if (categories.length === 0) return [];

    // Decrypt all names in parallel
    const names = await Promise.all(
      categories.map((c) => decrypt(c.name))
    );

    // Combine results
    return categories.map((category, index) => ({
      ...category,
      name: names[index],
    }));
  }
}

export const categoryRepository = new CategoryRepository();

