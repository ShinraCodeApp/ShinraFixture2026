import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../store';
import { apiService } from '../services/api';
import { logger } from '../utils/logger';
import { navigationRef } from '../navigation/navigationRef';
import { getNotifPrefs, shouldShowForType } from '../utils/notifPrefs';

export function useNotifications() {
  const dispatch = useDispatch<AppDispatch>();
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  useEffect(() => {
    try {
      Notifications.setNotificationHandler({
        handleNotification: async (notification) => {
          const type = notification.request.content.data?.type as string | undefined;
          const prefs = await getNotifPrefs();
          const show = shouldShowForType(type, prefs);
          return { shouldShowAlert: show, shouldPlaySound: show, shouldSetBadge: true };
        },
      });
    } catch (e) {
      logger.warn('setNotificationHandler failed:', e);
    }

    registerForPushNotificationsAsync().then(async (token) => {
      if (token) {
        try {
          await apiService.post('/notifications/register-device', {
            fcmToken: token,
            deviceType: Platform.OS,
          });
        } catch (err) {
          logger.warn('Failed to register device token:', err);
        }
      }
    });

    // Cold start: app was killed, user tapped the notification
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response?.notification.request.content.data) {
        // Wait for navigator to be ready before navigating
        const tryNavigate = () => {
          if (navigationRef.isReady()) {
            handleNotificationNavigation(response.notification.request.content.data);
          } else {
            setTimeout(tryNavigate, 150);
          }
        };
        setTimeout(tryNavigate, 300);
      }
    }).catch(() => {});

    // Foreground notification received
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      logger.debug('Notification received:', notification.request.content.title);
    });

    // Background / tap: app was in background, user tapped
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      handleNotificationNavigation(data);
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);
}

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    // Main channel for live match events
    await Notifications.setNotificationChannelAsync('shinra-matches', {
      name: 'Partidos en vivo',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00C851',
      sound: 'default',
    });
    // Separate channel for duels (lower priority)
    await Notifications.setNotificationChannelAsync('shinra-duels', {
      name: 'Duelos',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 150, 150],
      lightColor: '#FFD700',
      sound: 'default',
    });
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    });
    return token.data;
  } catch {
    return null;
  }
}

function handleNotificationNavigation(data: any) {
  if (!data || !navigationRef.isReady()) return;

  const type = data.type as string | undefined;

  // Duel notifications → Mis Duelos screen (in ProfileTab)
  if (data.duelId) {
    navigationRef.navigate('ProfileTab' as never, {
      screen: 'Duels',
    } as never);
    return;
  }

  // Match-related notifications → MatchDetail
  if (data.matchId && (
    type === 'MATCH_START' ||
    type === 'GOAL' ||
    type === 'MATCH_END' ||
    type === 'PREDICTION_RESULT' ||
    !type  // fallback for any match notification
  )) {
    navigationRef.navigate('MatchesTab' as never, {
      screen: 'MatchDetail',
      params: { matchId: data.matchId },
    } as never);
    return;
  }

  // Quiniela notifications → QuinielaDetail
  if (data.groupId) {
    navigationRef.navigate('PredictionsTab' as never, {
      screen: 'QuinielaDetail',
      params: { groupId: data.groupId },
    } as never);
    return;
  }

  // Generic SYSTEM notification → Home
  if (type === 'SYSTEM') {
    navigationRef.navigate('HomeTab' as never);
  }
}
