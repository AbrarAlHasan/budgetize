import * as SQLite from 'expo-sqlite';
import { getDatabase } from '@/db/sqlite/db';

export abstract class BaseRepository<T> {
  protected abstract tableName: string;
  protected abstract primaryKey: string;

  protected async getDb(): Promise<SQLite.SQLiteDatabase> {
    return getDatabase();
  }

  protected async executeQuery<TResult>(
    query: string,
    params: any[] = []
  ): Promise<TResult[]> {
    const db = await this.getDb();
    return db.getAllAsync<TResult>(query, params);
  }

  protected async executeUpdate(
    query: string,
    params: any[] = []
  ): Promise<SQLite.SQLiteRunResult> {
    const db = await this.getDb();
    return db.runAsync(query, params);
  }

  async findById(id: number): Promise<T | null> {
    const results = await this.executeQuery<T>(
      `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = ? AND deleted_at IS NULL`,
      [id]
    );
    return results[0] || null;
  }

  /**
   * Find multiple records by IDs (batch fetch for performance)
   * Useful for loading tags/categories for multiple transactions at once
   */
  async findByIds(ids: number[]): Promise<T[]> {
    if (ids.length === 0) return [];
    const placeholders = ids.map(() => '?').join(', ');
    return this.executeQuery<T>(
      `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} IN (${placeholders}) AND deleted_at IS NULL`,
      ids
    );
  }

  /**
   * Find multiple records by IDs including deleted ones
   */
  async findByIdsIncludingDeleted(ids: number[]): Promise<T[]> {
    if (ids.length === 0) return [];
    const placeholders = ids.map(() => '?').join(', ');
    const db = await this.getDb();
    return db.getAllAsync<T>(
      `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} IN (${placeholders})`,
      ids
    );
  }

  async findAll(): Promise<T[]> {
    return this.executeQuery<T>(
      `SELECT * FROM ${this.tableName} WHERE deleted_at IS NULL ORDER BY created_at DESC`
    );
  }

  protected async createBase(data: Partial<T>): Promise<number> {
    const now = new Date().toISOString();
    const fields = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);

    const query = `
      INSERT INTO ${this.tableName} (${fields}, created_at, updated_at, is_synced)
      VALUES (${placeholders}, ?, ?, 0)
    `;

    const result = await this.executeUpdate(query, [...values, now, now]);
    return result.lastInsertRowId;
  }

  protected async updateBase(id: number, data: Partial<T>): Promise<void> {
    const now = new Date().toISOString();
    const fields = Object.keys(data)
      .map((key) => `${key} = ?`)
      .join(', ');
    const values = Object.values(data);

    const query = `
      UPDATE ${this.tableName}
      SET ${fields}, updated_at = ?, is_synced = 0
      WHERE ${this.primaryKey} = ? AND deleted_at IS NULL
    `;

    await this.executeUpdate(query, [...values, now, id]);
  }


  async delete(id: number): Promise<void> {
    const now = new Date().toISOString();
    await this.executeUpdate(
      `UPDATE ${this.tableName} SET deleted_at = ?, updated_at = ?, is_synced = 0 WHERE ${this.primaryKey} = ?`,
      [now, now, id]
    );
  }

  async hardDelete(id: number): Promise<void> {
    await this.executeUpdate(
      `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = ?`,
      [id]
    );
  }
}

