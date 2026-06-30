import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { REHYDRATE } from 'redux-persist';
import { apiService, API_URL } from '../../services/api';

async function authGet(path: string, params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  const fullUrl = `${API_URL}${path}?${qs}`;
  let res: Response;
  try {
    res = await fetch(fullUrl);
  } catch (e: any) {
    const msg = `Sin conexión. URL: ${fullUrl.substring(0, 60)}... Error: ${e?.message}`;
    throw new Error(msg);
  }
  let json: any;
  let rawText = '';
  try {
    rawText = await res.text();
    json = JSON.parse(rawText);
  } catch {
    throw new Error(`Respuesta inválida (${res.status}): ${rawText.substring(0, 100)}`);
  }
  if (!res.ok) {
    const fieldErrors = json?.errors?.map((e: any) => `${e.field}: ${e.message}`).join(', ');
    throw new Error(fieldErrors ?? json?.message ?? json?.error ?? `Error ${res.status}`);
  }
  return json.data;
}

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatar?: string;
  role: string;
  isPremium: boolean;
  level: number;
  xp: number;
  predictionPoints: number;
  totalPredictions: number;
  correctPredictions: number;
  country?: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasSeenOnboarding: boolean;
  error: string | null;
  guestMode: boolean;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  hasSeenOnboarding: false,
  error: null,
  guestMode: false,
};

export const login = createAsyncThunk(
  'auth/login',
  async ({ identifier, password, rememberMe }: { identifier: string; password: string; rememberMe?: boolean }, { rejectWithValue }) => {
    try {
      return await authGet('/auth/g-login', { identifier, password, rememberMe: rememberMe ? 'true' : 'false' });
    } catch (err: any) {
      return rejectWithValue(err.message || 'No se pudo iniciar sesión. Verificá tus datos.');
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (dto: { email: string; username: string; displayName: string; password: string }, { rejectWithValue }) => {
    try {
      return await authGet('/auth/g-register', { ...dto });
    } catch (err: any) {
      return rejectWithValue(err.message || 'No se pudo crear la cuenta. Intentá de nuevo.');
    }
  }
);

export const fetchMe = createAsyncThunk('auth/me', async (_, { rejectWithValue }) => {
  try {
    const response = await apiService.get('/auth/me');
    return response.data.data;
  } catch (err: any) {
    return rejectWithValue('Session expired');
  }
});

export const logout = createAsyncThunk('auth/logout', async (_, { rejectWithValue }) => {
  try {
    await apiService.get('/auth/g-logout');
  } catch {
    // Always proceed with local logout
  }
});

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (dto: Partial<AuthUser>, { rejectWithValue }) => {
    try {
      const response = await apiService.get('/users/g-update-me', { params: dto });
      return response.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? 'Update failed');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setTokens(state, action: PayloadAction<{ accessToken: string; refreshToken: string }>) {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.isAuthenticated = true;
    },
    setUser(state, action: PayloadAction<AuthUser>) {
      state.user = action.payload;
    },
    clearAuth(state) {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
    },
    setHasSeenOnboarding(state) {
      state.hasSeenOnboarding = true;
    },
    setGuestMode(state) {
      state.guestMode = true;
    },
    clearGuest(state) {
      state.guestMode = false;
    },
    clearError(state) {
      state.error = null;
    },
    updateUserPoints(state, action: PayloadAction<{ points: number }>) {
      if (state.user) {
        state.user.predictionPoints = action.payload.points;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Always reset isLoading on rehydrate — prevents stuck loading if app was killed mid-request
      .addCase(REHYDRATE, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      // Login
      .addCase(login.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.isAuthenticated = true;
        state.guestMode = false;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Register
      .addCase(register.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.isAuthenticated = true;
        state.guestMode = false;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch Me
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(fetchMe.rejected, (state) => {
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
      })
      // Update Profile
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = { ...state.user!, ...action.payload };
      });
  },
});

export const { setTokens, setUser, clearAuth, setHasSeenOnboarding, clearError, updateUserPoints, setGuestMode, clearGuest } = authSlice.actions;
export default authSlice.reducer;
