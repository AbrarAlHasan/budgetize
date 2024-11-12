import { ICategoryV2, ITransactionV2 } from "./HomeScreenTypes";

export interface ITransactionList extends ITransactionV2 {
  category: ICategoryV2;
}
