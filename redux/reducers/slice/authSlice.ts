import { type PayloadAction, createSlice } from "@reduxjs/toolkit";

interface AuthSlice {
  language?: string;
  isAuthenticated: boolean;
  checkingAuthentication: boolean;
  userDetails: IUserDetails | null;
}
interface IUserDetails {
  created_at: string;
  email: string;
  name: string;
  phonenumber: string;
  user_id: string;
}

const initialState: AuthSlice = {
  language: "en",
  isAuthenticated: false,
  checkingAuthentication: true,
  userDetails: null,
};

const authSlice = createSlice({
  name: "authSlice",
  initialState,
  reducers: {
    setLanguage: (state, action: PayloadAction<string>) => {
      state.language = action.payload;
    },
    setCheckingAuthentication: (state, action) => {
      state.checkingAuthentication = action.payload.checkingAuthentication;
      state.isAuthenticated = action.payload.isAuthenticated;
    },
    setUserDetails: (state, action) => {
      state.userDetails = action.payload;
    },
    logout: (state) => {
      state.userDetails = null;
      state.isAuthenticated = false;
    },
  },
});

export const {
  setLanguage,
  setCheckingAuthentication,
  setUserDetails,
  logout,
} = authSlice.actions;

export default authSlice.reducer;
