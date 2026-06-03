import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Match {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore?: number | null;
  awayScore?: number | null;
  status: string;
  minute?: number | null;
  matchDate: string;
  stage: string;
  group?: string | null;
}

interface MatchesState {
  liveMatches: Match[];
  lastUpdated: number | null;
}

const initialState: MatchesState = {
  liveMatches: [],
  lastUpdated: null,
};

const matchesSlice = createSlice({
  name: 'matches',
  initialState,
  reducers: {
    setLiveMatches(state, action: PayloadAction<Match[]>) {
      state.liveMatches = action.payload;
      state.lastUpdated = Date.now();
    },
    updateMatchScore(state, action: PayloadAction<{ id: string; homeScore: number; awayScore: number; minute: number }>) {
      const { id, homeScore, awayScore, minute } = action.payload;
      const match = state.liveMatches.find((m) => m.id === id);
      if (match) {
        match.homeScore = homeScore;
        match.awayScore = awayScore;
        match.minute = minute;
      }
    },
    updateMatchStatus(state, action: PayloadAction<{ id: string; status: string }>) {
      const match = state.liveMatches.find((m) => m.id === action.payload.id);
      if (match) match.status = action.payload.status;
    },
  },
});

export const { setLiveMatches, updateMatchScore, updateMatchStatus } = matchesSlice.actions;
export default matchesSlice.reducer;
