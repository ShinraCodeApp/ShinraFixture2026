import { useSyncExternalStore } from 'react';
import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

/**
 * "Pro – sin anuncios": compra única en Google Play (producto INAPP).
 * El estado queda guardado en el celular y se vuelve a confirmar con Play al
 * abrir la app; también sirve para restaurar la compra en otro celular.
 */
export const PRO_PRODUCT_ID = 'pro_sin_anuncios';
const STORAGE_KEY = 'shinra.pro.owned';

const Billing: {
  getPrice(id: string): Promise<string | null>;
  purchase(id: string): Promise<boolean>;
  isOwned(id: string): Promise<boolean>;
} | undefined = Platform.OS === 'android' ? NativeModules.ProBilling : undefined;

let owned = false;
const listeners = new Set<() => void>();

function setOwned(value: boolean) {
  if (owned === value) return;
  owned = value;
  AsyncStorage.setItem(STORAGE_KEY, value ? '1' : '0').catch(() => {});
  listeners.forEach((l) => l());
}

/** Al abrir la app: estado guardado y después confirmación con Google Play. */
export async function initPro(): Promise<void> {
  try {
    if ((await AsyncStorage.getItem(STORAGE_KEY)) === '1') setOwned(true);
  } catch {}
  await restorePro().catch(() => {});
}

export function isBillingAvailable(): boolean {
  return !!Billing;
}

export async function getProPrice(): Promise<string | null> {
  if (!Billing) return null;
  try {
    return await Billing.getPrice(PRO_PRODUCT_ID);
  } catch {
    return null;
  }
}

/** Abre el pago de Google. true = comprado, false = el usuario canceló. */
export async function buyPro(): Promise<boolean> {
  if (!Billing) throw new Error('Las compras solo están disponibles en Android con Google Play.');
  const ok = await Billing.purchase(PRO_PRODUCT_ID);
  if (ok) setOwned(true);
  return ok;
}

/** Consulta a Google Play si esta cuenta ya compró Pro. */
export async function restorePro(): Promise<boolean> {
  if (!Billing) return owned;
  const has = await Billing.isOwned(PRO_PRODUCT_ID);
  setOwned(has); // también lo quita si Google reembolsó la compra
  return has;
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Pro comprado en Play o Premium de cuenta: sin anuncios. */
export function useIsPro(): boolean {
  const purchased = useSyncExternalStore(subscribe, () => owned);
  const premium = useSelector((s: RootState) => s.auth.user?.isPremium ?? false);
  return purchased || premium;
}
