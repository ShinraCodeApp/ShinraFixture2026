import AsyncStorage from '@react-native-async-storage/async-storage';

export const NOTIF_PREFS_KEY = '@shinra_notif_prefs_v1';

export interface NotifPrefs {
  partidos: boolean;    // MATCH_START — pre-match + inicio de partido
  goles: boolean;       // GOAL
  resultados: boolean;  // MATCH_END
  predicciones: boolean; // PREDICTION_RESULT
}

export const DEFAULT_PREFS: NotifPrefs = {
  partidos: true,
  goles: true,
  resultados: true,
  predicciones: true,
};

export async function getNotifPrefs(): Promise<NotifPrefs> {
  try {
    const raw = await AsyncStorage.getItem(NOTIF_PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

export async function saveNotifPrefs(prefs: NotifPrefs): Promise<void> {
  await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(prefs));
}

export function shouldShowForType(type: string | undefined, prefs: NotifPrefs): boolean {
  if (!type) return true;
  if (type === 'MATCH_START') return prefs.partidos;
  if (type === 'GOAL') return prefs.goles;
  if (type === 'MATCH_END') return prefs.resultados;
  if (type === 'PREDICTION_RESULT') return prefs.predicciones;
  return true;
}
