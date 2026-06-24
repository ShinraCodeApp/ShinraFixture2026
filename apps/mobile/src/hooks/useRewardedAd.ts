import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { showRewardedAd } from '../services/ads';

export function useRewardedAd() {
  const [loading, setLoading] = useState(false);
  const isPremium = useSelector((s: RootState) => s.auth.user?.isPremium ?? false);

  const watchAdForReward = useCallback(async (
    onRewarded: () => void | Promise<void>,
    options?: { skipIfPremium?: boolean },
  ) => {
    // Premium users get the reward directly without watching an ad
    if (isPremium || options?.skipIfPremium !== false) {
      await onRewarded();
      return;
    }

    Alert.alert(
      '🎬 Ver anuncio',
      'Mirá un breve video para desbloquear este análisis.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Ver video',
          onPress: async () => {
            setLoading(true);
            try {
              const rewarded = await showRewardedAd();
              if (rewarded) {
                await onRewarded();
              } else {
                Alert.alert('Video incompleto', 'Necesitás ver el video completo para obtener el análisis.');
              }
            } catch {
              Alert.alert('Error', 'No se pudo cargar el anuncio. Intentá de nuevo.');
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  }, [isPremium]);

  return { watchAdForReward, loading };
}
