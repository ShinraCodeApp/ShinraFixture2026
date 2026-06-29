import React, { Component } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { AD_UNIT_IDS, BannerAdSize } from '../../services/ads';

// Lazy-load BannerAd para evitar crash al importar react-native-google-mobile-ads
let BannerAd: any = null;
try {
  BannerAd = require('react-native-google-mobile-ads').BannerAd;
} catch {}

class AdErrorBoundary extends Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

interface Props {
  size?: string;
}

export function AdBanner({ size = BannerAdSize.BANNER }: Props) {
  const isPremium = useSelector((s: RootState) => s.auth.user?.isPremium ?? false);

  if (isPremium || !BannerAd) return null;

  return (
    <AdErrorBoundary>
      <View style={styles.container}>
        <BannerAd
          unitId={AD_UNIT_IDS.banner}
          size={size}
          requestOptions={{ requestNonPersonalizedAdsOnly: false }}
        />
      </View>
    </AdErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', width: '100%' },
});
