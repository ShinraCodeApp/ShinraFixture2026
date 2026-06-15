import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector } from 'react-redux';
import { useQueryClient } from '@tanstack/react-query';
import { showMessage } from 'react-native-flash-message';

import { RootState } from '../store';
import { apiService } from '../services/api';
import { navigationRef } from '../navigation/navigationRef';
import { PENDING_INVITE_KEY } from '../screens/Quiniela/QuinielaInviteScreen';
import { track } from '../utils/analytics';

export function usePendingInvite() {
  const { isAuthenticated } = useSelector((s: RootState) => s.auth);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated) return;

    (async () => {
      try {
        const code = await AsyncStorage.getItem(PENDING_INVITE_KEY);
        if (!code) return;
        await AsyncStorage.removeItem(PENDING_INVITE_KEY);

        const r = await apiService.post('/quiniela/join', { inviteCode: code.toUpperCase() });
        const group = r.data.data;
        queryClient.invalidateQueries({ queryKey: ['quinielas'] });
        track('quiniela_joined_pending_invite', { groupId: group.id });
        showMessage({ message: `¡Te uniste a "${group.name}"!`, type: 'success' });

        // Navigate after nav is ready
        const tryNav = () => {
          if (navigationRef.isReady()) {
            navigationRef.navigate('PredictionsTab' as never, {
              screen: 'QuinielaDetail',
              params: { quinielaId: group.id },
            } as never);
          } else {
            setTimeout(tryNav, 150);
          }
        };
        setTimeout(tryNav, 500);
      } catch {
        // Silent — user can join manually
      }
    })();
  }, [isAuthenticated]);
}
