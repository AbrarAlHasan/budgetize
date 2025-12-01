import {
  CreateExchangeInput,
  DecryptedExchange,
  Exchange,
  ExchangeStatus,
  ExchangeType,
  UpdateExchangeInput,
} from "@/db/schema/types";
import { getDatabase } from "@/db/sqlite/db";
import { decrypt, decryptAmount, encrypt, encryptAmount } from "@/services/encryption";
import { log, logError } from "@/utils/logger";
import { BaseRepository } from "./base.repository";

export class ExchangeRepository extends BaseRepository<Exchange> {
  protected tableName = "exchanges";
  protected primaryKey = "id";

  async create(input: CreateExchangeInput): Promise<Exchange> {
    // Encrypt sensitive fields
    const encryptedPersonName = await encrypt(input.person_name);
    const encryptedAmount = await encryptAmount(input.amount);
    const encryptedNote = input.note ? await encrypt(input.note) : null;
    const status = input.status || "pending";

    let db = await getDatabase();
    
    // Verify exchanges table exists before attempting to insert
    try {
      const tableCheck = await db.getAllAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='exchanges' LIMIT 1"
      );
      if (tableCheck.length === 0) {
        logError('Exchanges table not found! Attempting to re-run migrations...');
        const { reinitializeDatabase } = await import('@/db/sqlite/db');
        db = await reinitializeDatabase();
        
        // Verify again after re-initialization
        const verifyCheck = await db.getAllAsync<{ name: string }>(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='exchanges' LIMIT 1"
        );
        if (verifyCheck.length === 0) {
          throw new Error('Exchanges table still not found after re-initialization. Please restart the app.');
        }
      }
    } catch (error) {
      logError('Error verifying exchanges table:', error);
      throw new Error('Failed to verify exchanges table exists. Please restart the app.');
    }
    await db.execAsync("BEGIN TRANSACTION");

    try {
      const now = new Date().toISOString();
      const result = await db.runAsync(
        `INSERT INTO ${this.tableName} 
         (person_name, amount, type, status, date, due_date, note, created_at, updated_at, is_synced)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          encryptedPersonName,
          encryptedAmount,
          input.type,
          status,
          input.date,
          input.due_date || null,
          encryptedNote,
          now,
          now,
        ]
      );

      await db.execAsync("COMMIT");

      const exchange = await this.findById(result.lastInsertRowId);
      if (!exchange) {
        throw new Error("Failed to create exchange");
      }
      return exchange;
    } catch (error) {
      await db.execAsync("ROLLBACK");
      logError("Error creating exchange:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to create exchange"
      );
    }
  }

  async update(input: UpdateExchangeInput): Promise<Exchange> {
    const db = await getDatabase();
    await db.execAsync("BEGIN TRANSACTION");

    try {
      const updateData: any = {};

      if (input.type !== undefined) updateData.type = input.type;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.date !== undefined) updateData.date = input.date;
      if (input.due_date !== undefined) updateData.due_date = input.due_date;

      // Encrypt fields if provided
      if (input.person_name !== undefined) {
        updateData.person_name = await encrypt(input.person_name);
      }
      if (input.amount !== undefined) {
        updateData.amount = await encryptAmount(input.amount);
      }
      if (input.note !== undefined) {
        updateData.note = input.note ? await encrypt(input.note) : null;
      }

      // Update exchange
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

      await db.execAsync("COMMIT");

      const exchange = await this.findById(input.id);
      if (!exchange) {
        throw new Error("Exchange not found");
      }
      return exchange;
    } catch (error) {
      await db.execAsync("ROLLBACK");
      logError("Error updating exchange:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to update exchange"
      );
    }
  }

  async findByType(type: ExchangeType): Promise<Exchange[]> {
    return this.executeQuery<Exchange>(
      `SELECT * FROM ${this.tableName} WHERE type = ? AND deleted_at IS NULL ORDER BY date DESC, created_at DESC`,
      [type]
    );
  }

  async findByStatus(status: ExchangeStatus): Promise<Exchange[]> {
    return this.executeQuery<Exchange>(
      `SELECT * FROM ${this.tableName} WHERE status = ? AND deleted_at IS NULL ORDER BY date DESC, created_at DESC`,
      [status]
    );
  }

  async findByTypeAndStatus(
    type: ExchangeType,
    status: ExchangeStatus
  ): Promise<Exchange[]> {
    return this.executeQuery<Exchange>(
      `SELECT * FROM ${this.tableName} WHERE type = ? AND status = ? AND deleted_at IS NULL ORDER BY date DESC, created_at DESC`,
      [type, status]
    );
  }

  /**
   * Find exchanges with filters - all filtering done in SQL
   */
  async findAllWithFilters(filters?: {
    type?: ExchangeType;
    status?: ExchangeStatus;
    settled?: boolean; // If true, returns exchanges with status 'paid' or 'received'
  }): Promise<Exchange[]> {
    const conditions: string[] = ["deleted_at IS NULL"];
    const params: any[] = [];

    if (filters?.type) {
      conditions.push("type = ?");
      params.push(filters.type);
    }

    if (filters?.settled) {
      // Filter for settled exchanges (paid or received)
      conditions.push("(status = 'paid' OR status = 'received')");
    } else if (filters?.status) {
      conditions.push("status = ?");
      params.push(filters.status);
    }

    const query = `SELECT * FROM ${this.tableName} WHERE ${conditions.join(" AND ")} ORDER BY date DESC, created_at DESC`;

    return this.executeQuery<Exchange>(query, params);
  }

  /**
   * Get pending exchanges summary (total pending amounts)
   * Uses SQL aggregation to calculate totals in the database
   */
  async getPendingSummary(): Promise<{
    totalLent: number;
    totalBorrowed: number;
    lentCount: number;
    borrowedCount: number;
  }> {
    // Get all pending exchanges grouped by type
    // We need to decrypt amounts, so we'll fetch them and decrypt in batches
    // But we'll use SQL to group and count
    const query = `SELECT type, amount FROM ${this.tableName} WHERE status = 'pending' AND deleted_at IS NULL ORDER BY type`;
    const results = await this.executeQuery<{ type: ExchangeType; amount: string }>(
      query
    );

    // Decrypt amounts in batches
    const BATCH_SIZE = 100;
    let totalLent = 0;
    let totalBorrowed = 0;
    let lentCount = 0;
    let borrowedCount = 0;

    for (let i = 0; i < results.length; i += BATCH_SIZE) {
      const batch = results.slice(i, i + BATCH_SIZE);
      const decryptedBatch = await Promise.all(
        batch.map(async (row) => ({
          type: row.type,
          amount: await decryptAmount(row.amount),
        }))
      );

      for (const row of decryptedBatch) {
        if (row.type === "lent") {
          totalLent += row.amount;
          lentCount += 1;
        } else {
          totalBorrowed += row.amount;
          borrowedCount += 1;
        }
      }
    }

    return {
      totalLent,
      totalBorrowed,
      lentCount,
      borrowedCount,
    };
  }

  /**
   * Decrypt exchange for display
   */
  async decryptExchange(exchange: Exchange): Promise<DecryptedExchange> {
    const person_name = await decrypt(exchange.person_name);
    const amount = await decryptAmount(exchange.amount);
    const note = exchange.note ? await decrypt(exchange.note) : null;

    return {
      ...exchange,
      person_name,
      amount,
      note,
    };
  }

  /**
   * Decrypt multiple exchanges
   */
  async decryptExchanges(exchanges: Exchange[]): Promise<DecryptedExchange[]> {
    if (exchanges.length === 0) return [];

    const BATCH_SIZE = 10; // Process 10 exchanges at a time

    const results: DecryptedExchange[] = [];

    for (let i = 0; i < exchanges.length; i += BATCH_SIZE) {
      const batch = exchanges.slice(i, i + BATCH_SIZE);

      // Decrypt all fields in parallel for this batch
      const personNames = await Promise.all(
        batch.map((e) => decrypt(e.person_name))
      );

      const amounts = await Promise.all(
        batch.map((e) => decryptAmount(e.amount))
      );

      const notes = await Promise.all(
        batch.map((e) => (e.note ? decrypt(e.note) : Promise.resolve(null)))
      );

      // Combine results for this batch
      const decryptedBatch = batch.map((e, index) => ({
        ...e,
        person_name: personNames[index],
        amount: amounts[index],
        note: notes[index],
      }));

      results.push(...decryptedBatch);
    }

    return results;
  }

  /**
   * Mark exchange as paid (for lent exchanges) or received (for borrowed exchanges)
   */
  async markAsSettled(id: number): Promise<Exchange> {
    const exchange = await this.findById(id);
    if (!exchange) {
      throw new Error("Exchange not found");
    }

    // Determine the appropriate status based on exchange type
    const newStatus: ExchangeStatus =
      exchange.type === "lent" ? "paid" : "received";

    return this.update({ id, status: newStatus });
  }
}

export const exchangeRepository = new ExchangeRepository();

