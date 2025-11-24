/**
 * AI Service for generating SQL queries from natural language
 * Uses on-device AI (react-native-executorch) to understand user questions and generate appropriate SQL queries
 */

import { Message } from 'react-native-executorch';
import { log, logWarn } from '@/utils/logger';

// Comprehensive database schema configuration for AI
const DATABASE_SCHEMA_CONFIG = `
=== DATABASE SCHEMA ===

TABLES:

1. accounts
   - id (INTEGER PRIMARY KEY)
   - name (TEXT, ENCRYPTED) - Account name
   - type (TEXT) - Values: 'debit', 'credit', 'borrowed', 'lent'
   - currency (TEXT) - Currency code (e.g., 'USD', 'EUR', 'INR')
   - bank_name (TEXT, ENCRYPTED, nullable)
   - credit_limit (TEXT, ENCRYPTED, nullable) - Stored as string, represents number
   - billing_start_date (TEXT, ENCRYPTED, nullable) - ISO date string
   - billing_end_date (TEXT, ENCRYPTED, nullable) - ISO date string
   - payment_due_date (TEXT, ENCRYPTED, nullable) - ISO date string
   - created_at (TEXT) - ISO datetime
   - updated_at (TEXT) - ISO datetime
   - deleted_at (TEXT, nullable) - Soft delete timestamp
   - remote_id (TEXT, nullable)
   - is_synced (INTEGER) - 0 or 1 (boolean)

2. transactions
   - id (INTEGER PRIMARY KEY)
   - account_id (INTEGER, NOT NULL) - Foreign key to accounts.id
   - category_id (INTEGER, nullable) - Foreign key to categories.id
   - amount (TEXT, ENCRYPTED) - Stored as encrypted string, represents number
   - type (TEXT) - Values: 'expense' or 'income'
   - date (TEXT) - ISO date string (YYYY-MM-DD format)
   - note (TEXT, ENCRYPTED, nullable)
   - payment_mode (TEXT, ENCRYPTED)
   - created_at (TEXT) - ISO datetime
   - updated_at (TEXT) - ISO datetime
   - deleted_at (TEXT, nullable) - Soft delete timestamp
   - remote_id (TEXT, nullable)
   - is_synced (INTEGER) - 0 or 1 (boolean)

3. categories
   - id (INTEGER PRIMARY KEY)
   - name (TEXT, ENCRYPTED, UNIQUE) - Category name
   - created_at (TEXT) - ISO datetime
   - updated_at (TEXT) - ISO datetime
   - deleted_at (TEXT, nullable) - Soft delete timestamp
   - remote_id (TEXT, nullable)
   - is_synced (INTEGER) - 0 or 1 (boolean)
   - Common categories: Food, Transport, Medicine, Shopping, Entertainment, Bills, Education, Other

4. tags
   - id (INTEGER PRIMARY KEY)
   - name (TEXT, ENCRYPTED, UNIQUE) - Tag name
   - created_at (TEXT) - ISO datetime
   - updated_at (TEXT) - ISO datetime
   - deleted_at (TEXT, nullable) - Soft delete timestamp
   - remote_id (TEXT, nullable)
   - is_synced (INTEGER) - 0 or 1 (boolean)

5. transaction_tags (Junction table)
   - transaction_id (INTEGER) - Foreign key to transactions.id
   - tag_id (INTEGER) - Foreign key to tags.id
   - PRIMARY KEY (transaction_id, tag_id)

=== CRITICAL RULES ===

1. ENCRYPTION:
   - Fields marked ENCRYPTED are stored as base64-encoded encrypted strings
   - You CANNOT filter by encrypted field values directly in SQL
   - To filter by category/tag name: fetch all records, decrypt in app layer, then filter
   - Amounts are encrypted, so SUM/AVG must be done after decryption in app layer
   - Always SELECT encrypted fields as-is, decryption happens in application

2. SOFT DELETES:
   - ALWAYS include: WHERE deleted_at IS NULL (or table_alias.deleted_at IS NULL)
   - This applies to ALL queries on accounts, transactions, categories, tags

3. DATE HANDLING:
   - Dates are stored as ISO strings: YYYY-MM-DD
   - Use string comparison: date >= '2025-01-01' AND date <= '2025-01-31'
   - Current date: Use date('now') or calculate in application
   - "This month": date >= first day of current month AND date <= today
   - "Last month": date >= first day of previous month AND date <= last day of previous month

4. QUERY PATTERNS:
   - "expenses by category": SELECT category_id, amount, ... WHERE type = 'expense' AND category_id IS NOT NULL
   - "how much did I spend" / "total" / "sum": SELECT amount, ... WHERE ... (app will decrypt and sum individual amounts)
   - IMPORTANT: For "how much", "total", "sum" questions - SELECT individual amount fields, NOT SQL SUM(). Amounts are encrypted and must be decrypted before summing.
   - "transactions for [category]": Cannot filter by name directly, must use category_id
   - "expenses this month": Add date filter for current month range

5. JOINS:
   - transactions.account_id → accounts.id
   - transactions.category_id → categories.id
   - transaction_tags.transaction_id → transactions.id
   - transaction_tags.tag_id → tags.id

6. SECURITY:
   - ONLY generate SELECT queries
   - NEVER use: DROP, DELETE, UPDATE, INSERT, ALTER, CREATE, TRUNCATE, etc.
   - Use parameterized queries where possible (though app handles this)

=== EXAMPLES ===

Query: "Show me expenses by category for this month"
SQL: SELECT t.category_id, t.amount, t.type, t.date FROM transactions t WHERE t.deleted_at IS NULL AND t.type = 'expense' AND t.category_id IS NOT NULL AND t.date >= date('now', 'start of month') AND t.date <= date('now')

Query: "Sum of transactions for food category last month"
SQL: SELECT t.id, t.amount, t.type, t.category_id, t.date FROM transactions t WHERE t.deleted_at IS NULL AND t.category_id IS NOT NULL AND t.date >= date('now', '-1 month', 'start of month') AND t.date <= date('now', '-1 month', 'start of month', '+1 month', '-1 day')
Note: Category name "food" must be resolved to category_id in application layer

Query: "All expenses"
SQL: SELECT t.* FROM transactions t WHERE t.deleted_at IS NULL AND t.type = 'expense' ORDER BY t.date DESC
`;

const SYSTEM_PROMPT = `You are a SQL query generator. Your ONLY function is to convert natural language questions into SQLite SELECT queries.

CRITICAL: You MUST respond with ONLY a SQL query. No explanations, no conversational text, no markdown, no code blocks. Just the raw SQL query.

RULES:
1. Generate ONLY SELECT queries - never DROP, DELETE, UPDATE, INSERT, ALTER, CREATE, etc.
2. ALWAYS include "deleted_at IS NULL" in WHERE clauses
3. Use SQLite syntax
4. For encrypted fields, SELECT them as-is (decryption happens in app)
5. For date ranges, use ISO format (YYYY-MM-DD) or SQLite date functions like date('now', 'start of month')
6. For "this month": date >= date('now', 'start of month') AND date <= date('now')
7. For "last month": date >= date('now', '-1 month', 'start of month') AND date <= date('now', '-1 month', 'start of month', '+1 month', '-1 day')

EXAMPLES:
Question: "How much did I spend this month"
SQL: SELECT t.amount, t.type, t.date FROM transactions t WHERE t.deleted_at IS NULL AND t.type = 'expense' AND t.date >= date('now', 'start of month') AND t.date <= date('now')
Note: For "how much" questions, select individual amounts (they will be summed in the application layer after decryption)

Question: "What's the total of my expenses this month"
SQL: SELECT t.amount, t.type, t.date FROM transactions t WHERE t.deleted_at IS NULL AND t.type = 'expense' AND t.date >= date('now', 'start of month') AND t.date <= date('now')
Note: Select individual amounts for summing (encrypted amounts cannot be summed in SQL)

Question: "Show me expenses by category for this month"
SQL: SELECT t.category_id, t.amount, t.type, t.date FROM transactions t WHERE t.deleted_at IS NULL AND t.type = 'expense' AND t.category_id IS NOT NULL AND t.date >= date('now', 'start of month') AND t.date <= date('now')

Question: "Sum of transactions for food category last month"
SQL: SELECT t.amount, t.type, t.category_id, t.date FROM transactions t WHERE t.deleted_at IS NULL AND t.category_id IS NOT NULL AND t.date >= date('now', '-1 month', 'start of month') AND t.date <= date('now', '-1 month', 'start of month', '+1 month', '-1 day')
Note: Category name "food" must be resolved to category_id in application layer. Select individual amounts for summing.

IMPORTANT: For questions asking "how much", "total", "sum" - always SELECT individual amount fields. Do NOT use SQL SUM() because amounts are encrypted. The application will decrypt and sum them.

Remember: Respond with ONLY the SQL query, nothing else.`;

const QUESTION_VALIDATION_PROMPT = `Determine if this question is about the Budgetize application (transactions, accounts, categories, tags, financial data).

Return ONLY "yes" or "no", nothing else.

Question: `;

interface QueryResult {
  success: boolean;
  data?: any[];
  error?: string;
  query?: string;
}

// LLM instance - will be initialized by the component
let llmInstance: {
  generate: (messages: Message[]) => Promise<string>;
} | null = null;

export function setLLMInstance(instance: {
  generate: (messages: Message[]) => Promise<string>;
}) {
  llmInstance = instance;
}

export class AIService {
  /**
   * Check if a question is about the application
   */
  async isQuestionAboutApp(question: string): Promise<boolean> {
    // First, try keyword matching (fast and reliable)
    const appKeywords = [
      "transaction",
      "expense",
      "income",
      "account",
      "category",
      "tag",
      "spend",
      "spent",
      "money",
      "financial",
      "budget",
      "food",
      "transport",
      "medicine",
      "shopping",
      "entertainment",
      "bills",
      "education",
      "sum",
      "total",
      "month",
      "year",
      "date",
    ];
    const lowerQuestion = question.toLowerCase();
    const hasKeyword = appKeywords.some((keyword) => lowerQuestion.includes(keyword));
    
    if (hasKeyword) {
      return true;
    }

    // If no keywords found, try using on-device LLM if available
    if (llmInstance) {
      try {
        const messages: Message[] = [
          { role: 'system', content: QUESTION_VALIDATION_PROMPT },
          { role: 'user', content: question },
        ];
        
        const response = await llmInstance.generate(messages);
        const answer = response.trim().toLowerCase();
        return answer.includes('yes') || answer === 'yes';
      } catch (error) {
        logError("Error validating question with LLM:", error);
        // Fallback to keyword matching on error
        return false;
      }
    }

    // Default: return false if no keywords and no LLM
    return false;
  }

  /**
   * Generate SQL query from natural language question
   * Uses AI to generate queries based on schema configuration
   */
  async generateSQLQuery(question: string): Promise<string | null> {
    if (!llmInstance) {
      logError("❌ [AI] LLM instance not available");
      throw new Error("AI model is not ready. Please wait for initialization.");
    }

    try {
      const messages: Message[] = [
        { 
          role: 'system', 
          content: SYSTEM_PROMPT + "\n\n" + DATABASE_SCHEMA_CONFIG 
        },
        { 
          role: 'user', 
          content: question 
        },
      ];
      
      log("🤖 [AI] Generating SQL query for:", question);
      const response = await llmInstance.generate(messages);
      
      // Clean up the query (remove markdown code blocks, explanations, etc.)
      let cleanedQuery = response
        ?.replace(/```sql\n?/gi, "")
        .replace(/```\n?/g, "")
        .replace(/^SELECT/i, "SELECT") // Ensure it starts with SELECT
        .split('\n')
        .map(line => line.trim())
        .filter(line => {
          const lower = line.toLowerCase();
          // Filter out conversational text and explanations
          return line && 
            !lower.startsWith('note:') && 
            !lower.startsWith('explanation:') &&
            !lower.startsWith('here') &&
            !lower.startsWith('the query') &&
            !lower.startsWith('can i help') &&
            !lower.includes('can help you') &&
            !lower.includes('something specific') &&
            !lower.includes('just want to chat');
        })
        .join(' ')
        .trim();

      // Extract SQL query if there's text before it - look for SELECT statement
      const selectMatch = cleanedQuery.match(/SELECT[\s\S]*?(?=\n\n|\n[A-Z]|$)/i);
      if (selectMatch) {
        cleanedQuery = selectMatch[0].trim();
        // Remove any trailing conversational text
        cleanedQuery = cleanedQuery.split(/[.!?]\s*(?=[A-Z])/)[0].trim();
      }

      // Validate that it's a SELECT query
      if (cleanedQuery && cleanedQuery.toUpperCase().startsWith('SELECT')) {
        // Ensure deleted_at IS NULL is present
        if (!cleanedQuery.toUpperCase().includes('DELETED_AT IS NULL')) {
          // Try to add it if there's a WHERE clause
          if (cleanedQuery.toUpperCase().includes('WHERE')) {
            cleanedQuery = cleanedQuery.replace(/WHERE/gi, "WHERE deleted_at IS NULL AND");
          } else {
            // Add WHERE clause
            const fromMatch = cleanedQuery.match(/FROM\s+(\w+)/i);
            if (fromMatch) {
              const tableName = fromMatch[1];
              cleanedQuery = cleanedQuery.replace(/FROM/i, `FROM ${tableName} WHERE ${tableName}.deleted_at IS NULL`);
            }
          }
        }

        log("🤖 [AI] Generated SQL Query:", cleanedQuery);
        return cleanedQuery;
      }
      
      // If response doesn't contain SQL, try to generate a fallback query based on the question
      logWarn("⚠️ [AI] LLM generated conversational response instead of SQL. Using intelligent fallback.");
      log("⚠️ [AI] LLM Response:", response);
      
      // Generate a fallback query based on question patterns
      const fallbackQuery = this.generateIntelligentFallback(question);
      if (fallbackQuery) {
        log("🤖 [AI] Generated SQL Query (Fallback):", fallbackQuery);
        return fallbackQuery;
      }
      
      logError("❌ [AI] Generated response doesn't look like SQL and fallback failed:", response);
      throw new Error("AI generated invalid SQL query");
    } catch (error) {
      logError("❌ [AI] Error generating SQL query:", error);
      throw error;
    }
  }


  /**
   * Format query result into a readable response
   */
  async formatQueryResult(question: string, result: QueryResult): Promise<string> {
    if (!result.success) {
      return `Sorry, I couldn't retrieve the data: ${result.error || "Unknown error"}`;
    }

    if (!result.data || result.data.length === 0) {
      return "No data found matching your query.";
    }

    // Simple formatting based on result type
    const lowerQuestion = question.toLowerCase();

    // Check if question is asking for a total/sum (includes "how much", "sum", "total", "spend", "spent")
    const isSumQuery = 
      lowerQuestion.includes("sum") || 
      lowerQuestion.includes("total") ||
      lowerQuestion.includes("how much") ||
      (lowerQuestion.includes("spend") || lowerQuestion.includes("spent")) ||
      lowerQuestion.includes("how many");

    if (isSumQuery) {
      // If it's a sum query, the data should already be aggregated
      if (result.data.length === 1 && result.data[0].total !== undefined) {
        const total = result.data[0].total;
        const formattedTotal = typeof total === "number" 
          ? total.toFixed(2) 
          : parseFloat(total).toFixed(2);
        return `The total is ${formattedTotal}`;
      }
      
      // If we have transaction rows with amounts, sum them
      if (result.data.length > 0 && result.data[0].amount !== undefined) {
        const total = result.data.reduce((sum, row) => {
          const amount = typeof row.amount === "number" ? row.amount : parseFloat(row.amount) || 0;
          return sum + amount;
        }, 0);
        return `The total is ${total.toFixed(2)}`;
      }
      
      // Otherwise, format the results
      return `Found ${result.data.length} result(s).\n\n${JSON.stringify(result.data, null, 2)}`;
    }

    if (lowerQuestion.includes("count")) {
      return `Found ${result.data.length} record(s).`;
    }

    // Default: show summary
    return `Found ${result.data.length} record(s). Here's a summary:\n\n${JSON.stringify(result.data.slice(0, 10), null, 2)}${result.data.length > 10 ? `\n\n... and ${result.data.length - 10} more` : ""}`;
  }

  /**
   * Generate intelligent fallback SQL query when LLM fails
   */
  private generateIntelligentFallback(question: string): string | null {
    const lowerQuestion = question.toLowerCase();
    
    // Pattern: "how much did I spend/spent this month"
    if ((lowerQuestion.includes('how much') || lowerQuestion.includes('spend') || lowerQuestion.includes('spent')) && 
        (lowerQuestion.includes('this month') || lowerQuestion.includes('current month'))) {
      return `SELECT t.amount, t.type, t.date FROM transactions t WHERE t.deleted_at IS NULL AND t.type = 'expense' AND t.date >= date('now', 'start of month') AND t.date <= date('now')`;
    }
    
    // Pattern: "expenses by category" or "expenses based on category"
    if (lowerQuestion.includes('expense') && (lowerQuestion.includes('by category') || lowerQuestion.includes('based on category'))) {
      let query = `SELECT t.category_id, t.amount, t.type, t.date FROM transactions t WHERE t.deleted_at IS NULL AND t.type = 'expense' AND t.category_id IS NOT NULL`;
      
      if (lowerQuestion.includes('this month')) {
        query += ` AND t.date >= date('now', 'start of month') AND t.date <= date('now')`;
      } else if (lowerQuestion.includes('last month')) {
        query += ` AND t.date >= date('now', '-1 month', 'start of month') AND t.date <= date('now', '-1 month', 'start of month', '+1 month', '-1 day')`;
      }
      
      return query;
    }
    
    // Pattern: "expenses this month"
    if (lowerQuestion.includes('expense') && lowerQuestion.includes('this month')) {
      return `SELECT t.* FROM transactions t WHERE t.deleted_at IS NULL AND t.type = 'expense' AND t.date >= date('now', 'start of month') AND t.date <= date('now') ORDER BY t.date DESC`;
    }
    
    // Pattern: "all expenses"
    if (lowerQuestion.includes('expense') && !lowerQuestion.includes('category')) {
      return `SELECT t.* FROM transactions t WHERE t.deleted_at IS NULL AND t.type = 'expense' ORDER BY t.date DESC`;
    }
    
    // Pattern: "all transactions"
    if (lowerQuestion.includes('transaction')) {
      return `SELECT t.* FROM transactions t WHERE t.deleted_at IS NULL ORDER BY t.date DESC LIMIT 100`;
    }
    
    return null;
  }

  /**
   * Extract category name from question (for special handling)
   * This is only used for the optimized category+date range queries
   * For general queries, let AI handle it
   */
  extractCategoryName(question: string): string | null {
    const lowerQuestion = question.toLowerCase();
    
    // Valid category names
    const validCategories = [
      "food", "transport", "medicine", "shopping", 
      "entertainment", "bills", "education", "other"
    ];
    
    // Check for exact category word matches (whole words only)
    for (const category of validCategories) {
      const categoryRegex = new RegExp(`\\b${category}\\b`, 'i');
      if (categoryRegex.test(question)) {
        return category.charAt(0).toUpperCase() + category.slice(1);
      }
    }
    
    return null;
  }

  /**
   * Extract date range from question
   */
  extractDateRange(question: string): { startDate: string; endDate: string } | null {
    const lowerQuestion = question.toLowerCase();
    const today = new Date();
    const endDate = new Date(today);
    const startDate = new Date(today);

    // Pattern: "last N months/years/weeks/days" or "last month/year/week/day"
    const timeMatch = lowerQuestion.match(
      /(?:last|past|previous).*?(\d+)?\s*(month|year|week|day|months|years|weeks|days)/
    );

    if (timeMatch) {
      const timeValue = timeMatch[1] ? parseInt(timeMatch[1]) : 1;
      const timeUnit = timeMatch[2].toLowerCase().replace(/s$/, ""); // Remove plural

      if (timeUnit === "month") {
        // For "last month" or "last N months", go back to the start of that month
        startDate.setMonth(startDate.getMonth() - timeValue);
        startDate.setDate(1); // First day of the month
        
        // End date is the last day of that month
        const endDateForMonth = new Date(startDate);
        endDateForMonth.setMonth(endDateForMonth.getMonth() + 1);
        endDateForMonth.setDate(0); // Last day of the target month
        
        return {
          startDate: startDate.toISOString().split("T")[0],
          endDate: endDateForMonth.toISOString().split("T")[0],
        };
      } else if (timeUnit === "year") {
        startDate.setFullYear(startDate.getFullYear() - timeValue);
        startDate.setMonth(0, 1); // January 1st
        const endDateForYear = new Date(startDate);
        endDateForYear.setFullYear(endDateForYear.getFullYear() + 1);
        endDateForYear.setDate(0); // Last day of December
        return {
          startDate: startDate.toISOString().split("T")[0],
          endDate: endDateForYear.toISOString().split("T")[0],
        };
      } else if (timeUnit === "week") {
        startDate.setDate(startDate.getDate() - timeValue * 7);
        return {
          startDate: startDate.toISOString().split("T")[0],
          endDate: endDate.toISOString().split("T")[0],
        };
      } else if (timeUnit === "day") {
        startDate.setDate(startDate.getDate() - timeValue);
        return {
          startDate: startDate.toISOString().split("T")[0],
          endDate: endDate.toISOString().split("T")[0],
        };
      }
    }

    // Pattern: "this month"
    if (lowerQuestion.includes("this month")) {
      startDate.setDate(1);
      return {
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      };
    }

    // Pattern: "this year"
    if (lowerQuestion.includes("this year")) {
      startDate.setMonth(0, 1);
      return {
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      };
    }

    return null;
  }
}

export const aiService = new AIService();

