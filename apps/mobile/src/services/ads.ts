// Lazy-load AdMob SDK via require() para evitar crash al importar el módulo
type AdmobModule = typeof import('react-native-google-mobile-ads');
let _sdk: AdmobModule | null = null;
try {
  _sdk = require('react-native-google-mobile-ads') as AdmobModule;
} catch {}

export const BannerAdSize = _sdk?.BannerAdSize ?? {
  BANNER: 'BANNER',
  LEADERBOARD: 'LEADERBOARD',
  MEDIUM_RECTANGLE: 'MEDIUM_RECTANGLE',
  FULL_BANNER: 'FULL_BANNER',
  LARGE_BANNER: 'LARGE_BANNER',
};

const IS_TEST = __DEV__;

export const AD_UNIT_IDS = {
  banner: IS_TEST
    ? (_sdk?.TestIds?.BANNER ?? '')
    : 'ca-app-pub-1538025475616883/8967069346',
  interstitial: IS_TEST
    ? (_sdk?.TestIds?.INTERSTITIAL ?? '')
    : 'ca-app-pub-1538025475616883/7733878728',
  rewarded: IS_TEST
    ? (_sdk?.TestIds?.REWARDED ?? '')
    : 'ca-app-pub-1538025475616883/7653987672',
};

export async function initAds(): Promise<void> {
  if (!_sdk) return;
  try { await _sdk.MobileAds().initialize(); } catch {}
}

let interstitial: any | null = null;

export function loadInterstitial(): void {
  if (!_sdk) return;
  try {
    interstitial = _sdk.InterstitialAd.createForAdRequest(AD_UNIT_IDS.interstitial);
    interstitial.load();
  } catch {}
}

export function showInterstitial(): Promise<void> {
  return new Promise((resolve) => {
    if (!_sdk || !interstitial) { resolve(); return; }
    try {
      const unsubClose = interstitial.addAdEventListener(_sdk.AdEventType.CLOSED, () => {
        unsubClose();
        loadInterstitial();
        resolve();
      });
      const unsubError = interstitial.addAdEventListener(_sdk.AdEventType.ERROR, () => {
        unsubError();
        resolve();
      });
      interstitial.show();
    } catch { resolve(); }
  });
}

export function showRewardedAd(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!_sdk) { resolve(false); return; }
    try {
      const rewarded = _sdk.RewardedAd.createForAdRequest(AD_UNIT_IDS.rewarded);
      const unsubReward = rewarded.addAdEventListener(_sdk.RewardedAdEventType.EARNED_REWARD, () => { unsubReward(); resolve(true); });
      const unsubClose = rewarded.addAdEventListener(_sdk.AdEventType.CLOSED, () => { unsubClose(); resolve(false); });
      const unsubError = rewarded.addAdEventListener(_sdk.AdEventType.ERROR, () => { unsubError(); resolve(false); });
      const unsubLoaded = rewarded.addAdEventListener(_sdk.RewardedAdEventType.LOADED, () => { unsubLoaded(); rewarded.show(); });
      rewarded.load();
    } catch { resolve(false); }
  });
}
