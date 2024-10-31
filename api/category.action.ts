import { supabase } from "@/lib/supabase";
import { store } from "@/redux/store";
import { formatDateTimeTimezone } from "@/utils/DateCalculator";

export const fetchCategoryBasedOnName = async ({
  name,
  categoryType,
  categoryId,
}: {
  name: string;
  categoryType: "WEEKLY" | "MONTHLY";
  categoryId?: string | undefined;
}) => {
  try {
    let response;
    if (categoryId) {
      await supabase
        .from("category")
        .select("*")
        .eq("user_id", store.getState().AuthSlice.userDetails?.user_id)
        .ilike("category_name", name)
        .neq("category_id", parseInt(categoryId));
    } else {
      response = await supabase
        .from("category")
        .select("*")
        .eq("user_id", store.getState().AuthSlice.userDetails?.user_id)
        .ilike("category_name", name);
    }
    return { response: response?.data, error: response?.error };
  } catch (error) {
    return { response: null, error: error };
  }
};

export const fetchCategoryList = async ({
  type,
  fromDate,
  toDate,
}: {
  type: "WEEKLY" | "MONTHLY";
  fromDate: Date;
  toDate: Date;
}) => {};

export const fetchAddBudgetList = async ({
  type,
  fromDate,
  toDate,
}: {
  type: "WEEKLY" | "MONTHLY";
  fromDate: Date;
  toDate: Date;
}) => {
  const categoryListForManipulating: any = [];
  const categoryList = await supabase
    .from("category")
    .select("*")
    .eq("user_id", store.getState().AuthSlice.userDetails?.user_id)
    .eq("type", type);
  if (categoryList?.error === null) {
    categoryList?.data?.map((data) => {
      categoryListForManipulating?.push({
        ...data,
        // isModified: false,
        // budgetAlreadyExisting: false,
      });
    });
  }
  const budgetList = await supabase
    .from("budget")
    .select("*")
    .eq("user_id", store.getState().AuthSlice.userDetails?.user_id)
    .eq("category_type", type)
    .gte("from_date", formatDateTimeTimezone(fromDate))
    .lte("to_date", formatDateTimeTimezone(toDate));

  if (budgetList?.error === null) {
    budgetList?.data?.map((budget) => {
      const index = categoryListForManipulating?.findIndex(
        (category: any) => category?.category_id === budget?.category_id
      );

      if (index != -1) {
        categoryListForManipulating[index].budgetDetails = budget;
        // categoryListForManipulating[index].isModified = false;
        // categoryListForManipulating[index].budgetAlreadyExisting = true;
      }
      // } else {
      //   categoryListForManipulating[index].isModified = false;
      //   categoryListForManipulating[index].budgetAlreadyExisting = false;
      // }
    });
  }

  return categoryListForManipulating;
};
