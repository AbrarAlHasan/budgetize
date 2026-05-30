const FORBIDDEN_COLUMN_PATTERNS: RegExp[] = [
  /\bt\.tags\b/i,
  /\btransactions\.tags\b/i,
  /\bt\.tag_id\b/i,
  /\btransactions\.tag_id\b/i,
];

export function isSkipSqlQuery(sql: string): boolean {
  const upper = sql.toUpperCase();
  return /\bAS\s+SKIP\b/.test(upper) || /\bWHERE\s+0\b/.test(upper);
}

export function validateGeneratedSql(sql: string): { valid: boolean; error?: string } {
  for (const pattern of FORBIDDEN_COLUMN_PATTERNS) {
    if (pattern.test(sql)) {
      return {
        valid: false,
        error:
          'Generated query referenced invalid columns. Tags require JOIN transaction_tags, not a tags column on transactions.',
      };
    }
  }

  return { valid: true };
}

export function humanizeSqlError(error: string): string {
  const lower = error.toLowerCase();

  if (lower.includes('no such column') || lower.includes('no such table')) {
    return 'I could not look up that data. Try rephrasing, for example: "How much did I spend this month?"';
  }

  if (lower.includes('prepareasync') || lower.includes('syntax error')) {
    return 'Something went wrong reading your data. Try a simpler question about spending or income.';
  }

  return 'The query could not be run. Try a simpler question about spending, income, or categories.';
}
