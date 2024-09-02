import { combineReducers } from "@reduxjs/toolkit";

import AuthSlice from "./slice/authSlice";
import HomeSlice from "./slice/homeSlice";

const rootReducer = combineReducers({
  AuthSlice,
  HomeSlice,
});

export default rootReducer;
