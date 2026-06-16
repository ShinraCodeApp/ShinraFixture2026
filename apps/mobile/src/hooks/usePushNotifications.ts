import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { apiService } from '../services/api';
import { logger } from '../utils/logger';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function usePushNotifications() {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const registered = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || registered.current) return;

    (async () => {
      if (!Device.isDevice) return; // skip emulator

      const { status: existing } = await Notifications.getPermissionsAsync();
      let finalStatus = existing;

      if (existing !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') return;

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('shinra-matches', {
          name: 'Partidos',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#1565C0',
          sound: 'default',
        });
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
      });

      if (!tokenData.data) return;

      await apiService.post('/users/me/register-device', {
        pushToken: tokenData.data,
        deviceType: Platform.OS,
        deviceModel: Device.modelName ?? undefined,
        appVersion: '1.0.0',
      }).catch((e) => logger.warn('register-device failed', e));

      registered.current = true;
    })();
  }, [isAuthenticated]);
}
