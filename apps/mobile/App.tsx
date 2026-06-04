import React, { useEffect, useState } from 'react';
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
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_900Black } from '@expo-google-fonts/inter';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

import { store, persistor } from './src/store';
import { queryClient } from './src/services/queryClient';
import { apolloClient } from './src/services/apollo';
import { AppNavigator } from './src/navigation/AppNavigator';
import { linking } from './src/navigation/linking';
import { useNotifications } from './src/hooks/useNotifications';
import { useAppTheme } from './src/hooks/useAppTheme';
import { ThemeProvider } from './src/theme/ThemeProvider';
import { LoadingScreen } from './src/screens/Loading/LoadingScreen';

SplashScreen.preventAutoHideAsync().catch(() => {});

function AppContent() {
  const { theme, colorScheme } = useAppTheme();
  useNotifications();

  return (
    <NavigationContainer theme={theme} linking={linking}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <AppNavigator />
      <FlashMessage position="top" floating />
    </NavigationContainer>
  );
}

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
    // Proceed whether fonts loaded or errored — don't hang forever
    if (fontsLoaded || fontError) {
      setAppIsReady(true);
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  // Safety timeout: if fonts don't resolve in 5s, proceed anyway
  useEffect(() => {
    const timeout = setTimeout(() => {
      setAppIsReady(true);
      SplashScreen.hideAsync().catch(() => {});
    }, 5000);
    return () => clearTimeout(timeout);
  }, []);

  if (!appIsReady) return null;

  return (
    <Provider store={store}>
      <PersistGate loading={<LoadingScreen />} persistor={persistor}>
        <ApolloProvider client={apolloClient}>
          <QueryClientProvider client={queryClient}>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <SafeAreaProvider>
                <BottomSheetModalProvider>
                  <ThemeProvider>
                    <AppContent />
                  </ThemeProvider>
                </BottomSheetModalProvider>
              </SafeAreaProvider>
            </GestureHandlerRootView>
          </QueryClientProvider>
        </ApolloProvider>
      </PersistGate>
    </Provider>
  );
}
