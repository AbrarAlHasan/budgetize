export function normalizeTransactionSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

export function transactionMatchesSearch(
  note: string | null,
  paymentMode: string | null,
  searchQuery: string
): boolean {
  const normalized = normalizeTransactionSearchQuery(searchQuery);
  if (!normalized) {
    return true;
  }

  const noteText = (note ?? '').toLowerCase();
  const paymentText = (paymentMode ?? '').toLowerCase();

  return noteText.includes(normalized) || paymentText.includes(normalized);
}
