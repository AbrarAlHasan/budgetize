import type { Transaction } from '@/db/schema/types';

export function incomePreferenceKey(incomeEnabled: boolean): string {
  return incomeEnabled ? 'income:enabled' : 'income:disabled';
}

export function filterTransactionsByIncomePreference<T extends { type: Transaction['type'] }>(
  transactions: T[],
  incomeEnabled: boolean
): T[] {
  if (incomeEnabled) {
    return transactions;
  }

  return transactions.filter((transaction) => transaction.type === 'expense');
}


