import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useAppTheme } from '../../hooks/useAppTheme';
import { buyPro, getProPrice, isBillingAvailable, restorePro, useIsPro } from '../../services/pro';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';

// "Pro – sin anuncios": compra única con Google Play Billing (política de
// pagos de Play: los bienes digitales se cobran dentro de la app con Play).
const BENEFITS: { icon: string; title: string; text: string }[] = [
  { icon: 'cancel',              title: 'Sin banners',        text: 'Fixture, resultados y tablas sin publicidad.' },
  { icon: 'play-circle-outline', title: 'Sin videos',         text: 'Los análisis con IA se abren directo, sin mirar anuncios.' },
  { icon: 'cellphone-check',     title: 'Pago único',         text: 'Se paga una sola vez. Sin suscripción ni renovaciones.' },
  { icon: 'restore',             title: 'Queda en tu cuenta', text: 'Si cambiás de celular, tocá "Restaurar compra".' },
  { icon: 'heart',               title: 'Apoyás la app',      text: 'Ayudás a mantener al día los datos de todas las ligas.' },
];

export function PremiumScreen() {
  const navigation = useNavigation<any>();
  const { appColors } = useAppTheme();
  const isPro = useIsPro();
  const [price, setPrice] = useState<string | null>(null);
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);
  const billing = isBillingAvailable();

  useEffect(() => {
    getProPrice().then(setPrice);
  }, []);

  const handleBuy = async () => {
    setBusy('buy');
    try {
      if (await buyPro()) {
        Alert.alert('¡Gracias!', 'Pro activado: ya no vas a ver anuncios.');
      }
    } catch (e: any) {
      const msg = e?.code === 'pending'
        ? 'El pago quedó pendiente. Pro se activa solo cuando Google lo acredite.'
        : 'No se pudo completar la compra. Revisá tu conexión e intentá de nuevo.';
      Alert.alert('Compra', msg);
    } finally {
      setBusy(null);
    }
  };

  const handleRestore = async () => {
    setBusy('restore');
    try {
      const has = await restorePro();
      Alert.alert(
        has ? 'Compra restaurada' : 'Sin compras',
        has ? 'Pro está activo en este celular.' : 'Esta cuenta de Google no tiene Pro comprado.',
      );
    } catch {
      Alert.alert('Error', 'No se pudo consultar Google Play. Intentá de nuevo.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appColors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: appColors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={24} color={appColors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: appColors.text }]}>Pro</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Hero */}
        <LinearGradient
          colors={['#92400e', '#F59E0B', '#FCD34D']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <MaterialCommunityIcons name="star-circle" size={48} color="white" />
          <Text style={styles.heroTitle}>ShinraFixture Pro</Text>
          <Text style={styles.heroSub}>Todas las ligas, sin anuncios</Text>
          {isPro && (
            <View style={styles.activeBadge}>
              <MaterialCommunityIcons name="check-decagram" size={16} color="#92400e" />
              <Text style={styles.activeBadgeText}>Pro activo</Text>
            </View>
          )}
        </LinearGradient>

        {/* Beneficios */}
        <View style={[styles.card, { backgroundColor: appColors.surface }, shadows.sm]}>
          {BENEFITS.map((b, i) => (
            <View
              key={b.title}
              style={[
                styles.benefitRow,
                i < BENEFITS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: appColors.border },
              ]}
            >
              <MaterialCommunityIcons name={b.icon as any} size={22} color="#F59E0B" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.benefitTitle, { color: appColors.text }]}>{b.title}</Text>
                <Text style={[styles.benefitText, { color: appColors.textSecondary }]}>{b.text}</Text>
              </View>
            </View>
          ))}
        </View>

        {!isPro && (
          <TouchableOpacity
            onPress={handleBuy}
            disabled={busy !== null || !billing}
            activeOpacity={0.9}
            style={{ marginTop: spacing.base }}
            accessibilityRole="button"
          >
            <LinearGradient colors={['#92400e', '#F59E0B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.ctaButton}>
              {busy === 'buy'
                ? <ActivityIndicator color="white" />
                : <>
                    <MaterialCommunityIcons name="google-play" size={22} color="white" />
                    <Text style={styles.ctaText}>{price ? `Quitar anuncios · ${price}` : 'Quitar anuncios'}</Text>
                  </>}
            </LinearGradient>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.checkBtn, { backgroundColor: appColors.surface }]}
          onPress={handleRestore}
          disabled={busy !== null || !billing}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          {busy === 'restore'
            ? <ActivityIndicator size="small" color={colors.primary} />
            : <>
                <MaterialCommunityIcons name="restore" size={20} color={colors.primary} />
                <Text style={[styles.checkBtnText, { color: colors.primary }]}>Restaurar compra</Text>
              </>}
        </TouchableOpacity>

        <Text style={[styles.disclaimer, { color: appColors.textSecondary }]}>
          El pago lo procesa Google Play. Es un pago único: no se renueva ni se vuelve a cobrar.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.base, paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 36 },
  headerTitle: { fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold },
  content: { padding: spacing.base, paddingBottom: spacing.xxxl },

  // Hero
  hero: {
    borderRadius: borderRadius.xl, padding: spacing.xl, alignItems: 'center',
    gap: spacing.sm, marginBottom: spacing.base,
  },
  heroTitle: { color: 'white', fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.black },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: typography.fontSize.sm, textAlign: 'center' },
  activeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'white', borderRadius: borderRadius.full, paddingHorizontal: spacing.md, paddingVertical: 6,
    marginTop: spacing.xs,
  },
  activeBadgeText: { color: '#92400e', fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.sm },

  // Beneficios
  card: { borderRadius: borderRadius.lg, overflow: 'hidden' },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.base },
  benefitTitle: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.bold },
  benefitText: { fontSize: typography.fontSize.sm, marginTop: 2 },

  // CTA
  ctaButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    borderRadius: borderRadius.xl, paddingVertical: spacing.md, minHeight: 52,
  },
  ctaText: { color: 'white', fontFamily: typography.fontFamily.black, fontSize: typography.fontSize.lg },
  checkBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    borderRadius: borderRadius.xl, paddingVertical: spacing.md,
    marginTop: spacing.base, borderWidth: 1.5, borderColor: colors.primary,
    minHeight: 48,
  },
  checkBtnText: { fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.base },
  disclaimer: {
    fontSize: typography.fontSize.xs, textAlign: 'center', marginTop: spacing.base, lineHeight: 18,
  },
});
