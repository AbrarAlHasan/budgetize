/**
 * Query Executor Service
 * Safely executes SQL queries and handles decryption of encrypted fields
 */

import { getDatabase } from "@/db/sqlite/db";
import { categoryRepository } from "@/repositories/category.repository";
import { tagRepository } from "@/repositories/tag.repository";
import { decrypt, decryptAmount } from "@/services/encryption";
import { log, logError } from "@/utils/logger";

interface QueryResult {
  success: boolean;
  data?: any[];
  error?: string;
  query?: string;
}

// List of allowed SQL keywords for security
const ALLOWED_KEYWORDS = [
  "SELECT",
  "FROM",
  "WHERE",
  "AND",
  "OR",
  "IN",
  "NOT",
  "IS",
  "NULL",
  "ORDER",
  "BY",
  "ASC",
  "DESC",
  "LIMIT",
  "OFFSET",
  "JOIN",
  "INNER",
  "LEFT",
  "RIGHT",
  "ON",
  "GROUP",
  "HAVING",
  "COUNT",
  "SUM",
  "AVG",
  "MAX",
  "MIN",
  "DISTINCT",
  "AS",
  "BETWEEN",
  "LIKE",
  "=",
  ">",
  "<",
  ">=",
  "<=",
  "!=",
  "<>",
];

// List of forbidden SQL keywords for security
const FORBIDDEN_KEYWORDS = [
  "DROP",
  "DELETE",
  "UPDATE",
  "INSERT",
  "ALTER",
  "CREATE",
  "TRUNCATE",
  "EXEC",
  "EXECUTE",
  "PRAGMA",
  "ATTACH",
  "DETACH",
];

export class QueryExecutor {
  /**
   * Validate SQL query for security
   */
  private validateQuery(query: string): { valid: boolean; error?: string } {
    const upperQuery = query.toUpperCase().trim();

    // Check for forbidden keywords - but only as standalone SQL keywords, not in column names
    // Column names like "deleted_at" or "updated_at" should be allowed
    for (const keyword of FORBIDDEN_KEYWORDS) {
      // First check: if keyword is followed by underscore, it's part of a column name (like "deleted_at")
      // This should be allowed
      const isColumnName = new RegExp(`${keyword}_`, 'i');
      if (isColumnName.test(query)) {
        continue; // Skip validation for this keyword - it's part of a column name
      }
      
      // Check if keyword appears as a standalone SQL command (not part of column name)
      // Pattern 1: keyword followed by space and SQL command keywords (like "DELETE FROM", "UPDATE table")
      const isDangerousCommand = new RegExp(`\\b${keyword}\\s+(FROM|SET|TABLE|DATABASE|INDEX|VIEW|WHERE|IF|EXISTS|INTO|VALUES|\\*)`, 'i');
      if (isDangerousCommand.test(query)) {
        return {
          valid: false,
          error: `Query contains forbidden keyword: ${keyword}`,
        };
      }
      // Pattern 2: Standalone keyword followed by whitespace
      // This catches "DELETE " or "UPDATE " but we've already excluded column names above
      const standaloneKeywordPattern = new RegExp(`\\b${keyword}\\s+`, 'i');
      if (standaloneKeywordPattern.test(query)) {
        return {
          valid: false,
          error: `Query contains forbidden keyword: ${keyword}`,
        };
      }
    }

    // Must start with SELECT
    if (!upperQuery.startsWith("SELECT")) {
      return {
        valid: false,
        error: "Query must be a SELECT statement only",
      };
    }

    // Check for SQL injection patterns
    const dangerousPatterns = [
      /;\s*(DROP|DELETE|UPDATE|INSERT|ALTER|CREATE)/i,
      /--/,
      /\/\*/,
      /UNION.*SELECT/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(query)) {
        return {
          valid: false,
          error: "Query contains potentially dangerous patterns",
        };
      }
    }

    return { valid: true };
  }

  /**
   * Execute SQL query and handle decryption
   */
  async executeQuery(sqlQuery: string): Promise<QueryResult> {
    try {
      // Validate query
      const validation = this.validateQuery(sqlQuery);
      if (!validation.valid) {
        logError("❌ [Query Executor] Query validation failed:", validation.error);
        log("❌ [Query Executor] Invalid query:", sqlQuery);
        return {
          success: false,
          error: validation.error,
          query: sqlQuery,
        };
      }

      log("📊 [Query Executor] Executing SQL Query:", sqlQuery);
      const db = await getDatabase();

      // Execute query
      const results = await db.getAllAsync<any>(sqlQuery);
      log("✅ [Query Executor] Query executed successfully. Results:", results.length, "rows");

      // Handle decryption based on table and columns
      const decryptedResults = await this.decryptResults(results, sqlQuery);

      return {
        success: true,
        data: decryptedResults,
        query: sqlQuery,
      };
    } catch (error) {
      logError("Query execution error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        query: sqlQuery,
      };
    }
  }

  /**
   * Decrypt encrypted fields in query results
   */
  private async decryptResults(
    results: any[],
    query: string
  ): Promise<any[]> {
    if (results.length === 0) {
      return results;
    }

    const upperQuery = query.toUpperCase();

    // Determine which table we're querying
    let isTransactions = upperQuery.includes("FROM TRANSACTIONS") || upperQuery.includes("FROM transactions");
    let isCategories = upperQuery.includes("FROM CATEGORIES") || upperQuery.includes("FROM categories");
    let isTags = upperQuery.includes("FROM TAGS") || upperQuery.includes("FROM tags");
    let isAccounts = upperQuery.includes("FROM ACCOUNTS") || upperQuery.includes("FROM accounts");

    // Check if we're selecting from multiple tables (JOIN)
    const hasJoin = upperQuery.includes("JOIN");

    const decryptedResults: any[] = [];

    for (const row of results) {
      const decryptedRow: any = { ...row };

      // Decrypt transaction fields
      if (isTransactions || (hasJoin && row.amount !== undefined)) {
        if (row.amount && typeof row.amount === "string") {
          try {
            decryptedRow.amount = await decryptAmount(row.amount);
          } catch (error) {
            logError("Error decrypting amount:", error);
            decryptedRow.amount = row.amount; // Keep encrypted value on error
          }
        }

        if (row.note && typeof row.note === "string") {
          try {
            decryptedRow.note = await decrypt(row.note);
          } catch (error) {
            logError("Error decrypting note:", error);
            decryptedRow.note = row.note;
          }
        }

        if (row.payment_mode && typeof row.payment_mode === "string") {
          try {
            decryptedRow.payment_mode = await decrypt(row.payment_mode);
          } catch (error) {
            logError("Error decrypting payment_mode:", error);
            decryptedRow.payment_mode = row.payment_mode;
          }
        }
      }

      // Decrypt category fields
      if (isCategories || (hasJoin && row.category_name !== undefined)) {
        if (row.name && typeof row.name === "string" && row.name.length > 20) {
          // Encrypted strings are typically longer
          try {
            decryptedRow.name = await decrypt(row.name);
          } catch (error) {
            logError("Error decrypting category name:", error);
            decryptedRow.name = row.name;
          }
        }
      }

      // Decrypt tag fields
      if (isTags || (hasJoin && row.tag_name !== undefined)) {
        if (row.name && typeof row.name === "string" && row.name.length > 20) {
          try {
            decryptedRow.name = await decrypt(row.name);
          } catch (error) {
            logError("Error decrypting tag name:", error);
            decryptedRow.name = row.name;
          }
        }
      }

      // Decrypt account fields
      if (isAccounts || (hasJoin && row.account_name !== undefined)) {
        if (row.name && typeof row.name === "string" && row.name.length > 20) {
          try {
            decryptedRow.name = await decrypt(row.name);
          } catch (error) {
            logError("Error decrypting account name:", error);
            decryptedRow.name = row.name;
          }
        }

        if (row.bank_name && typeof row.bank_name === "string") {
          try {
            decryptedRow.bank_name = await decrypt(row.bank_name);
          } catch (error) {
            logError("Error decrypting bank_name:", error);
            decryptedRow.bank_name = row.bank_name;
          }
        }
      }

      decryptedResults.push(decryptedRow);
    }

    // If it's a sum query, calculate the sum
    if (query.toUpperCase().includes("SUM") || results.some((r) => r.amount !== undefined)) {
      // Check if we need to calculate sum
      const needsSum = query.toLowerCase().includes("sum");
      if (needsSum && decryptedResults.length > 0 && decryptedResults[0].amount !== undefined) {
        const total = decryptedResults.reduce((sum, row) => {
          const amount = typeof row.amount === "number" ? row.amount : parseFloat(row.amount) || 0;
          return sum + amount;
        }, 0);

        return [{ total }];
      }
    }

    return decryptedResults;
  }

  /**
   * Helper method to find category ID by name
   * This is needed because category names are encrypted
   * Case-insensitive lookup
   */
  async findCategoryIdByName(categoryName: string): Promise<number | null> {
    // Try exact match first
    let category = await categoryRepository.findByName(categoryName);
    
    if (!category) {
      // Try case-insensitive match by fetching all categories
      const allCategories = await categoryRepository.findAll();
      const decryptedCategories = await categoryRepository.decryptCategories(allCategories);
      const lowerName = categoryName.toLowerCase();
      category = decryptedCategories.find(
        (c) => c.name.toLowerCase() === lowerName
      ) || null;
    }
    
    return category?.id || null;
  }

  /**
   * Helper method to find tag ID by name
   */
  async findTagIdByName(tagName: string): Promise<number | null> {
    const tag = await tagRepository.findByName(tagName);
    return tag?.id || null;
  }

  /**
   * Execute a query with category name lookup
   * This handles the common pattern: "sum of transactions for food category"
   */
  async executeQueryWithCategoryLookup(
    baseQuery: string,
    categoryName: string
  ): Promise<QueryResult> {
    // Find category ID
    const categoryId = await this.findCategoryIdByName(categoryName);

    if (!categoryId) {
      return {
        success: false,
        error: `Category "${categoryName}" not found`,
      };
    }

    // Modify query to include category_id filter
    const modifiedQuery = baseQuery.replace(
      /WHERE/i,
      `WHERE category_id = ${categoryId} AND`
    );

    return this.executeQuery(modifiedQuery);
  }

  /**
   * Execute query with category and date range
   * Handles: "sum of transactions for food category last month"
   */
  async executeQueryWithCategoryAndDateRange(
    categoryName: string,
    startDate?: string,
    endDate?: string,
    needsSum: boolean = false
  ): Promise<QueryResult> {
    try {
      // Find category ID
      const categoryId = await this.findCategoryIdByName(categoryName);

      if (!categoryId) {
        logError(`❌ [Query Executor] Category "${categoryName}" not found`);
        return {
          success: false,
          error: `Category "${categoryName}" not found`,
        };
      }

      // Build query
      let query = `SELECT t.id, t.amount, t.type, t.category_id, t.date FROM transactions t WHERE t.deleted_at IS NULL AND t.category_id = ${categoryId}`;

      // Handle date filters - if both dates are the same, use equality check
      if (startDate && endDate && startDate === endDate) {
        query += ` AND t.date = '${startDate}'`;
      } else {
        if (startDate) {
          query += ` AND t.date >= '${startDate}'`;
        }
        if (endDate) {
          query += ` AND t.date <= '${endDate}'`;
        }
      }

      log("📊 [Query Executor] Executing SQL Query (Category + Date Range):", query);
      log("📊 [Query Executor] Category:", categoryName, "→ ID:", categoryId);
      if (startDate || endDate) {
        log("📊 [Query Executor] Date Range:", startDate, "to", endDate);
      }

      // Execute query
      const result = await this.executeQuery(query);

      if (!result.success || !result.data) {
        log("❌ [Query Executor] Query execution failed:", result.error);
        return result;
      }

      log("✅ [Query Executor] Query executed. Rows returned:", result.data.length);

      // If sum is needed, calculate it
      if (needsSum && result.data.length > 0) {
        const total = result.data.reduce((sum, row) => {
          const amount = typeof row.amount === "number" ? row.amount : parseFloat(row.amount) || 0;
          return sum + amount;
        }, 0);

        log("💰 [Query Executor] Calculated sum:", total);

        return {
          success: true,
          data: [{ total }],
          query: result.query,
        };
      }

      return result;
    } catch (error) {
      logError("Error executing query with category and date range:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

export const queryExecutor = new QueryExecutor();

