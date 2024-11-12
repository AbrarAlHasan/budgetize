import { supabase } from "@/lib/supabase";
import { store } from "@/redux/store";
import { DateRange } from "@/types/GeneralTypes";
import { formatDateTimeTimezone } from "@/utils/DateCalculator";

export const getTransactionList = async ({ fromDate, toDate }: DateRange) => {
  const response = await supabase
    .from("transactions")
    .select("* ,category(*)")
    .eq("user_id", store.getState().AuthSlice.userDetails?.user_id)
    .gte("date", formatDateTimeTimezone(fromDate))
    .lte("date", formatDateTimeTimezone(toDate))
    .order("date", { ascending: false });

  return { response: response?.data, error: response?.error };
};
