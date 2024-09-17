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
