import { getDatabase } from '@/db/sqlite/db';
import { logSQL } from '@/utils/logger';
import * as SQLite from 'expo-sqlite';

export abstract class BaseRepository<T> {
  protected abstract tableName: string;
  protected abstract primaryKey: string;

  protected async getDb(): Promise<SQLite.SQLiteDatabase> {
    return getDatabase();
  }

  /**
   * Get the active profile ID
   * Profiles table doesn't have profile_id, so we skip filtering for it
   * Uses lazy import to avoid circular dependency
   */
  protected async getActiveProfileId(): Promise<number | null> {
    // Skip profile filtering for profiles table itself
    if (this.tableName === 'profiles') {
      return null;
    }

    // Lazy import to avoid circular dependency
    const { useProfileStore } = await import('@/store/profile-store');
    const state = useProfileStore.getState();
    return state.activeProfileId;
  }

  /**
   * Add profile_id filter to WHERE conditions
   */
  protected async addProfileFilter(
    conditions: string[],
    params: any[]
  ): Promise<void> {
    const profileId = await this.getActiveProfileId();
    if (profileId !== null) {
      conditions.push(`${this.tableName}.profile_id = ?`);
      params.push(profileId);
    }
  }

  protected async executeQuery<TResult>(
    query: string,
    params: any[] = []
  ): Promise<TResult[]> {
    // Generate a unique ID for this query execution
    const queryId = Math.random().toString(36).substring(2, 9);
    
    // Log the final SQL query and parameters for debugging (only in development)
    const db = await this.getDb();
    const queryResult = await db.getAllAsync<TResult>(query, params);
    logSQL(queryId, query, params, queryResult.length);
    return queryResult;
  }

  protected async executeUpdate(
    query: string,
    params: any[] = []
  ): Promise<SQLite.SQLiteRunResult> {
    const db = await this.getDb();
    return db.runAsync(query, params);
  }

  async findById(id: number): Promise<T | null> {
    const conditions: string[] = [`${this.primaryKey} = ?`, 'deleted_at IS NULL'];
    const params: any[] = [id];
    await this.addProfileFilter(conditions, params);
    
    const results = await this.executeQuery<T>(
      `SELECT * FROM ${this.tableName} WHERE ${conditions.join(' AND ')}`,
      params
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
    const conditions: string[] = [`${this.primaryKey} IN (${placeholders})`, 'deleted_at IS NULL'];
    const params: any[] = [...ids];
    await this.addProfileFilter(conditions, params);
    
    return this.executeQuery<T>(
      `SELECT * FROM ${this.tableName} WHERE ${conditions.join(' AND ')}`,
      params
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
    const conditions: string[] = ['deleted_at IS NULL'];
    const params: any[] = [];
    await this.addProfileFilter(conditions, params);
    
    return this.executeQuery<T>(
      `SELECT * FROM ${this.tableName} WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`,
      params
    );
  }

  protected async createBase(data: Partial<T>): Promise<number> {
    const now = new Date().toISOString();
    const profileId = await this.getActiveProfileId();
    
    // Add profile_id if not profiles table
    const fields = profileId !== null 
      ? [...Object.keys(data), 'profile_id'].join(', ')
      : Object.keys(data).join(', ');
    const placeholders = profileId !== null
      ? [...Object.keys(data).map(() => '?'), '?'].join(', ')
      : Object.keys(data).map(() => '?').join(', ');
    const values = profileId !== null
      ? [...Object.values(data), profileId]
      : Object.values(data);

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
    
    const conditions: string[] = [`${this.primaryKey} = ?`, 'deleted_at IS NULL'];
    const params: any[] = [...values, now, id];
    await this.addProfileFilter(conditions, params);

    const query = `
      UPDATE ${this.tableName}
      SET ${fields}, updated_at = ?, is_synced = 0
      WHERE ${conditions.join(' AND ')}
    `;

    await this.executeUpdate(query, params);
  }


  async delete(id: number): Promise<void> {
    const now = new Date().toISOString();
    const conditions: string[] = [`${this.primaryKey} = ?`];
    const params: any[] = [now, now, id];
    await this.addProfileFilter(conditions, params);
    
    await this.executeUpdate(
      `UPDATE ${this.tableName} SET deleted_at = ?, updated_at = ?, is_synced = 0 WHERE ${conditions.join(' AND ')}`,
      params
    );
  }

  async hardDelete(id: number): Promise<void> {
    const conditions: string[] = [`${this.primaryKey} = ?`];
    const params: any[] = [id];
    await this.addProfileFilter(conditions, params);
    
    await this.executeUpdate(
      `DELETE FROM ${this.tableName} WHERE ${conditions.join(' AND ')}`,
      params
    );
  }
}

