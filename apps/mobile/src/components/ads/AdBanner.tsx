import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { AD_UNIT_IDS } from '../../services/ads';

interface Props {
  size?: BannerAdSize;
}

export function AdBanner({ size = BannerAdSize.BANNER }: Props) {
  const isPremium = useSelector((s: RootState) => s.auth.user?.isPremium ?? false);

  if (isPremium) return null;

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={AD_UNIT_IDS.banner}
        size={size}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', width: '100%' },
});
