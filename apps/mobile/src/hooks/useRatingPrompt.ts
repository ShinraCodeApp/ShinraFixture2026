import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Linking, Platform } from 'react-native';
import { track } from '../utils/analytics';

const SESSIONS_KEY = '@shinra_session_count';
const RATED_KEY    = '@shinra_rated';
const SESSIONS_THRESHOLD = 5; // Show after 5 sessions

// iOS URL: update with real App Store ID once the app is published on iOS
const STORE_URL = Platform.select({
  android: 'market://details?id=com.shinra.fixture2026',
  ios: 'https://apps.apple.com/app/shinrafixture-2026',
  default: 'https://play.google.com/store/apps/details?id=com.shinra.fixture2026',
});

async function incrementSession(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(SESSIONS_KEY);
    const count = raw ? parseInt(raw, 10) + 1 : 1;
    await AsyncStorage.setItem(SESSIONS_KEY, String(count));
    return count;
  } catch {
    return 0;
  }
}

async function hasRated(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(RATED_KEY)) === 'true';
  } catch {
    return false;
  }
}

async function markRated() {
  try {
    await AsyncStorage.setItem(RATED_KEY, 'true');
  } catch {}
}

function showRatingDialog() {
  track('rating_shown');
  Alert.alert(
    '⭐ ¿Te está gustando ShinraFixture?',
    'Tu opinión nos ayuda a seguir mejorando la app para el Mundial 2026.',
    [
      {
        text: 'Calificar ahora',
        onPress: async () => {
          track('rating_tapped', { action: 'rate' });
          await markRated();
          Linking.openURL(STORE_URL!).catch(() => {});
        },
      },
      {
        text: 'Más tarde',
        style: 'cancel',
        onPress: () => track('rating_tapped', { action: 'later' }),
      },
      {
        text: 'No, gracias',
        style: 'destructive',
        onPress: async () => {
          track('rating_tapped', { action: 'dismiss' });
          await markRated(); // Don't show again
        },
      },
    ],
  );
}

export function useRatingPrompt() {
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;

    (async () => {
      if (await hasRated()) return;
      const sessions = await incrementSession();
      if (sessions >= SESSIONS_THRESHOLD) {
        // Delay 2s so the user sees the home screen first
        setTimeout(showRatingDialog, 2000);
      }
    })();
  }, []);
}
