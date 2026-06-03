import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SettingsState {
  colorScheme: 'light' | 'dark' | 'system';
  language: string;
  notificationsEnabled: boolean;
  liveScoreAlerts: boolean;
  goalAlerts: boolean;
  predictionReminders: boolean;
  favoriteTeamAlerts: boolean;
}

const initialState: SettingsState = {
  colorScheme: 'dark',
  language: 'es',
  notificationsEnabled: true,
  liveScoreAlerts: true,
  goalAlerts: true,
  predictionReminders: true,
  favoriteTeamAlerts: true,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setColorScheme(state, action: PayloadAction<'light' | 'dark' | 'system'>) {
      state.colorScheme = action.payload;
    },
    toggleTheme(state) {
      state.colorScheme = state.colorScheme === 'dark' ? 'light' : 'dark';
    },
    setLanguage(state, action: PayloadAction<string>) {
      state.language = action.payload;
    },
    setNotificationsEnabled(state, action: PayloadAction<boolean>) {
      state.notificationsEnabled = action.payload;
    },
    updateAlerts(state, action: PayloadAction<Partial<Omit<SettingsState, 'colorScheme' | 'language'>>>) {
      return { ...state, ...action.payload };
    },
  },
});

export const { setColorScheme, toggleTheme, setLanguage, setNotificationsEnabled, updateAlerts } = settingsSlice.actions;
export default settingsSlice.reducer;
