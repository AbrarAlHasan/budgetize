import { BaseRepository } from './base.repository';
import { Transaction, CreateTransactionInput, UpdateTransactionInput } from '@/db/schema/types';
import { encrypt, decrypt, encryptAmount, decryptAmount } from '@/services/encryption';
import { transactionTagRepository } from './transaction-tag.repository';
import { getDatabase } from '@/db/sqlite/db';
import * as SQLite from 'expo-sqlite';

export class TransactionRepository extends BaseRepository<Transaction> {
  protected tableName = 'transactions';
  protected primaryKey = 'id';

  async create(input: CreateTransactionInput): Promise<Transaction> {
    // Encrypt sensitive fields
    const encryptedAmount = await encryptAmount(input.amount);
    const encryptedNote = input.note ? await encrypt(input.note) : null;
    const encryptedPaymentMode = await encrypt(input.payment_mode);

    const db = await getDatabase();
    
    // Start transaction
    await db.execAsync('BEGIN TRANSACTION');
    
    try {
      // Insert transaction
      const now = new Date().toISOString();
      const result = await db.runAsync(
        `INSERT INTO ${this.tableName} 
         (account_id, category_id, amount, type, date, note, payment_mode, created_at, updated_at, is_synced)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          input.account_id,
          input.category_id || null,
          encryptedAmount,
          input.type,
          input.date,
          encryptedNote,
          encryptedPaymentMode,
          now,
          now,
        ]
      );

      const transactionId = result.lastInsertRowId;

      // Add tags if provided
      if (input.tag_ids && input.tag_ids.length > 0) {
        for (const tagId of input.tag_ids) {
          await transactionTagRepository.create(transactionId, tagId);
        }
      }

      await db.execAsync('COMMIT');

      const transaction = await this.findById(transactionId);
      if (!transaction) {
        await db.execAsync('ROLLBACK');
        throw new Error('Failed to create transaction');
      }
      return transaction;
    } catch (error) {
      await db.execAsync('ROLLBACK');
      console.error('Error creating transaction:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to create transaction');
    }
  }

  async update(input: UpdateTransactionInput): Promise<Transaction> {
    const db = await getDatabase();
    await db.execAsync('BEGIN TRANSACTION');

    try {
      // Get existing transaction
      const existing = await this.findById(input.id);
      if (!existing) {
        throw new Error('Transaction not found');
      }

      // Prepare update data
      const updateData: any = {};
      
      if (input.account_id !== undefined) updateData.account_id = input.account_id;
      if (input.category_id !== undefined) updateData.category_id = input.category_id;
      if (input.type !== undefined) updateData.type = input.type;
      if (input.date !== undefined) updateData.date = input.date;

      // Encrypt fields if provided
      if (input.amount !== undefined) {
        updateData.amount = await encryptAmount(input.amount);
      }
      if (input.note !== undefined) {
        updateData.note = input.note ? await encrypt(input.note) : null;
      }
      if (input.payment_mode !== undefined) {
        updateData.payment_mode = await encrypt(input.payment_mode);
      }

      // Update transaction
      if (Object.keys(updateData).length > 0) {
        const fields = Object.keys(updateData)
          .map((key) => `${key} = ?`)
          .join(', ');
        const values: (string | number | null)[] = Object.values(updateData) as (string | number | null)[];
        const now = new Date().toISOString();

        await db.runAsync(
          `UPDATE ${this.tableName} SET ${fields}, updated_at = ?, is_synced = 0 WHERE id = ?`,
          [...values, now, input.id]
        );
      }

      // Update tags if provided
      if (input.tag_ids !== undefined) {
        await transactionTagRepository.setTransactionTags(input.id, input.tag_ids);
      }

      await db.execAsync('COMMIT');

      const transaction = await this.findById(input.id);
      if (!transaction) {
        throw new Error('Transaction not found');
      }
      return transaction;
    } catch (error) {
      await db.execAsync('ROLLBACK');
      console.error('Error updating transaction:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to update transaction');
    }
  }

  async findById(id: number): Promise<Transaction | null> {
    const results = await this.executeQuery<Transaction>(
      `SELECT * FROM ${this.tableName} WHERE id = ? AND deleted_at IS NULL`,
      [id]
    );
    return results[0] || null;
  }

  async findByAccountId(accountId: number): Promise<Transaction[]> {
    return this.executeQuery<Transaction>(
      `SELECT * FROM ${this.tableName} WHERE account_id = ? AND deleted_at IS NULL ORDER BY date DESC, created_at DESC`,
      [accountId]
    );
  }

  async findByDateRange(startDate: string, endDate: string): Promise<Transaction[]> {
    return this.executeQuery<Transaction>(
      `SELECT * FROM ${this.tableName} 
       WHERE date >= ? AND date <= ? AND deleted_at IS NULL 
       ORDER BY date DESC, created_at DESC`,
      [startDate, endDate]
    );
  }

  async findByType(type: Transaction['type']): Promise<Transaction[]> {
    return this.executeQuery<Transaction>(
      `SELECT * FROM ${this.tableName} WHERE type = ? AND deleted_at IS NULL ORDER BY date DESC`,
      [type]
    );
  }

  async findAllWithFilters(filters?: {
    accountId?: number;
    accountIds?: number[];
    tagId?: number;
    tagIds?: number[];
    categoryId?: number;
    categoryIds?: number[];
    startDate?: string;
    endDate?: string;
    type?: Transaction['type'];
    types?: Transaction['type'][];
    accountType?: string;
    accountTypes?: string[];
  }): Promise<Transaction[]> {
    let query = `SELECT DISTINCT t.* FROM ${this.tableName} t`;
    const params: any[] = [];
    const conditions: string[] = ['t.deleted_at IS NULL'];
    let hasJoin = false;

    // Handle account filters (support both single and array)
    const accountIds = filters?.accountIds || (filters?.accountId ? [filters.accountId] : []);
    if (accountIds.length > 0) {
      const placeholders = accountIds.map(() => '?').join(',');
      conditions.push(`t.account_id IN (${placeholders})`);
      params.push(...accountIds);
    }

    // Handle tag filters (support both single and array)
    const tagIds = filters?.tagIds || (filters?.tagId ? [filters.tagId] : []);
    if (tagIds.length > 0) {
      if (!hasJoin) {
        query += ' INNER JOIN transaction_tags tt ON t.id = tt.transaction_id';
        hasJoin = true;
      }
      const placeholders = tagIds.map(() => '?').join(',');
      conditions.push(`tt.tag_id IN (${placeholders})`);
      params.push(...tagIds);
    }

    // Handle category filters (support both single and array)
    const categoryIds = filters?.categoryIds || (filters?.categoryId ? [filters.categoryId] : []);
    if (categoryIds.length > 0) {
      const placeholders = categoryIds.map(() => '?').join(',');
      conditions.push(`t.category_id IN (${placeholders})`);
      params.push(...categoryIds);
    }

    if (filters?.startDate) {
      conditions.push('t.date >= ?');
      params.push(filters.startDate);
    }

    if (filters?.endDate) {
      conditions.push('t.date <= ?');
      params.push(filters.endDate);
    }

    // Handle transaction type filters (support both single and array)
    const types = filters?.types || (filters?.type ? [filters.type] : []);
    if (types.length > 0) {
      const placeholders = types.map(() => '?').join(',');
      conditions.push(`t.type IN (${placeholders})`);
      params.push(...types);
    }

    // Handle account type filters (support both single and array)
    // Note: account type is stored in accounts table, so we need to join
    const accountTypes = filters?.accountTypes || (filters?.accountType ? [filters.accountType] : []);
    if (accountTypes.length > 0) {
      if (!hasJoin) {
        query += ' INNER JOIN accounts a ON t.account_id = a.id';
        hasJoin = true;
      } else if (!query.includes('INNER JOIN accounts')) {
        query += ' INNER JOIN accounts a ON t.account_id = a.id';
      }
      const placeholders = accountTypes.map(() => '?').join(',');
      conditions.push(`a.type IN (${placeholders})`);
      params.push(...accountTypes);
    }

    query += ` WHERE ${conditions.join(' AND ')} ORDER BY t.date DESC, t.created_at DESC`;

    return this.executeQuery<Transaction>(query, params);
  }

  /**
   * Decrypt transaction for display
   */
  async decryptTransaction(transaction: Transaction): Promise<Omit<Transaction, 'amount' | 'note' | 'payment_mode'> & {
    amount: number;
    note: string | null;
    payment_mode: string;
  }> {
    const amount = await decryptAmount(transaction.amount);
    const note = transaction.note ? await decrypt(transaction.note) : null;
    const payment_mode = await decrypt(transaction.payment_mode);

    return {
      ...transaction,
      amount,
      note,
      payment_mode,
    };
  }

  /**
   * Decrypt multiple transactions
   */
  async decryptTransactions(transactions: Transaction[]): Promise<Array<Omit<Transaction, 'amount' | 'note' | 'payment_mode'> & {
    amount: number;
    note: string | null;
    payment_mode: string;
  }>> {
    return Promise.all(transactions.map((t) => this.decryptTransaction(t)));
  }
}

export const transactionRepository = new TransactionRepository();

