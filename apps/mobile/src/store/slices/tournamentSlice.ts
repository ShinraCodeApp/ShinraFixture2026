import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface TournamentState {
  selectedId: string | null;
}

const initialState: TournamentState = {
  selectedId: null,
};

const tournamentSlice = createSlice({
  name: 'tournament',
  initialState,
  reducers: {
    selectTournament(state, action: PayloadAction<string | null>) {
      state.selectedId = action.payload;
    },
  },
});

export const { selectTournament } = tournamentSlice.actions;
export default tournamentSlice.reducer;
