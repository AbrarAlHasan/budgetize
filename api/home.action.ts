import { supabase } from "@/lib/supabase";
import {
  disableLoading,
  enableLoading,
} from "@/redux/reducers/slice/globalSlice";
import {
  setMonthlyCategoryBudget,
  setTotalMonthlyBudget,
  setTotalMonthlyBudgetLeft,
  setTotalWeeklyBudget,
  setTotalWeeklyBudgetLeft,
  setWeeklyCategoryBudget,
} from "@/redux/reducers/slice/homeSlice";
import { store } from "@/redux/store";
import { ICategoryBudget, ITransactionV2 } from "@/types/HomeScreenTypes";
import { groupData } from "@/utils/CommonUtlis";
import {
  formatDateTimeTimezone,
  getCurrentMonthRange,
} from "@/utils/DateCalculator";

export const getCurrentWeekBudget = async ({
  fromDate,
  toDate,
}: {
  fromDate: Date;
  toDate: Date;
}) => {
  try {
    const response = await supabase
      .from("category")
      .select("*, transactions(*)")
      .eq("user_id", store.getState().AuthSlice.userDetails?.user_id)
      .gte("transactions.date", formatDateTimeTimezone(fromDate))
      .lte("transactions.date", formatDateTimeTimezone(toDate))
      .lte("from_date", formatDateTimeTimezone(fromDate))
      .eq("type", "WEEKLY");
    return { response: response?.data, error: response?.error };
  } catch (error) {
    return { response: null, error: error };
  }
};

export const getCurrentMonthBudget = async ({
  fromDate,
  toDate,
}: {
  fromDate: Date;
  toDate: Date;
}) => {
  try {
    const response = await supabase
      .from("category")
      .select("*, transactions(*)")
      .eq("user_id", store.getState().AuthSlice.userDetails?.user_id)
      .gte("transactions.date", formatDateTimeTimezone(fromDate))
      .lte("transactions.date", formatDateTimeTimezone(toDate))
      .lte("from_date", formatDateTimeTimezone(fromDate))
      .eq("type", "MONTHLY");

    return { response: response?.data, error: response?.error };
  } catch (error) {
    return { response: null, error: error };
  }
};

export const getTransactionsBasedOnCategory = async (
  category_id: number,
  fromDate: Date,
  toDate: Date
) => {
  try {
    const response = await supabase
      .from("category")
      .select("*, transactions(*)")
      .eq("category_id", category_id)
      .gte("transactions.date", formatDateTimeTimezone(fromDate))
      .lte("transactions.date", formatDateTimeTimezone(toDate));
  } catch (error) {}
};

export const getWeeklyCategoryList = async () => {
  try {
    const response = await supabase
      .from("category")
      .select()
      .eq("user_id", store.getState().AuthSlice.userDetails?.user_id)
      .eq("type", "WEEKLY");
    return { response: response?.data, error: response?.error };
  } catch (error) {
    return { response: null, error: error };
  }
};

export const getMonthlyCategoryList = async () => {
  try {
    const response = await supabase
      .from("category")
      .select()
      .eq("user_id", store.getState().AuthSlice.userDetails?.user_id)
      .eq("type", "MONTHLY");
    return { response: response?.data, error: response?.error };
  } catch (error) {
    return { response: null, error: error };
  }
};

export const getCurrentWeekBudgetV2 = async ({
  fromDate,
  toDate,
}: {
  fromDate: Date;
  toDate: Date;
}) => {
  try {
    const [budgetResponse, transactionResponse] = await Promise.allSettled([
      supabase
        .from("budget")
        .select("*, category(*)")
        .eq("user_id", store.getState().AuthSlice.userDetails?.user_id)
        .eq("category_type", "WEEKLY")
        .gte("from_date", formatDateTimeTimezone(fromDate))
        .lte("to_date", formatDateTimeTimezone(toDate)),

      supabase
        .from("transactions")
        .select()
        .eq("user_id", store.getState().AuthSlice.userDetails?.user_id)
        .eq("category_type", "WEEKLY")
        .gte("date", formatDateTimeTimezone(fromDate))
        .lte("date", formatDateTimeTimezone(toDate)),
    ]);

    const budget: any = {
      error: false,
      response: [],
    };
    let budgetForManipulating: Array<ICategoryBudget> = [];
    let transactionsForManipulating: Array<ITransactionV2> = [];
    let unBudgetedTransactions: Array<ITransactionV2> = [];
    let totalBudget = 0;
    if (
      budgetResponse?.status === "fulfilled" &&
      budgetResponse?.value?.error === null
    ) {
      budgetForManipulating = budgetResponse?.value?.data;
      totalBudget = budgetForManipulating?.reduce(
        (acc, curr) => acc + curr.amount,
        0
      );
      store.dispatch(setTotalWeeklyBudget(totalBudget));
    }
    if (
      transactionResponse?.status === "fulfilled" &&
      transactionResponse?.value?.error === null
    ) {
      transactionsForManipulating = transactionResponse?.value?.data;

      const {
        budgetList,
        transactionList,
        unBudgetedTransactions,
        totalAmountSpent,
      } = appendBudgetAndTransactions(
        budgetForManipulating,
        transactionsForManipulating
      );

      store.dispatch(setTotalWeeklyBudgetLeft(totalBudget - totalAmountSpent));
      return { response: budgetList, error: null };
    }

    return { response: [], error: true };
  } catch (error) {
    console.log(error);
    return { response: null, error: error };
  }
};

export const getCurrentMonthBudgetV2 = async ({
  fromDate,
  toDate,
}: {
  fromDate: Date;
  toDate: Date;
}) => {
  try {
    const [budgetResponse, transactionResponse] = await Promise.allSettled([
      supabase
        .from("budget")
        .select("*, category(*)")
        .eq("user_id", store.getState().AuthSlice.userDetails?.user_id)
        .eq("category_type", "MONTHLY")
        .gte("from_date", formatDateTimeTimezone(fromDate))
        .lte("to_date", formatDateTimeTimezone(toDate)),

      supabase
        .from("transactions")
        .select()
        .eq("user_id", store.getState().AuthSlice.userDetails?.user_id)
        .eq("category_type", "MONTHLY")
        .gte("date", formatDateTimeTimezone(fromDate))
        .lte("date", formatDateTimeTimezone(toDate)),
    ]);
    const budget: any = {
      error: false,
      response: [],
    };

    let budgetForManipulating: Array<ICategoryBudget> = [];
    let transactionsForManipulating: Array<ITransactionV2> = [];
    let unBudgetedTransactions: Array<ITransactionV2> = [];
    let totalBudget = 0;
    if (
      budgetResponse?.status === "fulfilled" &&
      budgetResponse?.value?.error === null
    ) {
      budgetForManipulating = budgetResponse?.value?.data;
      totalBudget = budgetForManipulating?.reduce(
        (acc, curr) => acc + curr.amount,
        0
      );
      store.dispatch(setTotalMonthlyBudget(totalBudget));
    }
    if (
      transactionResponse?.status === "fulfilled" &&
      transactionResponse?.value?.error === null
    ) {
      transactionsForManipulating = transactionResponse?.value?.data;

      const {
        budgetList,
        transactionList,
        unBudgetedTransactions,
        totalAmountSpent,
      } = appendBudgetAndTransactions(
        budgetForManipulating,
        transactionsForManipulating
      );

      store.dispatch(setTotalMonthlyBudgetLeft(totalBudget - totalAmountSpent));
      return { response: budgetList, error: null };
    }

    return { response: [], error: true };
  } catch (error) {
    return { response: null, error: error };
  }
};

const appendBudgetAndTransactions = (
  budgetList: Array<ICategoryBudget>,
  transactionList: Array<ITransactionV2>
) => {
  let budgetForManipulating = budgetList;
  let transactionsForManipulating = transactionList;
  let unBudgetedTransactions: Array<ITransactionV2> = [];
  let totalAmountSpent = 0;

  transactionsForManipulating?.map((transaction) => {
    const index = budgetForManipulating?.findIndex(
      (budget) => budget?.category_id === transaction?.category_id
    );
    if (index === -1) {
      unBudgetedTransactions?.push(transaction);
      return;
    }

    // Append The Transaction List into the Budget
    if (Array.isArray(budgetForManipulating[index]?.transaction)) {
      budgetForManipulating[index].transaction = [
        ...budgetForManipulating[index]?.transaction,
        transaction,
      ];
    } else {
      budgetForManipulating[index].transaction = [transaction];
    }

    // To Append the total Amount Spend For the Particular Budget
    if (budgetForManipulating[index]?.amountSpent) {
      budgetForManipulating[index].amountSpent += transaction?.amount;
    } else {
      budgetForManipulating[index].amountSpent = transaction?.amount;
    }

    totalAmountSpent += transaction?.amount;
  });
  return {
    budgetList,
    transactionList,
    unBudgetedTransactions,
    totalAmountSpent,
  };
};

export const getCategoryBasedOnDate = async ({
  type,
  fromDate,
  toDate,
}: {
  type: "WEEKLY" | "MONTHLY";
  fromDate: Date;
  toDate: Date;
}) => {
  try {
    const response = await supabase
      .from("budget")
      .select("*, category(*)")
      .eq("user_id", store.getState().AuthSlice.userDetails?.user_id)
      .eq("category_type", type)
      .gte("from_date", formatDateTimeTimezone(fromDate))
      .lte("to_date", formatDateTimeTimezone(toDate));

    return { response: response?.data, error: response?.error };
  } catch (error) {
    return { response: null, error: error };
  }
};

export const fetchHomeDataV2 = async (setLoading = false) => {
  try {
    if (setLoading) {
      store.dispatch(enableLoading());
    }
    const [weeklyResponse, monthlyResponse] = await Promise.all([
      getCurrentWeekBudgetV2({
        fromDate: store.getState().HomeSlice.dateRange.fromDate,
        toDate: store.getState().HomeSlice.dateRange.toDate,
      }),
      getCurrentMonthBudgetV2(
        getCurrentMonthRange(store.getState().HomeSlice.dateRange.fromDate)
      ),
    ]);

    if (monthlyResponse?.error === null) {
      store.dispatch(setMonthlyCategoryBudget(monthlyResponse?.response));
    }

    if (weeklyResponse?.error === null) {
      store.dispatch(setWeeklyCategoryBudget(weeklyResponse?.response));
    }
  } catch (error) {
  } finally {
    if (setLoading) {
      store.dispatch(disableLoading());
    }
  }
};
