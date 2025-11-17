import { BaseRepository } from './base.repository';
import { TransactionTag } from '@/db/schema/types';
import { getDatabase } from '@/db/sqlite/db';

export class TransactionTagRepository {
  protected tableName = 'transaction_tags';

  protected async getDb() {
    return getDatabase();
  }

  async create(transactionId: number, tagId: number): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      `INSERT OR IGNORE INTO ${this.tableName} (transaction_id, tag_id) VALUES (?, ?)`,
      [transactionId, tagId]
    );
  }

  async delete(transactionId: number, tagId: number): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      `DELETE FROM ${this.tableName} WHERE transaction_id = ? AND tag_id = ?`,
      [transactionId, tagId]
    );
  }

  async findByTransactionId(transactionId: number): Promise<TransactionTag[]> {
    const db = await this.getDb();
    return db.getAllAsync<TransactionTag>(
      `SELECT * FROM ${this.tableName} WHERE transaction_id = ?`,
      [transactionId]
    );
  }

  async findByTagId(tagId: number): Promise<TransactionTag[]> {
    const db = await this.getDb();
    return db.getAllAsync<TransactionTag>(
      `SELECT * FROM ${this.tableName} WHERE tag_id = ?`,
      [tagId]
    );
  }

  async setTransactionTags(transactionId: number, tagIds: number[]): Promise<void> {
    const db = await this.getDb();
    
    // Delete existing tags
    await db.runAsync(
      `DELETE FROM ${this.tableName} WHERE transaction_id = ?`,
      [transactionId]
    );

    // Insert new tags
    for (const tagId of tagIds) {
      await db.runAsync(
        `INSERT INTO ${this.tableName} (transaction_id, tag_id) VALUES (?, ?)`,
        [transactionId, tagId]
      );
    }
  }
}

export const transactionTagRepository = new TransactionTagRepository();

