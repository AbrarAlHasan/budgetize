export interface ICategory {
  amount_allocated: number;
  background_color: string;
  category_id: number;
  category_name: string;
  created_at: string;
  icon: string;
  type: "WEEKLY" | "MONTHLY";
  user_id: string;
  transactions: Array<ITransaction>;
  from_date: string;
  to_date: string | null;
}

export interface ITransaction {
  amount: number;
  category_id: number;
  created_at: string;
  date: Date;
  description: string;
  id: string;
}

export interface ICategorySpends {
  category_id: number;
  totalSpent: number;
  transaction: ITransaction;
}

export interface IDateRange {
  fromDate: Date;
  toDate: Date;
}

export interface ICategoryBudget {
  id: number;
  user_id: string;
  category_id: number;
  from_date: Date;
  to_date: Date;
  created_at: Date;
  updated_at: null;
  amount: number;
  category_type: string;
  category: ICategoryV2;
  transaction: Array<ITransactionV2>;
  amountSpent: number;
}

export interface ICategoryV2 {
  icon: string;
  type: "WEEKLY" | "MONTHLY";
  user_id: string;
  created_at: Date;
  category_id: number;
  category_name: string;
  background_color: string;
}

export interface ITransactionV2 {
  id: number;
  created_at?: Date;
  amount: number;
  description: string;
  date: Date;
  user_id: string;
  category_id: number;
  category_type: "WEEKLY" | "MONTHLY";
  user_deleted: boolean;
}

export interface IAddBudgetCategory extends ICategoryV2 {
  budgetDetails: ICategoryBudget;
  isModified: boolean;
  budgetAlreadyExisting: boolean;
}
