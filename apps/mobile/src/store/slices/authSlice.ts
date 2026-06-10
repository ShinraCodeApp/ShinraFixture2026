import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { REHYDRATE } from 'redux-persist';
import { apiService, API_URL } from '../../services/api';

async function authGet(path: string, params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${API_URL}${path}?${qs}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message ?? json?.error ?? `Error ${res.status}`);
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
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  hasSeenOnboarding: false,
  error: null,
};

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      return await authGet('/auth/g-login', { email, password });
    } catch (err: any) {
      return rejectWithValue(err.message ?? 'Login failed');
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (dto: { email: string; username: string; displayName: string; password: string }, { rejectWithValue }) => {
    try {
      return await authGet('/auth/g-register', { ...dto });
    } catch (err: any) {
      return rejectWithValue(err.message ?? 'Registration failed');
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
    await apiService.post('/auth/logout');
  } catch {
    // Always proceed with local logout
  }
});

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (dto: Partial<AuthUser>, { rejectWithValue }) => {
    try {
      const response = await apiService.patch('/users/me', dto);
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

export const { setTokens, setUser, clearAuth, setHasSeenOnboarding, clearError, updateUserPoints } = authSlice.actions;
export default authSlice.reducer;
