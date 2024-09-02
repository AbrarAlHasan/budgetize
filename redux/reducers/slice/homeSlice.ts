import { getCurrentWeekRange } from "@/utils/DateCalculator";
import { type PayloadAction, createSlice } from "@reduxjs/toolkit";

interface IHomeSlice {}

const initialState = {
  dateRange: {
    fromDate: getCurrentWeekRange().fromDate,
    toDate: getCurrentWeekRange().toDate,
  },
  isDateRangeVisible: false,
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
  },
});

export const { setIsDateRangeVisible, setDateRange } = homeSlice.actions;

export default homeSlice.reducer;
