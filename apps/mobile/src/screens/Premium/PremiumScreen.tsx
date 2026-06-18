import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector } from 'react-redux';

import { useAppTheme } from '../../hooks/useAppTheme';
import { RootState } from '../../store';
import { apiService } from '../../services/api';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';

interface Feature {
  icon: string;
  label: string;
  free: string | boolean;
  premium: string | boolean;
}

const FEATURES: Feature[] = [
  { icon: 'lightning-bolt',    label: 'Predicciones',       free: 'Ilimitadas',   premium: 'Ilimitadas' },
  { icon: 'account-group',     label: 'Quinielas (crear)',   free: '2',            premium: '10' },
  { icon: 'account-group',     label: 'Quinielas (unirse)',  free: '5',            premium: 'Ilimitadas' },
  { icon: 'account-multiple',  label: 'Amigos',              free: '10',           premium: 'Ilimitados' },
  { icon: 'robot',             label: 'Análisis IA',         free: '2/día',        premium: 'Ilimitados' },
  { icon: 'sword-cross',       label: 'Duelos',              free: 'Próximamente', premium: 'Próximamente' },
  { icon: 'star',              label: 'Badge Premium',       free: false,          premium: true },
  { icon: 'bell-ring',         label: 'Notificaciones push', free: 'Básicas',      premium: 'Completas' },
  { icon: 'chart-bar',         label: 'Estadísticas',        free: 'Básicas',      premium: 'Avanzadas' },
  { icon: 'headset',           label: 'Soporte',             free: 'Comunidad',    premium: 'Prioritario' },
];

export function PremiumScreen() {
  const navigation = useNavigation<any>();
  const { appColors } = useAppTheme();
  const { user } = useSelector((state: RootState) => state.auth);
  const isPremium = user?.isPremium ?? false;
  const [loading, setLoading] = useState<'monthly' | 'annual' | null>(null);

  const handleSubscribe = async (plan: 'monthly' | 'annual') => {
    setLoading(plan);
    try {
      const res = await apiService.post('/payments/subscribe/mp', { plan });
      const checkoutUrl = res.data?.data?.checkoutUrl;
      if (checkoutUrl) {
        await Linking.openURL(checkoutUrl);
      } else {
        Alert.alert('Error', 'No se pudo generar el link de pago.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error ?? e?.message ?? 'Error al procesar el pago.');
    } finally {
      setLoading(null);
    }
  };

  const renderCell = (value: string | boolean, highlight: boolean) => {
    if (value === true) {
      return <MaterialCommunityIcons name="check-circle" size={18} color={highlight ? '#F59E0B' : colors.success} />;
    }
    if (value === false) {
      return <MaterialCommunityIcons name="close-circle-outline" size={18} color={appColors.textSecondary} />;
    }
    return (
      <Text style={[styles.cellText, { color: highlight ? '#F59E0B' : appColors.text }]}>
        {value}
      </Text>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appColors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: appColors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={24} color={appColors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: appColors.text }]}>Premium</Text>
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
          <Text style={styles.heroTitle}>ShinraFixture Premium</Text>
          <Text style={styles.heroSub}>Desbloqueá todo el potencial del Mundial 2026</Text>
          {isPremium && (
            <View style={styles.activeBadge}>
              <MaterialCommunityIcons name="check-decagram" size={16} color="#92400e" />
              <Text style={styles.activeBadgeText}>Premium activo</Text>
            </View>
          )}
        </LinearGradient>

        {/* Pricing */}
        {!isPremium && (
          <>
            <Text style={[styles.sectionTitle, { color: appColors.textSecondary }]}>PLANES</Text>
            <View style={styles.plansRow}>
              {/* Monthly */}
              <TouchableOpacity style={[styles.planCard, { backgroundColor: appColors.surface }, shadows.md]} onPress={() => handleSubscribe('monthly')} activeOpacity={0.85} disabled={!!loading}>
                <Text style={[styles.planName, { color: appColors.text }]}>Mensual</Text>
                <Text style={[styles.planPrice, { color: colors.primary }]}>$4.99</Text>
                <Text style={[styles.planPeriod, { color: appColors.textSecondary }]}>/ mes</Text>
                <View style={[styles.planBtn, { backgroundColor: colors.primary }]}>
                  {loading === 'monthly' ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.planBtnText}>Suscribirse</Text>}
                </View>
              </TouchableOpacity>

              {/* Annual */}
              <TouchableOpacity style={[styles.planCard, styles.planCardFeatured, shadows.lg]} onPress={() => handleSubscribe('annual')} activeOpacity={0.85} disabled={!!loading}>
                <View style={styles.saveBadge}>
                  <Text style={styles.saveBadgeText}>AHORRÁS 33%</Text>
                </View>
                <Text style={[styles.planName, { color: 'white' }]}>Anual</Text>
                <Text style={[styles.planPrice, { color: '#FCD34D' }]}>$39.99</Text>
                <Text style={[styles.planPeriod, { color: 'rgba(255,255,255,0.7)' }]}>/ año</Text>
                <View style={[styles.planBtn, { backgroundColor: '#FCD34D' }]}>
                  {loading === 'annual' ? <ActivityIndicator size="small" color="#92400e" /> : <Text style={[styles.planBtnText, { color: '#92400e' }]}>Mejor valor</Text>}
                </View>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Comparison table */}
        <Text style={[styles.sectionTitle, { color: appColors.textSecondary }]}>COMPARACIÓN</Text>
        <View style={[styles.table, { backgroundColor: appColors.surface }, shadows.sm]}>
          {/* Column headers */}
          <View style={[styles.tableRow, styles.tableHeader, { borderBottomColor: appColors.border }]}>
            <View style={styles.colFeature}>
              <Text style={[styles.colHeaderText, { color: appColors.textSecondary }]}>Función</Text>
            </View>
            <View style={styles.colValue}>
              <Text style={[styles.colHeaderText, { color: appColors.textSecondary }]}>Gratis</Text>
            </View>
            <View style={styles.colValue}>
              <LinearGradient colors={['#F59E0B', '#FCD34D']} style={styles.premiumHeaderBg}>
                <Text style={styles.premiumHeaderText}>⭐ Premium</Text>
              </LinearGradient>
            </View>
          </View>

          {FEATURES.map((f, i) => (
            <View
              key={f.label + i}
              style={[
                styles.tableRow,
                i < FEATURES.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: appColors.border },
              ]}
            >
              <View style={styles.colFeature}>
                <MaterialCommunityIcons name={f.icon as any} size={16} color={appColors.textSecondary} style={{ marginRight: 6 }} />
                <Text style={[styles.featureLabel, { color: appColors.text }]} numberOfLines={1}>{f.label}</Text>
              </View>
              <View style={styles.colValue}>{renderCell(f.free, false)}</View>
              <View style={styles.colValue}>{renderCell(f.premium, true)}</View>
            </View>
          ))}
        </View>

        {/* CTA */}
        {!isPremium && (
          <TouchableOpacity onPress={() => handleSubscribe('annual')} activeOpacity={0.9} style={{ marginTop: spacing.base }}>
            <LinearGradient colors={['#92400e', '#F59E0B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.ctaButton}>
              <MaterialCommunityIcons name="star-circle" size={22} color="white" />
              <Text style={styles.ctaText}>Activar Premium</Text>
              <Ionicons name="arrow-forward" size={18} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* MP branding */}
        <View style={styles.mpBranding}>
          <MaterialCommunityIcons name="shield-check" size={14} color="#00BCFF" />
          <Text style={[styles.disclaimer, { color: appColors.textSecondary, marginTop: 0 }]}>
            Pagos procesados por <Text style={{ color: '#00BCFF', fontFamily: typography.fontFamily.bold }}>MercadoPago</Text>. Podés cancelar en cualquier momento.
          </Text>
        </View>
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

  // Plans
  sectionTitle: {
    fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.semiBold,
    letterSpacing: 0.8, marginBottom: spacing.sm, marginTop: spacing.base,
  },
  plansRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm },
  planCard: {
    flex: 1, borderRadius: borderRadius.xl, padding: spacing.base, alignItems: 'center', gap: spacing.xs,
  },
  planCardFeatured: { backgroundColor: '#92400e' },
  saveBadge: {
    backgroundColor: '#FCD34D', borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 2, marginBottom: spacing.xs,
  },
  saveBadgeText: { color: '#92400e', fontSize: 10, fontFamily: typography.fontFamily.black },
  planName: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.bold },
  planPrice: { fontSize: 28, fontFamily: typography.fontFamily.black },
  planPeriod: { fontSize: typography.fontSize.xs },
  planBtn: {
    width: '100%', paddingVertical: spacing.sm, borderRadius: borderRadius.md,
    alignItems: 'center', marginTop: spacing.xs,
  },
  planBtnText: { color: 'white', fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.sm },

  // Table
  table: { borderRadius: borderRadius.lg, overflow: 'hidden' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  tableHeader: { borderBottomWidth: StyleSheet.hairlineWidth },
  colFeature: { flex: 2, flexDirection: 'row', alignItems: 'center', paddingLeft: spacing.base },
  colValue: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  colHeaderText: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.semiBold, letterSpacing: 0.5 },
  premiumHeaderBg: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.sm },
  premiumHeaderText: { color: '#92400e', fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.black },
  cellText: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.medium, textAlign: 'center' },
  featureLabel: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.medium, flex: 1 },

  // CTA
  ctaButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    borderRadius: borderRadius.xl, paddingVertical: spacing.md,
  },
  ctaText: { color: 'white', fontFamily: typography.fontFamily.black, fontSize: typography.fontSize.lg },
  disclaimer: {
    fontSize: typography.fontSize.xs, textAlign: 'center', marginTop: spacing.base, lineHeight: 18, flex: 1,
  },
  mpBranding: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    justifyContent: 'center', marginTop: spacing.base,
  },
});
