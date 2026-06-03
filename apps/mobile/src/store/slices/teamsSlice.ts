import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Team {
  id: string;
  name: string;
  code: string;
  flagUrl?: string;
  group?: string;
  region: string;
  fifaRanking?: number;
}

interface TeamsState {
  teams: Team[];
  lastFetched: number | null;
}

const teamsSlice = createSlice({
  name: 'teams',
  initialState: { teams: [], lastFetched: null } as TeamsState,
  reducers: {
    setTeams(state, action: PayloadAction<Team[]>) {
      state.teams = action.payload;
      state.lastFetched = Date.now();
    },
  },
});

export const { setTeams } = teamsSlice.actions;
export default teamsSlice.reducer;
