import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../store';
import { apiService } from '../services/api';
import { logger } from '../utils/logger';
import { navigate } from '../navigation/navigationRef';
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

    // Handle foreground notifications
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      logger.debug('Notification received:', notification.request.content.title);
    });

    // Handle notification taps
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
    await Notifications.setNotificationChannelAsync('shinra-matches', {
      name: 'Partidos en vivo',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00C851',
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
  if (!data) return;
  if (data.matchId) {
    navigate('MatchDetail', { matchId: data.matchId });
  } else if (data.type === 'QUINIELA' && data.groupId) {
    navigate('QuinielaDetail', { groupId: data.groupId });
  }
}
