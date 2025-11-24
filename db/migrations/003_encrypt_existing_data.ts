import * as SQLite from 'expo-sqlite';
import { encrypt, encryptAmount, isEncrypted } from '@/services/encryption';
import { log } from '@/utils/logger';

/**
 * Migration to encrypt existing data in all tables
 * This migration encrypts:
 * - Accounts: name, bank_name, credit_limit, billing dates
 * - Categories: name
 * - Tags: name
 * - Transactions: already encrypted (but we verify)
 */
export async function encryptExistingData(db: SQLite.SQLiteDatabase): Promise<void> {
  log('Starting data encryption migration...');
  
  await db.execAsync('BEGIN TRANSACTION');
  
  try {
    // Encrypt Accounts
    // Query credit_limit as TEXT to handle both encrypted (TEXT) and unencrypted (REAL) values
    const accounts = await db.getAllAsync<{
      id: number;
      name: string;
      bank_name: string | null;
      credit_limit: string | number | null;
      billing_start_date: string | null;
      billing_end_date: string | null;
      payment_due_date: string | null;
    }>('SELECT id, name, bank_name, CAST(credit_limit AS TEXT) as credit_limit, billing_start_date, billing_end_date, payment_due_date FROM accounts WHERE deleted_at IS NULL');

    log(`Encrypting ${accounts.length} accounts...`);
    
    for (const account of accounts) {
      const updates: string[] = [];
      const values: any[] = [];
      
      // Encrypt name if not already encrypted
      if (account.name && !isEncrypted(account.name)) {
        const encryptedName = await encrypt(account.name);
        updates.push('name = ?');
        values.push(encryptedName);
      }
      
      // Encrypt bank_name if not already encrypted
      if (account.bank_name && !isEncrypted(account.bank_name)) {
        const encryptedBankName = await encrypt(account.bank_name);
        updates.push('bank_name = ?');
        values.push(encryptedBankName);
      }
      
      // Encrypt credit_limit if not already encrypted
      if (account.credit_limit !== null && account.credit_limit !== undefined) {
        // credit_limit comes as string from CAST, check if it's already encrypted
        const creditLimitStr = String(account.credit_limit);
        if (!isEncrypted(creditLimitStr)) {
          // If not encrypted, parse as number and encrypt
          const creditLimitNum = typeof account.credit_limit === 'number' 
            ? account.credit_limit 
            : parseFloat(creditLimitStr);
          if (!isNaN(creditLimitNum)) {
            const encryptedCreditLimit = await encryptAmount(creditLimitNum);
            updates.push('credit_limit = ?');
            values.push(encryptedCreditLimit);
          }
        }
      }
      
      // Encrypt billing dates if not already encrypted
      if (account.billing_start_date && !isEncrypted(account.billing_start_date)) {
        const encryptedBillingStartDate = await encrypt(account.billing_start_date);
        updates.push('billing_start_date = ?');
        values.push(encryptedBillingStartDate);
      }
      
      if (account.billing_end_date && !isEncrypted(account.billing_end_date)) {
        const encryptedBillingEndDate = await encrypt(account.billing_end_date);
        updates.push('billing_end_date = ?');
        values.push(encryptedBillingEndDate);
      }
      
      if (account.payment_due_date && !isEncrypted(account.payment_due_date)) {
        const encryptedPaymentDueDate = await encrypt(account.payment_due_date);
        updates.push('payment_due_date = ?');
        values.push(encryptedPaymentDueDate);
      }
      
      // Update if there are any fields to encrypt
      if (updates.length > 0) {
        values.push(account.id);
        await db.runAsync(
          `UPDATE accounts SET ${updates.join(', ')}, updated_at = datetime('now'), is_synced = 0 WHERE id = ?`,
          values
        );
      }
    }
    
    // Encrypt Categories
    const categories = await db.getAllAsync<{
      id: number;
      name: string;
    }>('SELECT id, name FROM categories WHERE deleted_at IS NULL');

    log(`Encrypting ${categories.length} categories...`);
    
    for (const category of categories) {
      if (category.name && !isEncrypted(category.name)) {
        const encryptedName = await encrypt(category.name);
        await db.runAsync(
          `UPDATE categories SET name = ?, updated_at = datetime('now'), is_synced = 0 WHERE id = ?`,
          [encryptedName, category.id]
        );
      }
    }
    
    // Encrypt Tags
    const tags = await db.getAllAsync<{
      id: number;
      name: string;
    }>('SELECT id, name FROM tags WHERE deleted_at IS NULL');

    log(`Encrypting ${tags.length} tags...`);
    
    for (const tag of tags) {
      if (tag.name && !isEncrypted(tag.name)) {
        const encryptedName = await encrypt(tag.name);
        await db.runAsync(
          `UPDATE tags SET name = ?, updated_at = datetime('now'), is_synced = 0 WHERE id = ?`,
          [encryptedName, tag.id]
        );
      }
    }
    
    // Verify Transactions (they should already be encrypted, but we check)
    const transactions = await db.getAllAsync<{
      id: number;
      amount: string;
      note: string | null;
      payment_mode: string;
    }>('SELECT id, amount, note, payment_mode FROM transactions WHERE deleted_at IS NULL LIMIT 100');

    log(`Verifying ${transactions.length} transactions (sample)...`);
    
    let transactionUpdates = 0;
    for (const transaction of transactions) {
      const updates: string[] = [];
      const values: any[] = [];
      
      // Check amount
      if (transaction.amount && !isEncrypted(transaction.amount)) {
        // If amount is a number string, encrypt it
        const amountNum = parseFloat(transaction.amount);
        if (!isNaN(amountNum)) {
          const encryptedAmount = await encryptAmount(amountNum);
          updates.push('amount = ?');
          values.push(encryptedAmount);
        }
      }
      
      // Check note
      if (transaction.note && !isEncrypted(transaction.note)) {
        const encryptedNote = await encrypt(transaction.note);
        updates.push('note = ?');
        values.push(encryptedNote);
      }
      
      // Check payment_mode
      if (transaction.payment_mode && !isEncrypted(transaction.payment_mode)) {
        const encryptedPaymentMode = await encrypt(transaction.payment_mode);
        updates.push('payment_mode = ?');
        values.push(encryptedPaymentMode);
      }
      
      if (updates.length > 0) {
        values.push(transaction.id);
        await db.runAsync(
          `UPDATE transactions SET ${updates.join(', ')}, updated_at = datetime('now'), is_synced = 0 WHERE id = ?`,
          values
        );
        transactionUpdates++;
      }
    }
    
    if (transactionUpdates > 0) {
      log(`Updated ${transactionUpdates} transactions that were not encrypted`);
      
      // Encrypt remaining transactions in batches
      const allTransactions = await db.getAllAsync<{
        id: number;
        amount: string;
        note: string | null;
        payment_mode: string;
      }>('SELECT id, amount, note, payment_mode FROM transactions WHERE deleted_at IS NULL');
      
      for (const transaction of allTransactions.slice(100)) {
        const updates: string[] = [];
        const values: any[] = [];
        
        if (transaction.amount && !isEncrypted(transaction.amount)) {
          const amountNum = parseFloat(transaction.amount);
          if (!isNaN(amountNum)) {
            const encryptedAmount = await encryptAmount(amountNum);
            updates.push('amount = ?');
            values.push(encryptedAmount);
          }
        }
        
        if (transaction.note && !isEncrypted(transaction.note)) {
          const encryptedNote = await encrypt(transaction.note);
          updates.push('note = ?');
          values.push(encryptedNote);
        }
        
        if (transaction.payment_mode && !isEncrypted(transaction.payment_mode)) {
          const encryptedPaymentMode = await encrypt(transaction.payment_mode);
          updates.push('payment_mode = ?');
          values.push(encryptedPaymentMode);
        }
        
        if (updates.length > 0) {
          values.push(transaction.id);
          await db.runAsync(
            `UPDATE transactions SET ${updates.join(', ')}, updated_at = datetime('now'), is_synced = 0 WHERE id = ?`,
            values
          );
        }
      }
    }
    
    await db.execAsync('COMMIT');
    log('Data encryption migration completed successfully');
  } catch (error) {
    await db.execAsync('ROLLBACK');
    logError('Error during data encryption migration:', error);
    throw error;
  }
}

