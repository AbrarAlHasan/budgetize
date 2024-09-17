import { ICategory, ICategorySpends } from "@/types/HomeScreenTypes";
import { getCurrentWeekRange } from "@/utils/DateCalculator";
import { type PayloadAction, createSlice } from "@reduxjs/toolkit";

interface IHomeSlice {
  isDateRangeVisible: boolean;
  dateRange: { fromDate: Date; toDate: Date };
  totalWeeklyBudget: number;
  weeklyCategories: Array<ICategory>;
  totalMonthlyBudget: number;
  monthlyCategories: Array<ICategory>;
  totalWeeklyBudgetLeft: number;
  totalMonthlyBudgetLeft: number;
  weeklyCategoryList: Array<ICategory>;
  monthlyCategoryList: Array<ICategory>;
  homeDataApiTrigger: boolean;
  categoryDataApiTrigger: boolean;
}

const initialState: IHomeSlice = {
  dateRange: {
    fromDate: getCurrentWeekRange().fromDate,
    toDate: getCurrentWeekRange().toDate,
  },
  isDateRangeVisible: false,
  totalWeeklyBudget: 0,
  weeklyCategories: [],
  totalMonthlyBudget: 0,
  monthlyCategories: [],
  totalWeeklyBudgetLeft: 0,
  totalMonthlyBudgetLeft: 0,
  weeklyCategoryList: [],
  monthlyCategoryList: [],
  homeDataApiTrigger: false,
  categoryDataApiTrigger: false,
};

const homeSlice = createSlice({
  name: "HomeSlice",
  initialState,
  reducers: {
    setIsDateRangeVisible: (state, action) => {
      state.isDateRangeVisible = action.payload;
    },
    setDateRange: (state, action) => {
      state.dateRange = action.payload;
    },
    setTotalWeeklyBudget: (state, action) => {
      state.totalWeeklyBudget = action.payload;
    },
    setWeeklyCategories: (state, action) => {
      state.weeklyCategories = action.payload;
    },
    setTotalMonthlyBudget: (state, action) => {
      state.totalMonthlyBudget = action.payload;
    },
    setMonthlyCategories: (state, action) => {
      state.monthlyCategories = action.payload;
    },
    setTotalWeeklyBudgetLeft: (state, action) => {
      state.totalWeeklyBudgetLeft = action.payload;
    },
    setTotalMonthlyBudgetLeft: (state, action) => {
      state.totalMonthlyBudgetLeft = action.payload;
    },
    setWeeklyCategoryList: (state, action) => {
      state.weeklyCategoryList = action.payload;
    },
    setMonthlyCategoryList: (state, action) => {
      state.monthlyCategoryList = action.payload;
    },
    triggerHomeApi: (state) => {
      state.homeDataApiTrigger = !state.homeDataApiTrigger;
    },
    triggerCategoryApi: (state) => {
      state.categoryDataApiTrigger = !state.categoryDataApiTrigger;
    },
  },
});

export const {
  setIsDateRangeVisible,
  setDateRange,
  setTotalWeeklyBudget,
  setWeeklyCategories,
  setTotalMonthlyBudget,
  setMonthlyCategories,
  setTotalWeeklyBudgetLeft,
  setTotalMonthlyBudgetLeft,
  setWeeklyCategoryList,
  setMonthlyCategoryList,
  triggerHomeApi,
  triggerCategoryApi,
} = homeSlice.actions;

export default homeSlice.reducer;
