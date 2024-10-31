import AsyncStorage from "@react-native-async-storage/async-storage";
import { type Middleware, type Tuple, configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import {
  FLUSH,
  PAUSE,
  PERSIST,
  persistReducer,
  persistStore,
  PURGE,
  REGISTER,
  REHYDRATE,
} from "redux-persist";
import rootReducer from "../reducers";
import localStorage from "redux-persist/lib/storage";
import { Platform } from "react-native";

const persistConfig = {
  key: "root",
  // storage: Platform.OS === "web" ? localStorage : AsyncStorage,
  storage: AsyncStorage,
  whitelist: ["AuthSlice", "HomeSlice"],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) => {
    const middlewaresDefault = getDefaultMiddleware({
      serializableCheck: false,
    });

    return middlewaresDefault;
  },
});

const persistor = persistStore(store);
export type RootState = ReturnType<typeof store.getState>;
setupListeners(store.dispatch);

export { store, persistor };
