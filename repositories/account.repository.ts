import { BaseRepository } from './base.repository';
import { Account, CreateAccountInput, DecryptedAccount, UpdateAccountInput } from '@/db/schema/types';
import { encrypt, decrypt, encryptAmount, decryptAmount } from '@/services/encryption';
import { getDatabase } from '@/db/sqlite/db';
import * as SQLite from 'expo-sqlite';

export class AccountRepository extends BaseRepository<Account> {
  protected tableName = 'accounts';
  protected primaryKey = 'id';

  async create(input: CreateAccountInput): Promise<Account> {
    // Encrypt sensitive fields
    const encryptedName = await encrypt(input.name);
    const encryptedBankName = input.bank_name ? await encrypt(input.bank_name) : null;
    const encryptedCreditLimit = input.credit_limit !== null && input.credit_limit !== undefined 
      ? await encryptAmount(input.credit_limit) 
      : null;
    const encryptedBillingStartDate = input.billing_start_date ? await encrypt(input.billing_start_date) : null;
    const encryptedBillingEndDate = input.billing_end_date ? await encrypt(input.billing_end_date) : null;
    const encryptedPaymentDueDate = input.payment_due_date ? await encrypt(input.payment_due_date) : null;

    const db = await getDatabase();
    await db.execAsync('BEGIN TRANSACTION');

    try {
      const now = new Date().toISOString();
      const result = await db.runAsync(
        `INSERT INTO ${this.tableName} 
         (name, type, bank_name, credit_limit, billing_start_date, billing_end_date, payment_due_date, created_at, updated_at, is_synced)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          encryptedName,
          input.type,
          encryptedBankName,
          encryptedCreditLimit,
          encryptedBillingStartDate,
          encryptedBillingEndDate,
          encryptedPaymentDueDate,
          now,
          now,
        ]
      );

      await db.execAsync('COMMIT');

      const account = await this.findById(result.lastInsertRowId);
      if (!account) {
        throw new Error('Failed to create account');
      }
      return account;
    } catch (error) {
      await db.execAsync('ROLLBACK');
      console.error('Error creating account:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to create account');
    }
  }

  async update(input: UpdateAccountInput): Promise<Account> {
    const db = await getDatabase();
    await db.execAsync('BEGIN TRANSACTION');

    try {
      const updateData: any = {};
      
      if (input.type !== undefined) updateData.type = input.type;
      
      // Encrypt fields if provided
      if (input.name !== undefined) {
        updateData.name = await encrypt(input.name);
      }
      if (input.bank_name !== undefined) {
        updateData.bank_name = input.bank_name ? await encrypt(input.bank_name) : null;
      }
      if (input.credit_limit !== undefined) {
        updateData.credit_limit = input.credit_limit !== null && input.credit_limit !== undefined
          ? await encryptAmount(input.credit_limit)
          : null;
      }
      if (input.billing_start_date !== undefined) {
        updateData.billing_start_date = input.billing_start_date ? await encrypt(input.billing_start_date) : null;
      }
      if (input.billing_end_date !== undefined) {
        updateData.billing_end_date = input.billing_end_date ? await encrypt(input.billing_end_date) : null;
      }
      if (input.payment_due_date !== undefined) {
        updateData.payment_due_date = input.payment_due_date ? await encrypt(input.payment_due_date) : null;
      }

      // Update account
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

      await db.execAsync('COMMIT');

      const account = await this.findById(input.id);
      if (!account) {
        throw new Error('Account not found');
      }
      return account;
    } catch (error) {
      await db.execAsync('ROLLBACK');
      console.error('Error updating account:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to update account');
    }
  }

  async findByType(type: Account['type']): Promise<Account[]> {
    return this.executeQuery<Account>(
      `SELECT * FROM ${this.tableName} WHERE type = ? AND deleted_at IS NULL ORDER BY created_at DESC`,
      [type]
    );
  }

  /**
   * Decrypt account for display
   */
  async decryptAccount(account: Account): Promise<DecryptedAccount> {
    const name = await decrypt(account.name);
    const bank_name = account.bank_name ? await decrypt(account.bank_name) : null;
    const credit_limit = account.credit_limit ? await decryptAmount(account.credit_limit) : null;
    const billing_start_date = account.billing_start_date ? await decrypt(account.billing_start_date) : null;
    const billing_end_date = account.billing_end_date ? await decrypt(account.billing_end_date) : null;
    const payment_due_date = account.payment_due_date ? await decrypt(account.payment_due_date) : null;

    return {
      ...account,
      name,
      bank_name,
      credit_limit,
      billing_start_date,
      billing_end_date,
      payment_due_date,
    };
  }

  /**
   * Decrypt multiple accounts
   */
  async decryptAccounts(accounts: Account[]): Promise<DecryptedAccount[]> {
    return Promise.all(accounts.map((a) => this.decryptAccount(a)));
  }
}

export const accountRepository = new AccountRepository();

