import { ICategoryV2, ITransactionV2 } from "./HomeScreenTypes";

export interface ITransactionList extends ITransactionV2 {
  category: ICategoryV2;
}

export interface ITransactionFileForProcessing {
  created_at: string;
  id: number;
  name: string;
  status: "PROCESSED" | "NOT_PROCESSED" | "ERROR" | "PROCESSING" | "SYNCHED";
  transaction_source: "PAYTM";
  uniqueName: string;
  user_id: string;
}

export interface IProcessedTransaction {
  amount: number;
  created_at: string;
  date: string;
  description: string;
  file_name: string;
  id: number;
  status: "NOT_UPDATED" | "UPDATED";
  user_id: string;
  category_id?: ICategoryV2;
  category_type: ICategoryV2["type"];
  synced: boolean;
  transaction_date: Date;
}
