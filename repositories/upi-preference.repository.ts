import { getDatabase } from "@/db/sqlite/db";
import {
  UpiPreference,
  UpiPreferenceParsed,
  UpsertUpiPreferenceInput,
} from "@/db/schema/types";
import { logError, logInfo } from "@/utils/logger";

/**
 * Parse a raw `UpiPreference` row (tag_ids is a JSON string) into
 * a `UpiPreferenceParsed` where tag_ids is a `number[]`.
 */
function parseRow(row: UpiPreference): UpiPreferenceParsed {
  let tagIds: number[] = [];
  if (row.tag_ids) {
    try {
      const parsed = JSON.parse(row.tag_ids);
      if (Array.isArray(parsed)) {
        tagIds = parsed.filter((v): v is number => typeof v === "number");
      }
    } catch {
      // Corrupted JSON — treat as empty
    }
  }

  return {
    id: row.id,
    upi_id: row.upi_id,
    category_id: row.category_id,
    note: row.note,
    payment_mode: row.payment_mode,
    tag_ids: tagIds,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

class UpiPreferenceRepository {
  private readonly tableName = "upi_preferences";

  /**
   * Look up stored preferences for a UPI ID.
   * Returns `null` if no preference exists.
   */
  async findByUpiId(upiId: string): Promise<UpiPreferenceParsed | null> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<UpiPreference>(
      `SELECT * FROM ${this.tableName} WHERE upi_id = ? LIMIT 1`,
      [upiId.toLowerCase()],
    );
    if (rows.length === 0) return null;
    return parseRow(rows[0]);
  }

  /**
   * Insert or replace (upsert) preferences for a UPI ID.
   *
   * Uses INSERT … ON CONFLICT(upi_id) DO UPDATE so the row is always
   * replaced with the latest values whenever a new transaction is created.
   */
  async upsert(input: UpsertUpiPreferenceInput): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const tagIdsJson =
      input.tag_ids && input.tag_ids.length > 0
        ? JSON.stringify(input.tag_ids)
        : null;

    await db.runAsync(
      `INSERT INTO ${this.tableName}
         (upi_id, category_id, note, payment_mode, tag_ids, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(upi_id) DO UPDATE SET
         category_id = excluded.category_id,
         note        = excluded.note,
         payment_mode = excluded.payment_mode,
         tag_ids     = excluded.tag_ids,
         updated_at  = excluded.updated_at`,
      [
        input.upi_id.toLowerCase(),
        input.category_id ?? null,
        input.note ?? null,
        input.payment_mode ?? null,
        tagIdsJson,
        now,
        now,
      ],
    );

    logInfo(
      `[UpiPrefRepo] upserted preferences for ${input.upi_id.toLowerCase()}`,
    );
  }

  /**
   * Delete preferences for a specific UPI ID.
   */
  async deleteByUpiId(upiId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `DELETE FROM ${this.tableName} WHERE upi_id = ?`,
      [upiId.toLowerCase()],
    );
  }
}

export const upiPreferenceRepository = new UpiPreferenceRepository();
