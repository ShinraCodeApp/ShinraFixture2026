import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type AppIconId = 'SCFixture1' | 'SCFixture2';

export interface FavoriteTeam {
  id: string;
  name: string;
  code: string;
  flagUrl: string;
  shieldUrl?: string;
}

interface SettingsState {
  colorScheme: 'light' | 'dark' | 'system';
  language: string;
  notificationsEnabled: boolean;
  liveScoreAlerts: boolean;
  goalAlerts: boolean;
  predictionReminders: boolean;
  favoriteTeamAlerts: boolean;
  appIcon: AppIconId;
  favoriteTeam: FavoriteTeam | null;
  profilePhotoUri: string | null;
}

const initialState: SettingsState = {
  colorScheme: 'dark',
  language: 'es',
  notificationsEnabled: true,
  liveScoreAlerts: true,
  goalAlerts: true,
  predictionReminders: true,
  favoriteTeamAlerts: true,
  appIcon: 'SCFixture1',
  favoriteTeam: null,
  profilePhotoUri: null,
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
    setAppIcon(state, action: PayloadAction<AppIconId>) {
      state.appIcon = action.payload;
    },
    setFavoriteTeam(state, action: PayloadAction<FavoriteTeam | null>) {
      state.favoriteTeam = action.payload;
    },
    setProfilePhoto(state, action: PayloadAction<string | null>) {
      state.profilePhotoUri = action.payload;
    },
  },
});

export const {
  setColorScheme,
  toggleTheme,
  setLanguage,
  setNotificationsEnabled,
  updateAlerts,
  setAppIcon,
  setFavoriteTeam,
  setProfilePhoto,
} = settingsSlice.actions;
export default settingsSlice.reducer;
