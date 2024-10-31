import { type PayloadAction, createSlice } from "@reduxjs/toolkit";

interface IGlobalSlice {
  isLoading: boolean;
}

const initialState: IGlobalSlice = {
  isLoading: false,
};

const globalSlice = createSlice({
  name: "globalSlice",
  initialState,
  reducers: {
    enableLoading: (state) => {
      state.isLoading = true;
    },
    disableLoading: (state) => {
      state.isLoading = false;
    },
  },
});

export const { enableLoading, disableLoading } = globalSlice.actions;

export default globalSlice.reducer;
