import {
  CreateTransactionInput,
  Transaction,
  UpdateTransactionInput,
} from "@/db/schema/types";
import { getDatabase } from "@/db/sqlite/db";
import {
  decrypt,
  decryptAmount,
  encrypt,
  encryptAmount,
} from "@/services/encryption";
import { logError, logPerformance } from "@/utils/logger";
import { BaseRepository } from "./base.repository";
import { transactionTagRepository } from "./transaction-tag.repository";

export class TransactionRepository extends BaseRepository<Transaction> {
  protected tableName = "transactions"

  /**
   * Helper method to add date filter conditions to a query
   * Handles the case where startDate and endDate are the same (single day filter)
   */
  private addDateFilterConditions(
    conditions: string[],
    params: any[],
    startDate?: string,
    endDate?: string,
    tableAlias: string = "t"
  ): void {
    // Normalize dates by trimming whitespace for accurate comparison
    const normalizedStartDate = startDate?.trim();
    const normalizedEndDate = endDate?.trim();
    
    if (normalizedStartDate && normalizedEndDate && normalizedStartDate === normalizedEndDate) {
      // Same date - use equality check for better performance and clarity
      conditions.push(`${tableAlias}.date = ?`);
      params.push(normalizedStartDate);
    } else {
      // Different dates or only one date provided
      if (normalizedStartDate) {
        conditions.push(`${tableAlias}.date >= ?`);
        params.push(normalizedStartDate);
      }
      if (normalizedEndDate) {
        conditions.push(`${tableAlias}.date <= ?`);
        params.push(normalizedEndDate);
      }
    }
  }
  protected primaryKey = "id";

  /**
   * Helper function to batch decrypt amounts to avoid overwhelming the system
   * Processes in chunks to balance performance and memory usage
   * Uses progressively smaller batches for larger datasets to prevent system overload
   * Processes multiple batches concurrently for better throughput
   */
  private async batchDecryptAmounts<T extends { amount: string }>(
    items: T[],
    transform: (item: T, decryptedAmount: number) => Omit<T, 'amount'> & { amount: number }
  ): Promise<Array<Omit<T, 'amount'> & { amount: number }>> {
    if (items.length === 0) return [];
    
    // Use progressively smaller batches for larger datasets
    // This prevents overwhelming the system with too many parallel operations
    // Smaller batches = better memory management and less context switching
    // For medium datasets, use smaller batches with concurrency for better throughput
    let BATCH_SIZE: number;
    let CONCURRENT_BATCHES: number; // Number of batches to process concurrently
    
    if (items.length > 15000) {
      BATCH_SIZE = 50; // Very large datasets: 50 at a time
      CONCURRENT_BATCHES = 3; // Process 3 batches concurrently (150 total operations)
    } else if (items.length > 10000) {
      BATCH_SIZE = 100; // Large datasets: 100 at a time
      CONCURRENT_BATCHES = 3; // Process 3 batches concurrently (300 total operations)
    } else if (items.length > 5000) {
      BATCH_SIZE = 100; // Medium-large datasets: 100 at a time
      CONCURRENT_BATCHES = 4; // Process 4 batches concurrently (400 total operations)
    } else if (items.length > 1000) {
      BATCH_SIZE = 100; // Medium datasets: 100 at a time
      CONCURRENT_BATCHES = 5; // Process 5 batches concurrently (500 total operations)
    } else if (items.length > 500) {
      BATCH_SIZE = 50; // Small-medium datasets: 50 at a time
      CONCURRENT_BATCHES = 4; // Process 4 batches concurrently (200 total operations)
    } else {
      BATCH_SIZE = 100; // Small datasets: 100 at a time
      CONCURRENT_BATCHES = 1; // Process 1 batch at a time
    }
    
    const results: Array<Omit<T, 'amount'> & { amount: number }> = [];
    const batches: T[][] = [];
    
    // Create all batches
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      batches.push(items.slice(i, i + BATCH_SIZE));
    }
    
    // Process batches with controlled concurrency
    for (let i = 0; i < batches.length; i += CONCURRENT_BATCHES) {
      const concurrentBatches = batches.slice(i, i + CONCURRENT_BATCHES);
      
      // Process multiple batches concurrently
      const batchResults = await Promise.all(
        concurrentBatches.map(async (batch) => {
          return Promise.all(
            batch.map(async (item) => {
              const decryptedAmount = await decryptAmount(item.amount);
              return transform(item, decryptedAmount);
            })
          );
        })
      );
      
      // Flatten and add results
      for (const batchResult of batchResults) {
        results.push(...batchResult);
      }
    }
    
    return results;
  }

  async create(input: CreateTransactionInput): Promise<Transaction> {
    // Encrypt sensitive fields
    const encryptedAmount = await encryptAmount(input.amount);
    const encryptedNote = input.note ? await encrypt(input.note) : null;
    const encryptedPaymentMode = input.payment_mode ? await encrypt(input.payment_mode) : null;

    const db = await getDatabase();

    // Start transaction
    await db.execAsync("BEGIN TRANSACTION");

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

      await db.execAsync("COMMIT");

      const transaction = await this.findById(transactionId);
      if (!transaction) {
        await db.execAsync("ROLLBACK");
        throw new Error("Failed to create transaction");
      }
      return transaction;
    } catch (error) {
      await db.execAsync("ROLLBACK");
      logError("Error creating transaction:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to create transaction"
      );
    }
  }

  async update(input: UpdateTransactionInput): Promise<Transaction> {
    const db = await getDatabase();
    await db.execAsync("BEGIN TRANSACTION");

    try {
      // Get existing transaction
      const existing = await this.findById(input.id);
      if (!existing) {
        throw new Error("Transaction not found");
      }

      // Prepare update data
      const updateData: any = {};

      if (input.account_id !== undefined)
        updateData.account_id = input.account_id;
      if (input.category_id !== undefined)
        updateData.category_id = input.category_id;
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
        updateData.payment_mode = input.payment_mode ? await encrypt(input.payment_mode) : null;
      }

      // Update transaction
      if (Object.keys(updateData).length > 0) {
        const fields = Object.keys(updateData)
          .map((key) => `${key} = ?`)
          .join(", ");
        const values: (string | number | null)[] = Object.values(
          updateData
        ) as (string | number | null)[];
        const now = new Date().toISOString();

        await db.runAsync(
          `UPDATE ${this.tableName} SET ${fields}, updated_at = ?, is_synced = 0 WHERE id = ?`,
          [...values, now, input.id]
        );
      }

      // Update tags if provided
      if (input.tag_ids !== undefined) {
        await transactionTagRepository.setTransactionTags(
          input.id,
          input.tag_ids
        );
      }

      await db.execAsync("COMMIT");

      const transaction = await this.findById(input.id);
      if (!transaction) {
        throw new Error("Transaction not found");
      }
      return transaction;
    } catch (error) {
      await db.execAsync("ROLLBACK");
      logError("Error updating transaction:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to update transaction"
      );
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

  async findByDateRange(
    startDate: string,
    endDate: string
  ): Promise<Transaction[]> {
    // Normalize dates by trimming whitespace for accurate comparison
    const normalizedStartDate = startDate.trim();
    const normalizedEndDate = endDate.trim();
    
    // If start and end dates are the same, use equality check for better performance
    if (normalizedStartDate === normalizedEndDate) {
      const query = `SELECT * FROM ${this.tableName} 
         WHERE date = ? AND deleted_at IS NULL 
         ORDER BY date DESC, created_at DESC`;
      const params = [normalizedStartDate];
      return this.executeQuery<Transaction>(query, params);
    }
    const query = `SELECT * FROM ${this.tableName} 
       WHERE date >= ? AND date <= ? AND deleted_at IS NULL 
       ORDER BY date DESC, created_at DESC`;
    const params = [normalizedStartDate, normalizedEndDate];
    return this.executeQuery<Transaction>(query, params);
  }

  async findByType(type: Transaction["type"]): Promise<Transaction[]> {
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
    type?: Transaction["type"];
    types?: Transaction["type"][];
    accountType?: string;
    accountTypes?: string[];
  }): Promise<Transaction[]> {
    let query = `SELECT DISTINCT t.* FROM ${this.tableName} t`;
    const params: any[] = [];
    const conditions: string[] = ["t.deleted_at IS NULL"];
    let hasJoin = false;

    // Handle account filters (support both single and array)
    const accountIds =
      filters?.accountIds || (filters?.accountId ? [filters.accountId] : []);
    if (accountIds.length > 0) {
      const placeholders = accountIds.map(() => "?").join(",");
      conditions.push(`t.account_id IN (${placeholders})`);
      params.push(...accountIds);
    }

    // Handle tag filters (support both single and array)
    const tagIds = filters?.tagIds || (filters?.tagId ? [filters.tagId] : []);
    if (tagIds.length > 0) {
      if (!hasJoin) {
        query += " INNER JOIN transaction_tags tt ON t.id = tt.transaction_id";
        hasJoin = true;
      }
      const placeholders = tagIds.map(() => "?").join(",");
      conditions.push(`tt.tag_id IN (${placeholders})`);
      params.push(...tagIds);
    }

    // Handle category filters (support both single and array)
    const categoryIds =
      filters?.categoryIds || (filters?.categoryId ? [filters.categoryId] : []);
    if (categoryIds.length > 0) {
      const placeholders = categoryIds.map(() => "?").join(",");
      conditions.push(`t.category_id IN (${placeholders})`);
      params.push(...categoryIds);
    }

    // Handle date filters
    this.addDateFilterConditions(conditions, params, filters?.startDate, filters?.endDate);

    // Handle transaction type filters (support both single and array)
    const types = filters?.types || (filters?.type ? [filters.type] : []);
    if (types.length > 0) {
      const placeholders = types.map(() => "?").join(",");
      conditions.push(`t.type IN (${placeholders})`);
      params.push(...types);
    }

    // Handle account type filters (support both single and array)
    // Note: account type is stored in accounts table, so we need to join
    const accountTypes =
      filters?.accountTypes ||
      (filters?.accountType ? [filters.accountType] : []);
    if (accountTypes.length > 0) {
      if (!hasJoin) {
        query += " INNER JOIN accounts a ON t.account_id = a.id";
        hasJoin = true;
      } else if (!query.includes("INNER JOIN accounts")) {
        query += " INNER JOIN accounts a ON t.account_id = a.id";
      }
      const placeholders = accountTypes.map(() => "?").join(",");
      conditions.push(`a.type IN (${placeholders})`);
      params.push(...accountTypes);
    }

    query += ` WHERE ${conditions.join(
      " AND "
    )} ORDER BY t.date DESC, t.created_at DESC`;

    return this.executeQuery<Transaction>(query, params);
  }

  /**
   * Find transactions with filters and pagination
   */
  async findAllWithFiltersPaginated(
    filters?: {
      accountId?: number;
      accountIds?: number[];
      tagId?: number;
      tagIds?: number[];
      categoryId?: number;
      categoryIds?: number[];
      startDate?: string;
      endDate?: string;
      type?: Transaction["type"];
      types?: Transaction["type"][];
      accountType?: string;
      accountTypes?: string[];
    },
    limit: number = 20,
    offset: number = 0
  ): Promise<{ transactions: Transaction[]; hasMore: boolean; total: number }> {
    let query = `SELECT DISTINCT t.* FROM ${this.tableName} t`;
    const params: any[] = [];
    const conditions: string[] = ["t.deleted_at IS NULL"];
    let hasJoin = false;

    // Handle account filters
    const accountIds =
      filters?.accountIds || (filters?.accountId ? [filters.accountId] : []);
    if (accountIds.length > 0) {
      const placeholders = accountIds.map(() => "?").join(",");
      conditions.push(`t.account_id IN (${placeholders})`);
      params.push(...accountIds);
    }

    // Handle tag filters
    const tagIds = filters?.tagIds || (filters?.tagId ? [filters.tagId] : []);
    if (tagIds.length > 0) {
      if (!hasJoin) {
        query += " INNER JOIN transaction_tags tt ON t.id = tt.transaction_id";
        hasJoin = true;
      }
      const placeholders = tagIds.map(() => "?").join(",");
      conditions.push(`tt.tag_id IN (${placeholders})`);
      params.push(...tagIds);
    }

    // Handle category filters
    const categoryIds =
      filters?.categoryIds || (filters?.categoryId ? [filters.categoryId] : []);
    if (categoryIds.length > 0) {
      const placeholders = categoryIds.map(() => "?").join(",");
      conditions.push(`t.category_id IN (${placeholders})`);
      params.push(...categoryIds);
    }

    // Handle date filters
    this.addDateFilterConditions(conditions, params, filters?.startDate, filters?.endDate);

    // Handle transaction type filters
    const types = filters?.types || (filters?.type ? [filters.type] : []);
    if (types.length > 0) {
      const placeholders = types.map(() => "?").join(",");
      conditions.push(`t.type IN (${placeholders})`);
      params.push(...types);
    }

    // Handle account type filters
    const accountTypes =
      filters?.accountTypes ||
      (filters?.accountType ? [filters.accountType] : []);
    if (accountTypes.length > 0) {
      if (!hasJoin) {
        query += " INNER JOIN accounts a ON t.account_id = a.id";
        hasJoin = true;
      } else if (!query.includes("INNER JOIN accounts")) {
        query += " INNER JOIN accounts a ON t.account_id = a.id";
      }
      const placeholders = accountTypes.map(() => "?").join(",");
      conditions.push(`a.type IN (${placeholders})`);
      params.push(...accountTypes);
    }

    // Get total count - build count query with same joins
    let countQuery = `SELECT COUNT(DISTINCT t.id) as total FROM ${this.tableName} t`;
    const countParams: any[] = [];

    // Rebuild joins for count query
    let countHasJoin = false;
    if (tagIds.length > 0) {
      countQuery +=
        " INNER JOIN transaction_tags tt ON t.id = tt.transaction_id";
      countHasJoin = true;
    }
    if (accountTypes.length > 0) {
      if (!countHasJoin || !countQuery.includes("INNER JOIN accounts")) {
        countQuery += " INNER JOIN accounts a ON t.account_id = a.id";
      }
    }

    // Rebuild conditions for count (same as main query)
    const countConditions: string[] = ["t.deleted_at IS NULL"];
    if (accountIds.length > 0) {
      const placeholders = accountIds.map(() => "?").join(",");
      countConditions.push(`t.account_id IN (${placeholders})`);
      countParams.push(...accountIds);
    }
    if (tagIds.length > 0) {
      const placeholders = tagIds.map(() => "?").join(",");
      countConditions.push(`tt.tag_id IN (${placeholders})`);
      countParams.push(...tagIds);
    }
    if (categoryIds.length > 0) {
      const placeholders = categoryIds.map(() => "?").join(",");
      countConditions.push(`t.category_id IN (${placeholders})`);
      countParams.push(...categoryIds);
    }
    // Handle date filters for count query
    if (filters?.startDate && filters?.endDate && filters.startDate === filters.endDate) {
      countConditions.push("t.date = ?");
      countParams.push(filters.startDate);
    } else {
      if (filters?.startDate) {
        countConditions.push("t.date >= ?");
        countParams.push(filters.startDate);
      }
      if (filters?.endDate) {
        countConditions.push("t.date <= ?");
        countParams.push(filters.endDate);
      }
    }
    if (types.length > 0) {
      const placeholders = types.map(() => "?").join(",");
      countConditions.push(`t.type IN (${placeholders})`);
      countParams.push(...types);
    }
    if (accountTypes.length > 0) {
      const placeholders = accountTypes.map(() => "?").join(",");
      countConditions.push(`a.type IN (${placeholders})`);
      countParams.push(...accountTypes);
    }

    countQuery += ` WHERE ${countConditions.join(" AND ")}`;
    const countResult = await this.executeQuery<{ total: number }>(
      countQuery,
      countParams
    );
    const total = countResult[0]?.total || 0;

    // Get paginated results
    query += ` WHERE ${conditions.join(
      " AND "
    )} ORDER BY t.date DESC, t.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const transactions = await this.executeQuery<Transaction>(query, params);
    const hasMore = offset + transactions.length < total;

    return {
      transactions,
      hasMore,
      total,
    };
  }

  /**
   * Decrypt transaction for display
   */
  async decryptTransaction(transaction: Transaction): Promise<
    Omit<Transaction, "amount" | "note" | "payment_mode"> & {
      amount: number;
      note: string | null;
      payment_mode: string | null;
    }
  > {
    const amount = await decryptAmount(transaction.amount);
    const note = transaction.note ? await decrypt(transaction.note) : null;
    const payment_mode = transaction.payment_mode ? await decrypt(transaction.payment_mode) : null;

    return {
      ...transaction,
      amount,
      note,
      payment_mode,
    };
  }

  /**
   * Decrypt multiple transactions
   * Optimized: For small batches, uses field-based parallel decryption
   * For large batches, processes in chunks to avoid overwhelming the system
   */
  async decryptTransactions(transactions: Transaction[]): Promise<
    Array<
      Omit<Transaction, "amount" | "note" | "payment_mode"> & {
        amount: number;
        note: string | null;
        payment_mode: string | null;
      }
    >
  > {
    if (transactions.length === 0) return [];

    // Use field-based parallel decryption, but process in smaller batches
    // to avoid overwhelming the system with too many parallel operations
    const BATCH_SIZE = 10; // Process 10 transactions at a time
    
    // Process in batches, using field-based parallel decryption within each batch
    const results: Array<
      Omit<Transaction, "amount" | "note" | "payment_mode"> & {
        amount: number;
        note: string | null;
        payment_mode: string | null;
      }
    > = [];

    for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
      const batch = transactions.slice(i, i + BATCH_SIZE);
      
      // Decrypt all fields in parallel for this batch
    const amounts = await Promise.all(
        batch.map((t) => decryptAmount(t.amount))
    );

    const notes = await Promise.all(
        batch.map((t) => (t.note ? decrypt(t.note) : Promise.resolve(null)))
    );

    const paymentModes = await Promise.all(
        batch.map((t) => (t.payment_mode ? decrypt(t.payment_mode) : Promise.resolve(null)))
    );

      // Combine results for this batch
      const decryptedBatch = batch.map((t, index) => ({
      ...t,
      amount: amounts[index],
      note: notes[index],
      payment_mode: paymentModes[index],
    }));
      
      results.push(...decryptedBatch);
    }

    return results;
  }

  /**
   * Optimized method to calculate summary totals without fetching full transactions
   * Only fetches and decrypts amounts, not notes or payment_mode
   */
  async calculateSummaryTotals(filters?: {
    accountId?: number;
    accountIds?: number[];
    tagId?: number;
    tagIds?: number[];
    categoryId?: number;
    categoryIds?: number[];
    startDate?: string;
    endDate?: string;
    type?: Transaction["type"];
    types?: Transaction["type"][];
    accountType?: string;
    accountTypes?: string[];
  }): Promise<{
    totalExpenses: number;
    totalIncome: number;
    expenseCount: number;
    incomeCount: number;
    transactionCount: number;
  }> {
    let query = `SELECT t.id, t.amount, t.type FROM ${this.tableName} t`;
    const params: any[] = [];
    const conditions: string[] = ["t.deleted_at IS NULL"];
    let hasJoin = false;

    // Handle account filters
    const accountIds =
      filters?.accountIds || (filters?.accountId ? [filters.accountId] : []);
    if (accountIds.length > 0) {
      const placeholders = accountIds.map(() => "?").join(",");
      conditions.push(`t.account_id IN (${placeholders})`);
      params.push(...accountIds);
    }

    // Handle tag filters
    const tagIds = filters?.tagIds || (filters?.tagId ? [filters.tagId] : []);
    if (tagIds.length > 0) {
      if (!hasJoin) {
        query += " INNER JOIN transaction_tags tt ON t.id = tt.transaction_id";
        hasJoin = true;
      }
      const placeholders = tagIds.map(() => "?").join(",");
      conditions.push(`tt.tag_id IN (${placeholders})`);
      params.push(...tagIds);
    }

    // Handle category filters
    const categoryIds =
      filters?.categoryIds || (filters?.categoryId ? [filters.categoryId] : []);
    if (categoryIds.length > 0) {
      const placeholders = categoryIds.map(() => "?").join(",");
      conditions.push(`t.category_id IN (${placeholders})`);
      params.push(...categoryIds);
    }

    // Handle date filters
    this.addDateFilterConditions(conditions, params, filters?.startDate, filters?.endDate);

    // Handle transaction type filters
    const types = filters?.types || (filters?.type ? [filters.type] : []);
    if (types.length > 0) {
      const placeholders = types.map(() => "?").join(",");
      conditions.push(`t.type IN (${placeholders})`);
      params.push(...types);
    }

    // Handle account type filters
    const accountTypes =
      filters?.accountTypes ||
      (filters?.accountType ? [filters.accountType] : []);
    if (accountTypes.length > 0) {
      if (!hasJoin) {
        query += " INNER JOIN accounts a ON t.account_id = a.id";
        hasJoin = true;
      } else if (!query.includes("INNER JOIN accounts")) {
        query += " INNER JOIN accounts a ON t.account_id = a.id";
      }
      const placeholders = accountTypes.map(() => "?").join(",");
      conditions.push(`a.type IN (${placeholders})`);
      params.push(...accountTypes);
    }

    query += ` WHERE ${conditions.join(" AND ")}`;

    // Execute query to get only id, amount, type
    const results = await this.executeQuery<{
      id: number;
      amount: string;
      type: Transaction["type"];
    }>(query, params);

    // Decrypt amounts in batches to avoid overwhelming the system
    const decryptedAmounts = await this.batchDecryptAmounts(
      results,
      (row, amount) => ({
        id: row.id,
        amount,
        type: row.type,
      })
    );

    // Calculate totals
    let totalExpenses = 0;
    let totalIncome = 0;
    let expenseCount = 0;
    let incomeCount = 0;

    for (const row of decryptedAmounts) {
      if (row.type === "expense") {
        totalExpenses += row.amount;
        expenseCount += 1;
      } else {
        totalIncome += row.amount;
        incomeCount += 1;
      }
    }

    return {
      totalExpenses,
      totalIncome,
      expenseCount,
      incomeCount,
      transactionCount: results.length,
    };
  }

  /**
   * Optimized method to calculate category breakdown without fetching full transactions
   * Only fetches and decrypts amounts with category_id
   */
  async calculateCategoryBreakdown(filters?: {
    accountId?: number;
    accountIds?: number[];
    tagId?: number;
    tagIds?: number[];
    categoryId?: number;
    categoryIds?: number[];
    startDate?: string;
    endDate?: string;
    type?: Transaction["type"];
    types?: Transaction["type"][];
    accountType?: string;
    accountTypes?: string[];
  }): Promise<
    Array<{ categoryId: number | null; amount: number; count: number }>
  > {
    let query = `SELECT t.id, t.amount, t.type, t.category_id FROM ${this.tableName} t`;
    const params: any[] = [];
    const conditions: string[] = ["t.deleted_at IS NULL"];
    let hasJoin = false;

    // Handle account filters
    const accountIds =
      filters?.accountIds || (filters?.accountId ? [filters.accountId] : []);
    if (accountIds.length > 0) {
      const placeholders = accountIds.map(() => "?").join(",");
      conditions.push(`t.account_id IN (${placeholders})`);
      params.push(...accountIds);
    }

    // Handle tag filters
    const tagIds = filters?.tagIds || (filters?.tagId ? [filters.tagId] : []);
    if (tagIds.length > 0) {
      if (!hasJoin) {
        query += " INNER JOIN transaction_tags tt ON t.id = tt.transaction_id";
        hasJoin = true;
      }
      const placeholders = tagIds.map(() => "?").join(",");
      conditions.push(`tt.tag_id IN (${placeholders})`);
      params.push(...tagIds);
    }

    // Handle category filters
    const categoryIds =
      filters?.categoryIds || (filters?.categoryId ? [filters.categoryId] : []);
    if (categoryIds.length > 0) {
      const placeholders = categoryIds.map(() => "?").join(",");
      conditions.push(`t.category_id IN (${placeholders})`);
      params.push(...categoryIds);
    }

    // Handle date filters
    this.addDateFilterConditions(conditions, params, filters?.startDate, filters?.endDate);

    // Handle transaction type filters - only expenses for category breakdown
    const types =
      filters?.types || (filters?.type ? [filters.type] : ["expense"]);
    if (types.length > 0) {
      const placeholders = types.map(() => "?").join(",");
      conditions.push(`t.type IN (${placeholders})`);
      params.push(...types);
    }

    // Handle account type filters
    const accountTypes =
      filters?.accountTypes ||
      (filters?.accountType ? [filters.accountType] : []);
    if (accountTypes.length > 0) {
      if (!hasJoin) {
        query += " INNER JOIN accounts a ON t.account_id = a.id";
        hasJoin = true;
      } else if (!query.includes("INNER JOIN accounts")) {
        query += " INNER JOIN accounts a ON t.account_id = a.id";
      }
      const placeholders = accountTypes.map(() => "?").join(",");
      conditions.push(`a.type IN (${placeholders})`);
      params.push(...accountTypes);
    }

    query += ` WHERE ${conditions.join(" AND ")}`;

    // Execute query to get only id, amount, type, category_id
    const results = await this.executeQuery<{
      id: number;
      amount: string;
      type: Transaction["type"];
      category_id: number | null;
    }>(query, params);

    // Decrypt amounts in batches to avoid overwhelming the system
    const decryptedAmounts = await this.batchDecryptAmounts(
      results,
      (row, amount) => ({
        id: row.id,
        amount,
        type: row.type,
        category_id: row.category_id,
      })
    );

    // Group by category
    const categoryMap = new Map<
      number | null,
      { amount: number; count: number }
    >();

    for (const row of decryptedAmounts) {
      if (row.type === "expense") {
        const categoryId = row.category_id || null;
        const existing = categoryMap.get(categoryId) || { amount: 0, count: 0 };
        existing.amount += row.amount;
        existing.count += 1;
        categoryMap.set(categoryId, existing);
      }
    }

    // Convert to array
    return Array.from(categoryMap.entries()).map(([categoryId, data]) => ({
      categoryId,
      amount: data.amount,
      count: data.count,
    }));
  }

  /**
   * Optimized method to calculate daily spending patterns without fetching full transactions
   * Only fetches and decrypts amounts with date and type
   */
  async calculateDailyPatterns(filters?: {
    accountId?: number;
    accountIds?: number[];
    tagId?: number;
    tagIds?: number[];
    categoryId?: number;
    categoryIds?: number[];
    startDate?: string;
    endDate?: string;
    type?: Transaction["type"];
    types?: Transaction["type"][];
    accountType?: string;
    accountTypes?: string[];
  }): Promise<Array<{ dayIndex: number; totalAmount: number; count: number }>> {
    let query = `SELECT t.id, t.amount, t.type, t.date FROM ${this.tableName} t`;
    const params: any[] = [];
    const conditions: string[] = ["t.deleted_at IS NULL"];
    let hasJoin = false;

    // Handle account filters
    const accountIds =
      filters?.accountIds || (filters?.accountId ? [filters.accountId] : []);
    if (accountIds.length > 0) {
      const placeholders = accountIds.map(() => "?").join(",");
      conditions.push(`t.account_id IN (${placeholders})`);
      params.push(...accountIds);
    }

    // Handle tag filters
    const tagIds = filters?.tagIds || (filters?.tagId ? [filters.tagId] : []);
    if (tagIds.length > 0) {
      if (!hasJoin) {
        query += " INNER JOIN transaction_tags tt ON t.id = tt.transaction_id";
        hasJoin = true;
      }
      const placeholders = tagIds.map(() => "?").join(",");
      conditions.push(`tt.tag_id IN (${placeholders})`);
      params.push(...tagIds);
    }

    // Handle category filters
    const categoryIds =
      filters?.categoryIds || (filters?.categoryId ? [filters.categoryId] : []);
    if (categoryIds.length > 0) {
      const placeholders = categoryIds.map(() => "?").join(",");
      conditions.push(`t.category_id IN (${placeholders})`);
      params.push(...categoryIds);
    }

    // Handle date filters
    this.addDateFilterConditions(conditions, params, filters?.startDate, filters?.endDate);

    // Handle transaction type filters - only expenses for daily patterns
    const types =
      filters?.types || (filters?.type ? [filters.type] : ["expense"]);
    if (types.length > 0) {
      const placeholders = types.map(() => "?").join(",");
      conditions.push(`t.type IN (${placeholders})`);
      params.push(...types);
    }

    // Handle account type filters
    const accountTypes =
      filters?.accountTypes ||
      (filters?.accountType ? [filters.accountType] : []);
    if (accountTypes.length > 0) {
      if (!hasJoin) {
        query += " INNER JOIN accounts a ON t.account_id = a.id";
        hasJoin = true;
      } else if (!query.includes("INNER JOIN accounts")) {
        query += " INNER JOIN accounts a ON t.account_id = a.id";
      }
      const placeholders = accountTypes.map(() => "?").join(",");
      conditions.push(`a.type IN (${placeholders})`);
      params.push(...accountTypes);
    }

    query += ` WHERE ${conditions.join(" AND ")}`;

    // Execute query to get only id, amount, type, date
    const results = await this.executeQuery<{
      id: number;
      amount: string;
      type: Transaction["type"];
      date: string;
    }>(query, params);

    // Decrypt amounts in batches to avoid overwhelming the system
    const BATCH_SIZE = 500; // Process 500 at a time
    const decryptedAmounts: Array<{
      id: number;
      amount: number;
      type: Transaction["type"];
      date: string;
    }> = [];
    
    for (let i = 0; i < results.length; i += BATCH_SIZE) {
      const batch = results.slice(i, i + BATCH_SIZE);
      const decryptedBatch = await Promise.all(
        batch.map(async (row) => ({
        id: row.id,
        amount: await decryptAmount(row.amount),
        type: row.type,
        date: row.date,
      }))
    );
      decryptedAmounts.push(...decryptedBatch);
    }

    // Group by day of week
    const dayMap = new Map<number, { total: number; count: number }>();

    for (const row of decryptedAmounts) {
      if (row.type === "expense") {
        const date = new Date(row.date);
        const dayIndex = date.getDay();
        const existing = dayMap.get(dayIndex) || { total: 0, count: 0 };
        existing.total += row.amount;
        existing.count += 1;
        dayMap.set(dayIndex, existing);
      }
    }

    // Convert to array
    return Array.from(dayMap.entries()).map(([dayIndex, data]) => ({
      dayIndex,
      totalAmount: data.total,
      count: data.count,
    }));
  }

  /**
   * Optimized method to calculate monthly trends without fetching full transactions
   * Only fetches and decrypts amounts with date and type
   */
  async calculateMonthlyTrends(filters?: {
    accountId?: number;
    accountIds?: number[];
    tagId?: number;
    tagIds?: number[];
    categoryId?: number;
    categoryIds?: number[];
    startDate?: string;
    endDate?: string;
    type?: Transaction["type"];
    types?: Transaction["type"][];
    accountType?: string;
    accountTypes?: string[];
  }): Promise<
    Array<{ monthKey: string; expenses: number; income: number; count: number }>
  > {
    let query = `SELECT t.id, t.amount, t.type, t.date FROM ${this.tableName} t`;
    const params: any[] = [];
    const conditions: string[] = ["t.deleted_at IS NULL"];
    let hasJoin = false;

    // Handle account filters
    const accountIds =
      filters?.accountIds || (filters?.accountId ? [filters.accountId] : []);
    if (accountIds.length > 0) {
      const placeholders = accountIds.map(() => "?").join(",");
      conditions.push(`t.account_id IN (${placeholders})`);
      params.push(...accountIds);
    }

    // Handle tag filters
    const tagIds = filters?.tagIds || (filters?.tagId ? [filters.tagId] : []);
    if (tagIds.length > 0) {
      if (!hasJoin) {
        query += " INNER JOIN transaction_tags tt ON t.id = tt.transaction_id";
        hasJoin = true;
      }
      const placeholders = tagIds.map(() => "?").join(",");
      conditions.push(`tt.tag_id IN (${placeholders})`);
      params.push(...tagIds);
    }

    // Handle category filters
    const categoryIds =
      filters?.categoryIds || (filters?.categoryId ? [filters.categoryId] : []);
    if (categoryIds.length > 0) {
      const placeholders = categoryIds.map(() => "?").join(",");
      conditions.push(`t.category_id IN (${placeholders})`);
      params.push(...categoryIds);
    }

    // Handle date filters
    this.addDateFilterConditions(conditions, params, filters?.startDate, filters?.endDate);

    // Handle transaction type filters - allow both income and expenses for monthly trends
    const types =
      filters?.types || (filters?.type ? [filters.type] : undefined);
    if (types && types.length > 0) {
      const placeholders = types.map(() => "?").join(",");
      conditions.push(`t.type IN (${placeholders})`);
      params.push(...types);
    }

    // Handle account type filters
    const accountTypes =
      filters?.accountTypes ||
      (filters?.accountType ? [filters.accountType] : []);
    if (accountTypes.length > 0) {
      if (!hasJoin) {
        query += " INNER JOIN accounts a ON t.account_id = a.id";
        hasJoin = true;
      } else if (!query.includes("INNER JOIN accounts")) {
        query += " INNER JOIN accounts a ON t.account_id = a.id";
      }
      const placeholders = accountTypes.map(() => "?").join(",");
      conditions.push(`a.type IN (${placeholders})`);
      params.push(...accountTypes);
    }

    query += ` WHERE ${conditions.join(" AND ")}`;

    // Execute query to get only id, amount, type, date
    const results = await this.executeQuery<{
      id: number;
      amount: string;
      type: Transaction["type"];
      date: string;
    }>(query, params);

    // Decrypt amounts in batches to avoid overwhelming the system
    const BATCH_SIZE = 500; // Process 500 at a time
    const decryptedAmounts: Array<{
      id: number;
      amount: number;
      type: Transaction["type"];
      date: string;
    }> = [];
    
    for (let i = 0; i < results.length; i += BATCH_SIZE) {
      const batch = results.slice(i, i + BATCH_SIZE);
      const decryptedBatch = await Promise.all(
        batch.map(async (row) => ({
        id: row.id,
        amount: await decryptAmount(row.amount),
        type: row.type,
        date: row.date,
      }))
    );
      decryptedAmounts.push(...decryptedBatch);
    }

    // Group by month
    const monthMap = new Map<
      string,
      { expenses: number; income: number; count: number }
    >();

    for (const row of decryptedAmounts) {
      const date = new Date(row.date);
      const monthKey = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;
      const existing = monthMap.get(monthKey) || {
        expenses: 0,
        income: 0,
        count: 0,
      };

      if (row.type === "expense") {
        existing.expenses += row.amount;
      } else if (row.type === "income") {
        existing.income += row.amount;
      }
      existing.count += 1;
      monthMap.set(monthKey, existing);
    }

    // Convert to array
    return Array.from(monthMap.entries()).map(([monthKey, data]) => ({
      monthKey,
      expenses: data.expenses,
      income: data.income,
      count: data.count,
    }));
  }

  /**
   * Optimized method to calculate tag breakdown without fetching full transactions
   * Only fetches and decrypts amounts with transaction_id for tag joins
   */
  async calculateTagBreakdown(filters?: {
    accountId?: number;
    accountIds?: number[];
    tagId?: number;
    tagIds?: number[];
    categoryId?: number;
    categoryIds?: number[];
    startDate?: string;
    endDate?: string;
    type?: Transaction["type"];
    types?: Transaction["type"][];
    accountType?: string;
    accountTypes?: string[];
  }): Promise<Array<{ tagId: number | null; amount: number; count: number }>> {
    // Always join with transaction_tags to get tag information
    let query = `SELECT t.id, t.amount, t.type, tt.tag_id FROM ${this.tableName} t 
                 LEFT JOIN transaction_tags tt ON t.id = tt.transaction_id`;
    const params: any[] = [];
    const conditions: string[] = ["t.deleted_at IS NULL"];
    let hasJoin = true; // Already have transaction_tags join

    // Handle account filters
    const accountIds =
      filters?.accountIds || (filters?.accountId ? [filters.accountId] : []);
    if (accountIds.length > 0) {
      const placeholders = accountIds.map(() => "?").join(",");
      conditions.push(`t.account_id IN (${placeholders})`);
      params.push(...accountIds);
    }

    // Handle tag filters - if filtering by specific tags, use INNER JOIN instead
    const tagIds = filters?.tagIds || (filters?.tagId ? [filters.tagId] : []);
    if (tagIds.length > 0) {
      // Change to INNER JOIN when filtering by tags
      query = `SELECT t.id, t.amount, t.type, tt.tag_id FROM ${this.tableName} t 
               INNER JOIN transaction_tags tt ON t.id = tt.transaction_id`;
      const placeholders = tagIds.map(() => "?").join(",");
      conditions.push(`tt.tag_id IN (${placeholders})`);
      params.push(...tagIds);
    }

    // Handle category filters
    const categoryIds =
      filters?.categoryIds || (filters?.categoryId ? [filters.categoryId] : []);
    if (categoryIds.length > 0) {
      const placeholders = categoryIds.map(() => "?").join(",");
      conditions.push(`t.category_id IN (${placeholders})`);
      params.push(...categoryIds);
    }

    // Handle date filters
    this.addDateFilterConditions(conditions, params, filters?.startDate, filters?.endDate);

    // Handle transaction type filters - only expenses for tag breakdown
    const types =
      filters?.types || (filters?.type ? [filters.type] : ["expense"]);
    if (types.length > 0) {
      const placeholders = types.map(() => "?").join(",");
      conditions.push(`t.type IN (${placeholders})`);
      params.push(...types);
    }

    // Handle account type filters
    const accountTypes =
      filters?.accountTypes ||
      (filters?.accountType ? [filters.accountType] : []);
    if (accountTypes.length > 0) {
      if (!query.includes("INNER JOIN accounts")) {
        query += " INNER JOIN accounts a ON t.account_id = a.id";
      }
      const placeholders = accountTypes.map(() => "?").join(",");
      conditions.push(`a.type IN (${placeholders})`);
      params.push(...accountTypes);
    }

    query += ` WHERE ${conditions.join(" AND ")}`;

    // Execute query to get only id, amount, type, tag_id
    const results = await this.executeQuery<{
      id: number;
      amount: string;
      type: Transaction["type"];
      tag_id: number | null;
    }>(query, params);

    // Decrypt amounts in batches to avoid overwhelming the system
    const decryptedAmounts = await this.batchDecryptAmounts(
      results,
      (row, amount) => ({
        id: row.id,
        amount,
        type: row.type,
        tag_id: row.tag_id,
      })
    );

    // Group by tag (null means untagged)
    const tagMap = new Map<number | null, { amount: number; count: number }>();

    for (const row of decryptedAmounts) {
      if (row.type === "expense") {
        const tagId = row.tag_id || null;
        const existing = tagMap.get(tagId) || { amount: 0, count: 0 };
        existing.amount += row.amount;
        existing.count += 1;
        tagMap.set(tagId, existing);
      }
    }

    // Convert to array
    return Array.from(tagMap.entries()).map(([tagId, data]) => ({
      tagId,
      amount: data.amount,
      count: data.count,
    }));
  }

  /**
   * Optimized method to calculate account breakdown without fetching full transactions
   * Only fetches and decrypts amounts with account_id and type
   */
  async calculateAccountBreakdown(filters?: {
    accountId?: number;
    accountIds?: number[];
    tagId?: number;
    tagIds?: number[];
    categoryId?: number;
    categoryIds?: number[];
    startDate?: string;
    endDate?: string;
    type?: Transaction["type"];
    types?: Transaction["type"][];
    accountType?: string;
    accountTypes?: string[];
  }): Promise<
    Array<{
      accountId: number;
      expenses: number;
      income: number;
      count: number;
    }>
  > {
    let query = `SELECT t.id, t.amount, t.type, t.account_id FROM ${this.tableName} t`;
    const params: any[] = [];
    const conditions: string[] = ["t.deleted_at IS NULL"];
    let hasJoin = false;

    // Handle account filters
    const accountIds =
      filters?.accountIds || (filters?.accountId ? [filters.accountId] : []);
    if (accountIds.length > 0) {
      const placeholders = accountIds.map(() => "?").join(",");
      conditions.push(`t.account_id IN (${placeholders})`);
      params.push(...accountIds);
    }

    // Handle tag filters
    const tagIds = filters?.tagIds || (filters?.tagId ? [filters.tagId] : []);
    if (tagIds.length > 0) {
      if (!hasJoin) {
        query += " INNER JOIN transaction_tags tt ON t.id = tt.transaction_id";
        hasJoin = true;
      }
      const placeholders = tagIds.map(() => "?").join(",");
      conditions.push(`tt.tag_id IN (${placeholders})`);
      params.push(...tagIds);
    }

    // Handle category filters
    const categoryIds =
      filters?.categoryIds || (filters?.categoryId ? [filters.categoryId] : []);
    if (categoryIds.length > 0) {
      const placeholders = categoryIds.map(() => "?").join(",");
      conditions.push(`t.category_id IN (${placeholders})`);
      params.push(...categoryIds);
    }

    // Handle date filters
    this.addDateFilterConditions(conditions, params, filters?.startDate, filters?.endDate);

    // Handle transaction type filters - allow both income and expenses for account breakdown
    const types =
      filters?.types || (filters?.type ? [filters.type] : undefined);
    if (types && types.length > 0) {
      const placeholders = types.map(() => "?").join(",");
      conditions.push(`t.type IN (${placeholders})`);
      params.push(...types);
    }

    // Handle account type filters
    const accountTypes =
      filters?.accountTypes ||
      (filters?.accountType ? [filters.accountType] : []);
    if (accountTypes.length > 0) {
      if (!hasJoin) {
        query += " INNER JOIN accounts a ON t.account_id = a.id";
        hasJoin = true;
      } else if (!query.includes("INNER JOIN accounts")) {
        query += " INNER JOIN accounts a ON t.account_id = a.id";
      }
      const placeholders = accountTypes.map(() => "?").join(",");
      conditions.push(`a.type IN (${placeholders})`);
      params.push(...accountTypes);
    }

    query += ` WHERE ${conditions.join(" AND ")}`;

    // Execute query to get only id, amount, type, account_id
    const queryStartTime = Date.now();
    const results = await this.executeQuery<{
      id: number;
      amount: string;
      type: Transaction["type"];
      account_id: number;
    }>(query, params);
    const queryEndTime = Date.now();
    logPerformance('calculateAccountBreakdown query fetch', queryEndTime - queryStartTime, `${results.length} transactions`);

    // Decrypt amounts in batches to avoid overwhelming the system
    const decryptStartTime = Date.now();
    const decryptedAmounts = await this.batchDecryptAmounts(
      results,
      (row, amount) => ({
        id: row.id,
        amount,
        type: row.type,
        account_id: row.account_id,
      })
    );
    const decryptEndTime = Date.now();
    logPerformance('calculateAccountBreakdown decrypt', decryptEndTime - decryptStartTime, `${decryptedAmounts.length} transactions`);

    // Group by account
    const accountMap = new Map<
      number,
      { expenses: number; income: number; count: number }
    >();

    for (const row of decryptedAmounts) {
      const existing = accountMap.get(row.account_id) || {
        expenses: 0,
        income: 0,
        count: 0,
      };

      if (row.type === "expense") {
        existing.expenses += row.amount;
        existing.count += 1;
      } else if (row.type === "income") {
        existing.income += row.amount;
        existing.count += 1;
      }
      accountMap.set(row.account_id, existing);
    }

    // Convert to array
    return Array.from(accountMap.entries()).map(([accountId, data]) => ({
      accountId,
      expenses: data.expenses,
      income: data.income,
      count: data.count,
    }));
  }

  /**
   * Optimized method to calculate account expenses for a date range
   * Only fetches and decrypts amounts with account_id and date
   * Supports filters for accounts, dates, and transaction types
   */
  async calculateAccountExpensesForDateRange(filters?: {
    accountId?: number;
    accountIds?: number[];
    startDate?: string;
    endDate?: string;
    type?: Transaction['type'];
    types?: Transaction['type'][];
  }): Promise<number> {
    let query = `SELECT t.id, t.amount, t.type FROM ${this.tableName} t`;
    const params: any[] = [];
    const conditions: string[] = ['t.deleted_at IS NULL'];

    const accountIds = filters?.accountIds || (filters?.accountId ? [filters.accountId] : []);
    if (accountIds.length > 0) {
      const placeholders = accountIds.map(() => '?').join(',');
      conditions.push(`t.account_id IN (${placeholders})`);
      params.push(...accountIds);
    }

    // Handle date filters
    this.addDateFilterConditions(conditions, params, filters?.startDate, filters?.endDate);

    const types = filters?.types || (filters?.type ? [filters.type] : ['expense']); // Default to expense
    if (types.length > 0) {
      const placeholders = types.map(() => '?').join(',');
      conditions.push(`t.type IN (${placeholders})`);
      params.push(...types);
    }

    query += ` WHERE ${conditions.join(' AND ')}`;

    const results = await this.executeQuery<{ id: number; amount: string; type: Transaction['type'] }>(query, params);

    // Decrypt amounts in batches to avoid overwhelming the system
    const BATCH_SIZE = 500;
    let total = 0;
    
    for (let i = 0; i < results.length; i += BATCH_SIZE) {
      const batch = results.slice(i, i + BATCH_SIZE);
      const decryptedBatch = await Promise.all(
        batch.map(async (row) => await decryptAmount(row.amount))
    );
      total += decryptedBatch.reduce((sum, amount) => sum + amount, 0);
    }

    return total;
  }

  /**
   * Optimized method to fetch latest N transactions for an account
   * Only fetches necessary fields and limits results at the database level
   */
  async findLatestTransactionsForAccount(
    accountId: number,
    limit: number = 5
  ): Promise<Transaction[]> {
    const query = `SELECT * FROM ${this.tableName} 
                   WHERE deleted_at IS NULL 
                   AND account_id = ? 
                   ORDER BY date DESC, created_at DESC 
                   LIMIT ?`;

    return this.executeQuery<Transaction>(query, [accountId, limit]);
  }

  /**
   * Optimized method to fetch latest N transactions with filters
   * Only fetches necessary fields and limits results at the database level
   */
  async findLatestTransactionsWithFilters(
    limit: number = 10,
    filters?: {
      accountId?: number;
      accountIds?: number[];
      tagId?: number;
      tagIds?: number[];
      categoryId?: number;
      categoryIds?: number[];
      startDate?: string;
      endDate?: string;
      type?: Transaction["type"];
      types?: Transaction["type"][];
      accountType?: string;
      accountTypes?: string[];
    }
  ): Promise<Transaction[]> {
    let query = `SELECT DISTINCT t.* FROM ${this.tableName} t`;
    const params: any[] = [];
    const conditions: string[] = ["t.deleted_at IS NULL"];
    let hasJoin = false;

    // Handle account filters
    const accountIds =
      filters?.accountIds || (filters?.accountId ? [filters.accountId] : []);
    if (accountIds.length > 0) {
      const placeholders = accountIds.map(() => "?").join(",");
      conditions.push(`t.account_id IN (${placeholders})`);
      params.push(...accountIds);
    }

    // Handle tag filters
    const tagIds = filters?.tagIds || (filters?.tagId ? [filters.tagId] : []);
    if (tagIds.length > 0) {
      if (!hasJoin) {
        query += " INNER JOIN transaction_tags tt ON t.id = tt.transaction_id";
        hasJoin = true;
      }
      const placeholders = tagIds.map(() => "?").join(",");
      conditions.push(`tt.tag_id IN (${placeholders})`);
      params.push(...tagIds);
    }

    // Handle category filters
    const categoryIds =
      filters?.categoryIds || (filters?.categoryId ? [filters.categoryId] : []);
    if (categoryIds.length > 0) {
      const placeholders = categoryIds.map(() => "?").join(",");
      conditions.push(`t.category_id IN (${placeholders})`);
      params.push(...categoryIds);
    }

    // Handle date filters
    this.addDateFilterConditions(conditions, params, filters?.startDate, filters?.endDate);

    // Handle transaction type filters
    const types = filters?.types || (filters?.type ? [filters.type] : []);
    if (types.length > 0) {
      const placeholders = types.map(() => "?").join(",");
      conditions.push(`t.type IN (${placeholders})`);
      params.push(...types);
    }

    // Handle account type filters
    const accountTypes =
      filters?.accountTypes ||
      (filters?.accountType ? [filters.accountType] : []);
    if (accountTypes.length > 0) {
      if (!hasJoin) {
        query += " INNER JOIN accounts a ON t.account_id = a.id";
        hasJoin = true;
      } else if (!query.includes("INNER JOIN accounts")) {
        query += " INNER JOIN accounts a ON t.account_id = a.id";
      }
      const placeholders = accountTypes.map(() => "?").join(",");
      conditions.push(`a.type IN (${placeholders})`);
      params.push(...accountTypes);
    }

    query += ` WHERE ${conditions.join(
      " AND "
    )} ORDER BY t.date DESC, t.created_at DESC LIMIT ?`;
    params.push(limit);

    return this.executeQuery<Transaction>(query, params);
  }

  /**
   * Optimized method to get unique tag IDs from transactions matching filters
   * Uses SQL DISTINCT to get tag IDs directly without fetching all transactions
   */
  async findUniqueTagIdsFromTransactions(filters?: {
    accountId?: number;
    accountIds?: number[];
    categoryId?: number;
    categoryIds?: number[];
    startDate?: string;
    endDate?: string;
    type?: Transaction['type'];
    types?: Transaction['type'][];
    accountType?: string;
    accountTypes?: string[];
  }): Promise<number[]> {
    let query = `SELECT DISTINCT tt.tag_id FROM ${this.tableName} t 
                 INNER JOIN transaction_tags tt ON t.id = tt.transaction_id`;
    const params: any[] = [];
    const conditions: string[] = ['t.deleted_at IS NULL'];
    let hasJoin = true; // Already have transaction_tags join

    // Handle account filters
    const accountIds = filters?.accountIds || (filters?.accountId ? [filters.accountId] : []);
    if (accountIds.length > 0) {
      const placeholders = accountIds.map(() => '?').join(',');
      conditions.push(`t.account_id IN (${placeholders})`);
      params.push(...accountIds);
    }

    // Handle category filters
    const categoryIds = filters?.categoryIds || (filters?.categoryId ? [filters.categoryId] : []);
    if (categoryIds.length > 0) {
      const placeholders = categoryIds.map(() => '?').join(',');
      conditions.push(`t.category_id IN (${placeholders})`);
      params.push(...categoryIds);
    }

    // Handle date filters
    this.addDateFilterConditions(conditions, params, filters?.startDate, filters?.endDate);

    // Handle transaction type filters
    const types = filters?.types || (filters?.type ? [filters.type] : []);
    if (types.length > 0) {
      const placeholders = types.map(() => '?').join(',');
      conditions.push(`t.type IN (${placeholders})`);
      params.push(...types);
    }

    // Handle account type filters
    const accountTypes = filters?.accountTypes || (filters?.accountType ? [filters.accountType] : []);
    if (accountTypes.length > 0) {
      if (!query.includes('INNER JOIN accounts')) {
        query += ' INNER JOIN accounts a ON t.account_id = a.id';
      }
      const placeholders = accountTypes.map(() => '?').join(',');
      conditions.push(`a.type IN (${placeholders})`);
      params.push(...accountTypes);
    }

    query += ` WHERE ${conditions.join(' AND ')} AND tt.tag_id IS NOT NULL`;

    const results = await this.executeQuery<{ tag_id: number }>(query, params);
    return results.map(row => row.tag_id);
  }
}

export const transactionRepository = new TransactionRepository();
