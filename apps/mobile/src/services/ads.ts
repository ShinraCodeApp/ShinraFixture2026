import {
  MobileAds,
  BannerAdSize,
  TestIds,
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
  InterstitialAd,
} from 'react-native-google-mobile-ads';

// Replace with real AdMob IDs from admob.google.com after app approval
const IS_TEST = __DEV__;

export const AD_UNIT_IDS = {
  banner: IS_TEST
    ? TestIds.BANNER
    : 'ca-app-pub-1538025475616883/8967069346',
  interstitial: IS_TEST
    ? TestIds.INTERSTITIAL
    : 'ca-app-pub-1538025475616883/7733878728',
  rewarded: IS_TEST
    ? TestIds.REWARDED
    : 'ca-app-pub-1538025475616883/7653987672',
};

export { BannerAdSize };

export async function initAds() {
  await MobileAds().initialize();
}

// Preloaded interstitial (show between heavy actions)
let interstitial: InterstitialAd | null = null;

export function loadInterstitial() {
  interstitial = InterstitialAd.createForAdRequest(AD_UNIT_IDS.interstitial);
  interstitial.load();
}

export function showInterstitial(): Promise<void> {
  return new Promise((resolve) => {
    if (!interstitial) { resolve(); return; }
    const unsubClose = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      unsubClose();
      loadInterstitial(); // preload next
      resolve();
    });
    const unsubError = interstitial.addAdEventListener(AdEventType.ERROR, () => {
      unsubError();
      resolve();
    });
    try { interstitial.show(); } catch { resolve(); }
  });
}

// Rewarded ad — returns true if user watched the full ad
export function showRewardedAd(): Promise<boolean> {
  return new Promise((resolve) => {
    const rewarded = RewardedAd.createForAdRequest(AD_UNIT_IDS.rewarded);

    const unsubReward = rewarded.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      () => { unsubReward(); resolve(true); },
    );
    const unsubClose = rewarded.addAdEventListener(AdEventType.CLOSED, () => {
      unsubClose();
      resolve(false);
    });
    const unsubError = rewarded.addAdEventListener(AdEventType.ERROR, () => {
      unsubError();
      resolve(false);
    });
    const unsubLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
      unsubLoaded();
      rewarded.show();
    });

    rewarded.load();
  });
}
