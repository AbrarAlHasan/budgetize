import { data } from "@/components/Reports/constants";
import { supabase } from "@/lib/supabase";
import { triggerHomeApi } from "@/redux/reducers/slice/homeSlice";
import { store } from "@/redux/store";
import {
  diffBetweenDates,
  diffInDays,
  formatDateTimeTimezone,
  getCurrentMonthRange,
  getCurrentWeekRange,
  getPrevNthDay,
} from "@/utils/DateCalculator";

export const copyPreviousBudget: any = async ({
  fromDate,
  toDate,
  useLoading,
  type,
}: {
  fromDate: Date;
  toDate: Date;
  useLoading?: boolean;
  type: "WEEKLY" | "MONTHLY";
}) => {
  const currentStartDate = fromDate;
  let previousStartDate = getPrevNthDay({ date: currentStartDate, days: 1 });
  let previousDateRange;
  if (type === "WEEKLY") {
    previousDateRange = getCurrentWeekRange(previousStartDate.toDate());
  }
  if (type === "MONTHLY") {
    previousDateRange = getCurrentMonthRange(previousStartDate.toDate());
  }

  let refetchData = false;
  let fetchedDates;
  let budgetList: any = [];
  const checkIfOneBudgetIsAvailable = await supabase
    .from("budget")
    .select("*")
    .eq("user_id", store.getState().AuthSlice.userDetails?.user_id)
    .eq("category_type", type)
    .lte("from_date", formatDateTimeTimezone(previousDateRange?.fromDate));

  if (
    checkIfOneBudgetIsAvailable?.data?.length === 0 ||
    !checkIfOneBudgetIsAvailable?.data
  ) {
    return { error: true, message: "No Budget Available. Please Add Budget" };
  }
  if (
    checkIfOneBudgetIsAvailable?.data &&
    checkIfOneBudgetIsAvailable?.data?.length > 0
  ) {
    const sortedList = checkIfOneBudgetIsAvailable?.data?.sort(
      (dataA, dataB) => {
        return new Date(dataB?.from_date) - new Date(dataA?.from_date); // Sorting in descending order
      }
    );

    const diff = diffBetweenDates({
      fromDate: new Date(sortedList[0]?.from_date),
      toDate: fromDate,
      type: type === "WEEKLY" ? "week" : "month",
    });
    if (diff > 10) {
      return {
        error: true,
        message: `No Budget is added in recent ${
          type === "WEEKLY" ? "weeks" : "month"
        }. So please add budget to continue adding Transactions`,
      };
    }
  }

  const response = await supabase
    .from("budget")
    .select("*")
    .eq("user_id", store.getState().AuthSlice.userDetails?.user_id)
    .eq("category_type", type)
    .gte("from_date", formatDateTimeTimezone(previousDateRange?.fromDate))
    .lte("to_date", formatDateTimeTimezone(previousDateRange?.toDate));

  if (response?.status === 200 && response?.error === null) {
    if (response?.data?.length > 0) {
      return {
        fromDate: previousDateRange?.fromDate,
        toDate: previousDateRange?.toDate,
        fetchedSuccess: true,
        budgetList: response?.data,
      };
    } else {
      // If no data is found, recursively call the function for the previous week
      return await copyPreviousBudget({
        fromDate: previousDateRange?.fromDate,
        toDate: previousDateRange?.toDate,
        type: type,
      });
    }
  }
  return undefined;
};

export const insertBudgetToDB = async ({
  budgetList,
  fromDate,
  toDate,
}: {
  budgetList: any;
  fromDate?: Date;
  toDate?: Date;
}) => {
  const updatedBudgetList = budgetList?.map((data) => {
    const updatedData = { ...data };
    delete updatedData.id;
    if (fromDate) {
      updatedData.from_date = formatDateTimeTimezone(fromDate);
    }
    if (toDate) {
      updatedData.to_date = formatDateTimeTimezone(toDate);
    }
    return updatedData;
  });

  const response = await supabase.from("budget").insert(updatedBudgetList);
};
