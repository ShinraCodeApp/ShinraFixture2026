import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Prediction {
  id: string;
  matchId: string;
  homeScore: number;
  awayScore: number;
  status: string;
  pointsEarned: number;
}

interface PredictionsState {
  predictions: Record<string, Prediction>; // keyed by matchId
  totalPoints: number;
}

const predictionsSlice = createSlice({
  name: 'predictions',
  initialState: { predictions: {}, totalPoints: 0 } as PredictionsState,
  reducers: {
    setPrediction(state, action: PayloadAction<Prediction>) {
      state.predictions[action.payload.matchId] = action.payload;
    },
    removePrediction(state, action: PayloadAction<string>) {
      delete state.predictions[action.payload];
    },
    setAllPredictions(state, action: PayloadAction<Prediction[]>) {
      state.predictions = {};
      action.payload.forEach((p) => { state.predictions[p.matchId] = p; });
    },
    addPoints(state, action: PayloadAction<number>) {
      state.totalPoints += action.payload;
    },
  },
});

export const { setPrediction, removePrediction, setAllPredictions, addPoints } = predictionsSlice.actions;
export default predictionsSlice.reducer;
