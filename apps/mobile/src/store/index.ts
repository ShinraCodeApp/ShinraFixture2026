import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';

import authReducer from './slices/authSlice';
import matchesReducer from './slices/matchesSlice';
import teamsReducer from './slices/teamsSlice';
import predictionsReducer from './slices/predictionsSlice';
import notificationsReducer from './slices/notificationsSlice';
import settingsReducer from './slices/settingsSlice';
import tournamentReducer from './slices/tournamentSlice';

const mmkvStorage = AsyncStorage;

const rootReducer = combineReducers({
  auth: authReducer,
  matches: matchesReducer,
  teams: teamsReducer,
  predictions: predictionsReducer,
  notifications: notificationsReducer,
  settings: settingsReducer,
  tournament: tournamentReducer,
});

const persistConfig = {
  key: 'shinra-root',
  storage: mmkvStorage,
  whitelist: ['auth', 'settings', 'tournament'],
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
