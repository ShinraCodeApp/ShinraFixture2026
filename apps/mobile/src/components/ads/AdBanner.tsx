import React, { Component } from 'react';
import { View, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { AD_UNIT_IDS } from '../../services/ads';

class AdErrorBoundary extends Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

interface Props {
  size?: BannerAdSize;
}

export function AdBanner({ size = BannerAdSize.BANNER }: Props) {
  const isPremium = useSelector((s: RootState) => s.auth.user?.isPremium ?? false);

  if (isPremium) return null;

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
