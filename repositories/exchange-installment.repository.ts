import {
  CreateExchangeInstallmentInput,
  DecryptedExchangeInstallment,
  ExchangeInstallment,
  UpdateExchangeInstallmentInput,
} from "@/db/schema/types";
import { getDatabase } from "@/db/sqlite/db";
import { decrypt, decryptAmount, encrypt, encryptAmount } from "@/services/encryption";
import { log, logError } from "@/utils/logger";
import { BaseRepository } from "./base.repository";
import { exchangeRepository } from "./exchange.repository";

export class ExchangeInstallmentRepository extends BaseRepository<ExchangeInstallment> {
  protected tableName = "exchange_installments";
  protected primaryKey = "id";

  async create(input: CreateExchangeInstallmentInput): Promise<ExchangeInstallment> {
    // Validate: Check if installment would exceed exchange amount
    const exchange = await exchangeRepository.findById(input.exchange_id);
    if (!exchange) {
      throw new Error("Exchange not found");
    }

    const exchangeAmount = await decryptAmount(exchange.amount);
    const currentTotalPaid = await this.getTotalPaidAmount(input.exchange_id);
    const newTotalPaid = currentTotalPaid + input.amount;

    if (newTotalPaid > exchangeAmount + 0.01) { // Small tolerance for floating point
      throw new Error(
        `Installment amount exceeds the exchange limit. Maximum allowed: ${(exchangeAmount - currentTotalPaid).toFixed(2)}`
      );
    }

    const encryptedAmount = await encryptAmount(input.amount);
    const encryptedNote = input.note ? await encrypt(input.note) : null;

    const db = await getDatabase();
    await db.execAsync("BEGIN TRANSACTION");

    try {
      const now = new Date().toISOString();
      const profileId = await this.getActiveProfileId();
      const result = await db.runAsync(
        `INSERT INTO ${this.tableName} 
         (exchange_id, amount, payment_date, note, profile_id, created_at, updated_at, is_synced)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          input.exchange_id,
          encryptedAmount,
          input.payment_date,
          encryptedNote,
          profileId,
          now,
          now,
        ]
      );

      await db.execAsync("COMMIT");

      const installment = await this.findById(result.lastInsertRowId);
      if (!installment) {
        throw new Error("Failed to create installment");
      }

      // Auto-settle check: if total paid equals exchange amount, mark as settled
      await this.checkAndAutoSettle(input.exchange_id);

      return installment;
    } catch (error) {
      await db.execAsync("ROLLBACK");
      logError("Error creating installment:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to create installment"
      );
    }
  }

  async update(input: UpdateExchangeInstallmentInput): Promise<ExchangeInstallment> {
    // Get existing installment to check exchange_id
    const existingInstallment = await this.findById(input.id);
    if (!existingInstallment) {
      throw new Error("Installment not found");
    }

    // Validate: Check if updated amount would exceed exchange amount
    if (input.amount !== undefined) {
      const exchange = await exchangeRepository.findById(existingInstallment.exchange_id);
      if (!exchange) {
        throw new Error("Exchange not found");
      }

      const exchangeAmount = await decryptAmount(exchange.amount);
      const currentTotalPaid = await this.getTotalPaidAmount(existingInstallment.exchange_id);
      const oldInstallmentAmount = await decryptAmount(existingInstallment.amount);
      const newTotalPaid = currentTotalPaid - oldInstallmentAmount + input.amount;

      if (newTotalPaid > exchangeAmount + 0.01) { // Small tolerance for floating point
        throw new Error(
          `Installment amount exceeds the exchange limit. Maximum allowed: ${(exchangeAmount - (currentTotalPaid - oldInstallmentAmount)).toFixed(2)}`
        );
      }
    }

    const db = await getDatabase();
    await db.execAsync("BEGIN TRANSACTION");

    try {
      const updateData: any = {};

      if (input.payment_date !== undefined) {
        updateData.payment_date = input.payment_date;
      }

      if (input.amount !== undefined) {
        updateData.amount = await encryptAmount(input.amount);
      }

      if (input.note !== undefined) {
        updateData.note = input.note ? await encrypt(input.note) : null;
      }

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

      const installment = await this.findById(input.id);
      if (!installment) {
        throw new Error("Installment not found");
      }

      // Auto-settle check: if total paid equals exchange amount, mark as settled
      await this.checkAndAutoSettle(installment.exchange_id);

      return installment;
    } catch (error) {
      await db.execAsync("ROLLBACK");
      logError("Error updating installment:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to update installment"
      );
    }
  }

  /**
   * Get all installments for an exchange (SQL-first approach)
   */
  async findByExchangeId(exchangeId: number): Promise<ExchangeInstallment[]> {
    return this.executeQuery<ExchangeInstallment>(
      `SELECT * FROM ${this.tableName} 
       WHERE exchange_id = ? AND deleted_at IS NULL 
       ORDER BY payment_date DESC, created_at DESC`,
      [exchangeId]
    );
  }

  /**
   * Calculate total paid amount for an exchange (SQL aggregation)
   * Returns the sum of all installment amounts
   */
  async getTotalPaidAmount(exchangeId: number): Promise<number> {
    const installments = await this.executeQuery<{ amount: string }>(
      `SELECT amount FROM ${this.tableName} 
       WHERE exchange_id = ? AND deleted_at IS NULL`,
      [exchangeId]
    );

    // Decrypt amounts and sum them
    // Note: SQLite doesn't support encrypted aggregation, so we decrypt in batches
    const BATCH_SIZE = 100;
    let total = 0;

    for (let i = 0; i < installments.length; i += BATCH_SIZE) {
      const batch = installments.slice(i, i + BATCH_SIZE);
      const decryptedAmounts = await Promise.all(
        batch.map((inst) => decryptAmount(inst.amount))
      );
      total += decryptedAmounts.reduce((sum, amount) => sum + amount, 0);
    }

    return total;
  }

  /**
   * Get installment progress for an exchange
   * Returns: { totalPaid, totalAmount, remaining, percentage }
   */
  async getInstallmentProgress(
    exchangeId: number,
    exchangeAmount: number
  ): Promise<{
    totalPaid: number;
    totalAmount: number;
    remaining: number;
    percentage: number;
  }> {
    const totalPaid = await this.getTotalPaidAmount(exchangeId);
    const remaining = Math.max(0, exchangeAmount - totalPaid);
    const percentage = exchangeAmount > 0 ? (totalPaid / exchangeAmount) * 100 : 0;

    return {
      totalPaid,
      totalAmount: exchangeAmount,
      remaining,
      percentage: Math.min(100, Math.max(0, percentage)),
    };
  }

  /**
   * Decrypt installment for display
   */
  async decryptInstallment(
    installment: ExchangeInstallment
  ): Promise<DecryptedExchangeInstallment> {
    const amount = await decryptAmount(installment.amount);
    const note = installment.note ? await decrypt(installment.note) : null;

    return {
      ...installment,
      amount,
      note,
    };
  }

  /**
   * Decrypt multiple installments
   */
  async decryptInstallments(
    installments: ExchangeInstallment[]
  ): Promise<DecryptedExchangeInstallment[]> {
    if (installments.length === 0) return [];

    const BATCH_SIZE = 10;

    const results: DecryptedExchangeInstallment[] = [];

    for (let i = 0; i < installments.length; i += BATCH_SIZE) {
      const batch = installments.slice(i, i + BATCH_SIZE);

      const amounts = await Promise.all(
        batch.map((inst) => decryptAmount(inst.amount))
      );

      const notes = await Promise.all(
        batch.map((inst) => (inst.note ? decrypt(inst.note) : Promise.resolve(null)))
      );

      const decryptedBatch = batch.map((inst, index) => ({
        ...inst,
        amount: amounts[index],
        note: notes[index],
      }));

      results.push(...decryptedBatch);
    }

    return results;
  }

  /**
   * Override delete to check if exchange status needs to be reset
   */
  async delete(id: number): Promise<void> {
    // Get installment before deleting to know the exchange_id
    const installment = await this.findById(id);
    if (!installment) {
      throw new Error("Installment not found");
    }

    const exchangeId = installment.exchange_id;

    // Delete the installment
    await super.delete(id);

    // Check if exchange status should be reset to pending
    await this.checkAndResetStatus(exchangeId);
  }

  /**
   * Check if total installments equal exchange amount and auto-settle if so
   * This is called after creating/updating installments
   */
  private async checkAndAutoSettle(exchangeId: number): Promise<void> {
    try {
      const exchange = await exchangeRepository.findById(exchangeId);
      if (!exchange) return;

      // Only auto-settle if exchange is still pending
      if (exchange.status !== "pending") return;

      const exchangeAmount = await decryptAmount(exchange.amount);
      const totalPaid = await this.getTotalPaidAmount(exchangeId);

      // Auto-settle if total paid >= exchange amount (with small tolerance for floating point)
      if (totalPaid >= exchangeAmount - 0.01) {
        await exchangeRepository.markAsSettled(exchangeId);
      }
    } catch (error) {
      logError("Error in auto-settle check:", error);
      // Don't throw - this is a background operation
    }
  }

  /**
   * Check if exchange should be reset to pending after installment deletion
   * If exchange is settled but total paid is less than exchange amount, reset to pending
   */
  async checkAndResetStatus(exchangeId: number): Promise<void> {
    try {
      const exchange = await exchangeRepository.findById(exchangeId);
      if (!exchange) {
        logError("Exchange not found for reset check:", exchangeId);
        return;
      }

      // Only check if exchange is settled (paid or received)
      if (exchange.status === "pending") {
        return; // Already pending, no need to reset
      }

      // Calculate total paid amount after deletion
      const totalPaid = await this.getTotalPaidAmount(exchangeId);
      const exchangeAmount = await decryptAmount(exchange.amount);
      
      // If total paid is less than exchange amount, reset to pending
      // Use small tolerance for floating point comparison
      if (totalPaid < exchangeAmount - 0.01) {
        log(`Resetting exchange ${exchangeId} to pending - total paid (${totalPaid}) is less than exchange amount (${exchangeAmount})`);
        await exchangeRepository.update({
          id: exchangeId,
          status: "pending",
        });
        log(`Exchange ${exchangeId} status reset to pending successfully`);
      }
    } catch (error) {
      logError("Error in reset status check:", error);
      // Don't throw - this is a background operation
    }
  }
}

export const exchangeInstallmentRepository = new ExchangeInstallmentRepository();

