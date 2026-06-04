import React, { useEffect, useState, Component } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ApolloProvider } from '@apollo/client';
import FlashMessage from 'react-native-flash-message';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_900Black,
} from '@expo-google-fonts/inter';

import { store, persistor } from './src/store';
import { queryClient } from './src/services/queryClient';
import { apolloClient } from './src/services/apollo';
import { AppNavigator } from './src/navigation/AppNavigator';
import { linking } from './src/navigation/linking';
import { useNotifications } from './src/hooks/useNotifications';
import { useAppTheme } from './src/hooks/useAppTheme';
import { usePlayoffSync } from './src/hooks/usePlayoffSync';
import { ThemeProvider } from './src/theme/ThemeProvider';
import { LoadingScreen } from './src/screens/Loading/LoadingScreen';

SplashScreen.preventAutoHideAsync().catch(() => {});

// ── Error Boundary ───────────────────────────────────────
class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      const err = this.state.error as Error;
      return (
        <ScrollView style={eb.bg} contentContainerStyle={eb.content}>
          <Text style={eb.title}>🔴 Error de inicio</Text>
          <Text style={eb.msg}>{err.message}</Text>
          <Text style={eb.stack}>{err.stack}</Text>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

// ── App Content ──────────────────────────────────────────
function AppContent() {
  const { theme, colorScheme } = useAppTheme();
  useNotifications();
  usePlayoffSync(); // auto-updates play-off teams when results come in

  return (
    <NavigationContainer theme={theme} linking={linking}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <AppNavigator />
      <FlashMessage position="top" floating />
    </NavigationContainer>
  );
}

// ── Root ─────────────────────────────────────────────────
export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_900Black,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      setAppIsReady(true);
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  // Safety: show app after 4s regardless
  useEffect(() => {
    const t = setTimeout(() => {
      setAppIsReady(true);
      SplashScreen.hideAsync().catch(() => {});
    }, 4000);
    return () => clearTimeout(t);
  }, []);

  if (!appIsReady) return null;

  return (
    <ErrorBoundary>
      <Provider store={store}>
        <PersistGate loading={<LoadingScreen />} persistor={persistor}>
          <ApolloProvider client={apolloClient}>
            <QueryClientProvider client={queryClient}>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <SafeAreaProvider>
                  <ThemeProvider>
                    <AppContent />
                  </ThemeProvider>
                </SafeAreaProvider>
              </GestureHandlerRootView>
            </QueryClientProvider>
          </ApolloProvider>
        </PersistGate>
      </Provider>
    </ErrorBoundary>
  );
}

const eb = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#0F172A' },
  content: { padding: 24, paddingTop: 60 },
  title: { color: '#EF4444', fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  msg: { color: '#F87171', fontSize: 14, marginBottom: 12, fontWeight: '600' },
  stack: { color: '#94A3B8', fontSize: 10, lineHeight: 16 },
});
