import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { SplashScreen } from '../screens/Loading/SplashScreen';
import { OnboardingScreen } from '../screens/Onboarding/OnboardingScreen';

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Auth: undefined;
  Main: undefined;
  MatchDetail: { matchId: string };
  TeamDetail: { teamId: string };
  PlayerDetail: { playerId: string };
  NewsDetail: { newsId: string; slug: string };
  UserProfile: { userId: string };
  QuinielaDetail: { groupId: string };
  SimulatorResult: { sessionId: string };
  Settings: undefined;
  Premium: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const { isAuthenticated, hasSeenOnboarding, isLoading, guestMode } = useSelector(
    (state: RootState) => state.auth
  );
  // Safety: never stay on splash longer than 3 seconds
  const [safetyExpired, setSafetyExpired] = useState(false);
  useEffect(() => {
    if (!isLoading) return;
    const t = setTimeout(() => setSafetyExpired(true), 3000);
    return () => clearTimeout(t);
  }, [isLoading]);

  if (isLoading && !safetyExpired) return <SplashScreen />;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {!hasSeenOnboarding ? (
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      ) : !isAuthenticated && !guestMode ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : (
        <Stack.Screen name="Main" component={MainNavigator} />
      )}
    </Stack.Navigator>
  );
}
