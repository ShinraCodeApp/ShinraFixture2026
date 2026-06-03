import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import { MMKV } from 'react-native-mmkv';

import authReducer from './slices/authSlice';
import matchesReducer from './slices/matchesSlice';
import teamsReducer from './slices/teamsSlice';
import predictionsReducer from './slices/predictionsSlice';
import notificationsReducer from './slices/notificationsSlice';
import settingsReducer from './slices/settingsSlice';

// MMKV for Redux Persist (faster than AsyncStorage)
const storage = new MMKV();
const mmkvStorage = {
  setItem: (key: string, value: string) => { storage.set(key, value); return Promise.resolve(true); },
  getItem: (key: string) => { const value = storage.getString(key); return Promise.resolve(value); },
  removeItem: (key: string) => { storage.delete(key); return Promise.resolve(); },
};

const rootReducer = combineReducers({
  auth: authReducer,
  matches: matchesReducer,
  teams: teamsReducer,
  predictions: predictionsReducer,
  notifications: notificationsReducer,
  settings: settingsReducer,
});

const persistConfig = {
  key: 'shinra-root',
  storage: mmkvStorage,
  whitelist: ['auth', 'settings'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
  devTools: __DEV__,
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
