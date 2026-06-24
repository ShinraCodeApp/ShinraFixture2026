import React from 'react';
import {
  Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '../../hooks/useAppTheme';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';

// Opens external browser — no embedded WebView (avoids Play Store streaming policy issues)
const SOURCES = [
  { label: 'Telefe',    url: 'https://www.mitelefe.com/telefe-en-vivo',       icon: 'tv',                  color: '#E31E24' },
  { label: 'TyC Sports',url: 'https://www.tycsports.com/en-vivo.html',        icon: 'sports',              color: '#003087' },
  { label: 'ESPN',      url: 'https://www.espn.com.ar/deportes/',              icon: 'basketball',          color: '#FF6600' },
  { label: 'Canal 13',  url: 'https://www.eltrecetv.com.ar/en-vivo',          icon: 'tv-outline',          color: '#1565C0' },
  { label: 'TV Pública',url: 'https://www.tvpublica.com.ar/',                 icon: 'tv-outline',          color: '#2E7D32' },
  { label: 'Pluto TV',  url: 'https://pluto.tv/latam/live-tv/66997d18a1b69e00082ee85f?lang=es', icon: 'planet', color: '#7B1FA2' },
];

export function LiveStreamTab() {
  const { appColors } = useAppTheme();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: appColors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <LinearGradient
        colors={['#0D47A1', '#1565C0']}
        style={styles.hero}
      >
        <MaterialCommunityIcons name="television-play" size={40} color="white" />
        <Text style={styles.heroTitle}>Ver en vivo</Text>
        <Text style={styles.heroSub}>
          Seleccioná tu canal favorito. Se abre en el navegador de tu teléfono.
        </Text>
      </LinearGradient>

      {/* Disclaimer */}
      <View style={[styles.notice, { backgroundColor: appColors.surface, borderColor: appColors.border }]}>
        <Ionicons name="information-circle-outline" size={16} color={appColors.textSecondary} />
        <Text style={[styles.noticeText, { color: appColors.textSecondary }]}>
          ShinraFixture no transmite contenido. Estos links abren los sitios oficiales de cada canal.
        </Text>
      </View>

      {/* Source cards */}
      <View style={styles.grid}>
        {SOURCES.map((s) => (
          <TouchableOpacity
            key={s.label}
            style={[styles.card, { backgroundColor: appColors.surface }, shadows.sm]}
            onPress={() => Linking.openURL(s.url)}
            activeOpacity={0.8}
          >
            <View style={[styles.iconBg, { backgroundColor: s.color + '18' }]}>
              <Ionicons name={s.icon as any} size={28} color={s.color} />
            </View>
            <Text style={[styles.cardLabel, { color: appColors.text }]}>{s.label}</Text>
            <View style={styles.openRow}>
              <Text style={[styles.openText, { color: appColors.textSecondary }]}>Abrir</Text>
              <Ionicons name="open-outline" size={13} color={appColors.textSecondary} />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.footer, { color: appColors.textSecondary }]}>
        La disponibilidad depende de tu país y proveedor de internet.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.base, paddingBottom: spacing.xxxl, gap: spacing.base },

  hero: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  heroTitle: {
    color: 'white',
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.black,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    lineHeight: 18,
  },

  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  noticeText: {
    flex: 1,
    fontSize: typography.fontSize.xs,
    lineHeight: 16,
    fontFamily: typography.fontFamily.regular,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  card: {
    width: '47%',
    borderRadius: borderRadius.xl,
    padding: spacing.base,
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconBg: {
    width: 56, height: 56,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    textAlign: 'center',
  },
  openRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  openText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
  },

  footer: {
    fontSize: typography.fontSize.xs,
    textAlign: 'center',
    fontFamily: typography.fontFamily.regular,
    lineHeight: 16,
  },
});
