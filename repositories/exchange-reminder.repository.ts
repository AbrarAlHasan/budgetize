import {
  CreateExchangeReminderInput,
  ExchangeReminder,
  ExchangeReminderType,
  UpdateExchangeReminderInput,
} from "@/db/schema/types";
import { getDatabase } from "@/db/sqlite/db";
import { logError } from "@/utils/logger";
import { BaseRepository } from "./base.repository";

export class ExchangeReminderRepository extends BaseRepository<ExchangeReminder> {
  protected tableName = "exchange_reminders";
  protected primaryKey = "id";

  async create(input: CreateExchangeReminderInput): Promise<ExchangeReminder> {
    const db = await getDatabase();
    await db.execAsync("BEGIN TRANSACTION");

    try {
      const now = new Date().toISOString();
      const result = await db.runAsync(
        `INSERT INTO ${this.tableName} 
         (exchange_id, reminder_type, reminder_date, notification_id, is_sent, created_at, updated_at, is_synced)
         VALUES (?, ?, ?, ?, 0, ?, ?, 0)`,
        [
          input.exchange_id,
          input.reminder_type,
          input.reminder_date,
          input.notification_id || null,
          now,
          now,
        ]
      );

      await db.execAsync("COMMIT");

      const reminder = await this.findById(result.lastInsertRowId);
      if (!reminder) {
        throw new Error("Failed to create reminder");
      }
      return reminder;
    } catch (error) {
      await db.execAsync("ROLLBACK");
      logError("Error creating reminder:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to create reminder"
      );
    }
  }

  async update(input: UpdateExchangeReminderInput): Promise<ExchangeReminder> {
    const db = await getDatabase();
    await db.execAsync("BEGIN TRANSACTION");

    try {
      const updateData: any = {};

      if (input.reminder_type !== undefined) {
        updateData.reminder_type = input.reminder_type;
      }

      if (input.reminder_date !== undefined) {
        updateData.reminder_date = input.reminder_date;
      }

      if (input.is_sent !== undefined) {
        updateData.is_sent = input.is_sent ? 1 : 0;
      }

      if (input.notification_id !== undefined) {
        updateData.notification_id = input.notification_id;
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

      const reminder = await this.findById(input.id);
      if (!reminder) {
        throw new Error("Reminder not found");
      }
      return reminder;
    } catch (error) {
      await db.execAsync("ROLLBACK");
      logError("Error updating reminder:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to update reminder"
      );
    }
  }

  /**
   * Get all reminders for an exchange
   */
  async findByExchangeId(exchangeId: number): Promise<ExchangeReminder[]> {
    return this.executeQuery<ExchangeReminder>(
      `SELECT * FROM ${this.tableName} 
       WHERE exchange_id = ? AND deleted_at IS NULL 
       ORDER BY reminder_date ASC, created_at ASC`,
      [exchangeId]
    );
  }

  /**
   * Get upcoming reminders (not yet sent, reminder_date >= today)
   * SQL-first approach: filtering done in database
   */
  async getUpcomingReminders(limit?: number): Promise<ExchangeReminder[]> {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
    const limitClause = limit ? `LIMIT ${limit}` : "";

    return this.executeQuery<ExchangeReminder>(
      `SELECT * FROM ${this.tableName} 
       WHERE reminder_date >= ? AND is_sent = 0 AND deleted_at IS NULL 
       ORDER BY reminder_date ASC, created_at ASC 
       ${limitClause}`,
      [today]
    );
  }

  /**
   * Get overdue reminders (not yet sent, reminder_date < today)
   */
  async getOverdueReminders(): Promise<ExchangeReminder[]> {
    const today = new Date().toISOString().split("T")[0];

    return this.executeQuery<ExchangeReminder>(
      `SELECT * FROM ${this.tableName} 
       WHERE reminder_date < ? AND is_sent = 0 AND deleted_at IS NULL 
       ORDER BY reminder_date ASC`,
      [today]
    );
  }

  /**
   * Mark reminder as sent
   */
  async markAsSent(id: number, notificationId?: string): Promise<ExchangeReminder> {
    return this.update({
      id,
      is_sent: true,
      notification_id: notificationId || null,
    });
  }

  /**
   * Delete all reminders for an exchange (soft delete)
   */
  async deleteByExchangeId(exchangeId: number): Promise<void> {
    const now = new Date().toISOString();
    await this.executeUpdate(
      `UPDATE ${this.tableName} 
       SET deleted_at = ?, updated_at = ?, is_synced = 0 
       WHERE exchange_id = ? AND deleted_at IS NULL`,
      [now, now, exchangeId]
    );
  }
}

export const exchangeReminderRepository = new ExchangeReminderRepository();

