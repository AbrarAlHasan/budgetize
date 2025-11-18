export type AccountType = 'debit' | 'credit' | 'borrowed' | 'lent';

export interface Account {
  id: number;
  name: string; // Encrypted string
  type: AccountType;
  currency: string; // Currency code (e.g., 'USD', 'EUR', 'INR')
  bank_name: string | null; // Encrypted string
  credit_limit: string | null; // Encrypted string (stored as string, decrypted to number)
  billing_start_date: string | null; // Encrypted string (ISO date string)
  billing_end_date: string | null; // Encrypted string (ISO date string)
  payment_due_date: string | null; // Encrypted string (ISO date string)
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
  deleted_at: string | null; // ISO date string
  remote_id: string | null;
  is_synced: number; // SQLite boolean (0 or 1)
}

export type DecryptedAccount = Omit<
  Account,
  | 'name'
  | 'bank_name'
  | 'credit_limit'
  | 'billing_start_date'
  | 'billing_end_date'
  | 'payment_due_date'
> & {
  name: string;
  currency: string;
  bank_name: string | null;
  credit_limit: number | null;
  billing_start_date: string | null;
  billing_end_date: string | null;
  payment_due_date: string | null;
};

export type TransactionType = 'expense' | 'income';

export interface Transaction {
  id: number;
  account_id: number;
  category_id: number | null;
  amount: string; // Encrypted string
  type: TransactionType;
  date: string; // ISO date string
  note: string | null; // Encrypted string
  payment_mode: string; // Encrypted string
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
  deleted_at: string | null; // ISO date string
  remote_id: string | null;
  is_synced: number; // SQLite boolean (0 or 1)
}

export interface Category {
  id: number;
  name: string; // Encrypted string
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
  deleted_at: string | null; // ISO date string
  remote_id: string | null;
  is_synced: number; // SQLite boolean (0 or 1)
}

export interface Tag {
  id: number;
  name: string; // Encrypted string
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
  deleted_at: string | null; // ISO date string
  remote_id: string | null;
  is_synced: number; // SQLite boolean (0 or 1)
}

export interface TransactionTag {
  transaction_id: number;
  tag_id: number;
}

// Input types for creating/updating
export interface CreateAccountInput {
  name: string;
  type: AccountType;
  currency?: string; // Defaults to 'USD' if not provided
  bank_name?: string | null;
  credit_limit?: number | null;
  billing_start_date?: string | null;
  billing_end_date?: string | null;
  payment_due_date?: string | null;
}

export interface UpdateAccountInput extends Partial<CreateAccountInput> {
  id: number;
}

export interface CreateTransactionInput {
  account_id: number;
  category_id?: number | null;
  amount: number; // Will be encrypted
  type: TransactionType;
  date: string;
  note?: string | null; // Will be encrypted
  payment_mode: string; // Will be encrypted
  tag_ids?: number[];
}

export interface UpdateTransactionInput {
  id: number;
  account_id?: number;
  category_id?: number | null;
  amount?: number; // Will be encrypted
  type?: TransactionType;
  date?: string;
  note?: string | null; // Will be encrypted
  payment_mode?: string; // Will be encrypted
  tag_ids?: number[];
}

export interface CreateTagInput {
  name: string;
}

export interface UpdateTagInput {
  id: number;
  name: string;
}

