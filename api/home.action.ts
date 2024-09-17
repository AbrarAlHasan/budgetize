import { supabase } from "@/lib/supabase";
import { store } from "@/redux/store";
import { formatDateTimeTimezone } from "@/utils/DateCalculator";

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
      .lte("created_at", formatDateTimeTimezone(toDate))
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
      .lte("created_at", formatDateTimeTimezone(toDate))
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
