import { combineReducers } from "@reduxjs/toolkit";

import AuthSlice from "./slice/authSlice";
import HomeSlice from "./slice/homeSlice";
import GlobalSlice from "./slice/globalSlice";

const rootReducer = combineReducers({
  AuthSlice,
  HomeSlice,
  GlobalSlice,
});

export default rootReducer;
