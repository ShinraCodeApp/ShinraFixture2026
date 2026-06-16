import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useAppTheme } from '../../hooks/useAppTheme';
import { colors, spacing, typography, borderRadius } from '../../theme';

interface WCWinner {
  country: string;
  code: string;
  flag: string;
  titles: number;
  years: number[];
}

const WC_WINNERS: WCWinner[] = [
  { country: 'Brasil',    code: 'BRA', flag: '🇧🇷', titles: 5, years: [1958, 1962, 1970, 1994, 2002] },
  { country: 'Alemania',  code: 'GER', flag: '🇩🇪', titles: 4, years: [1954, 1974, 1990, 2014] },
  { country: 'Italia',    code: 'ITA', flag: '🇮🇹', titles: 4, years: [1934, 1938, 1982, 2006] },
  { country: 'Argentina', code: 'ARG', flag: '🇦🇷', titles: 3, years: [1978, 1986, 2022] },
  { country: 'Francia',   code: 'FRA', flag: '🇫🇷', titles: 2, years: [1998, 2018] },
  { country: 'Uruguay',   code: 'URU', flag: '🇺🇾', titles: 2, years: [1930, 1950] },
  { country: 'Inglaterra',code: 'ENG', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', titles: 1, years: [1966] },
  { country: 'España',    code: 'ESP', flag: '🇪🇸', titles: 1, years: [2010] },
];

const RANK_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];
const RANK_LABELS = ['1°', '2°', '2°', '4°', '5°', '5°', '7°', '7°'];

function TrophyStars({ count, color }: { count: number; color: string }) {
  return (
    <View style={styles.starsRow}>
      {Array.from({ length: count }).map((_, i) => (
        <Text key={i} style={[styles.trophy, { color }]}>★</Text>
      ))}
    </View>
  );
}

export function WorldCupWinnersScreen() {
  const navigation = useNavigation<any>();
  const { appColors } = useAppTheme();

  const totalCups = WC_WINNERS.reduce((s, w) => s + w.titles, 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appColors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: appColors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={26} color={appColors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: appColors.text }]}>Ganadores del Mundial</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Hero */}
        <LinearGradient colors={['#1a1a00', '#0f0f14']} style={styles.hero}>
          <Text style={styles.heroTrophy}>🏆</Text>
          <Text style={styles.heroTitle}>Copa del Mundo FIFA</Text>
          <Text style={[styles.heroSub, { color: appColors.textSecondary }]}>
            {totalCups} ediciones · {WC_WINNERS.length} campeones distintos
          </Text>
        </LinearGradient>

        {/* Podium top 3 */}
        <View style={styles.podium}>
          {/* 2nd — Germany */}
          <View style={[styles.podiumItem, styles.podiumSecond]}>
            <Text style={styles.podiumFlag}>{WC_WINNERS[1].flag}</Text>
            <Text style={[styles.podiumCountry, { color: appColors.text }]}>{WC_WINNERS[1].country}</Text>
            <View style={[styles.podiumBlock, { backgroundColor: '#C0C0C0', height: 60 }]}>
              <Text style={styles.podiumNumber}>2°</Text>
              <Text style={styles.podiumCups}>{WC_WINNERS[1].titles} 🏆</Text>
            </View>
          </View>
          {/* 1st — Brazil */}
          <View style={[styles.podiumItem, styles.podiumFirst]}>
            <Text style={[styles.crownEmoji]}>👑</Text>
            <Text style={styles.podiumFlag}>{WC_WINNERS[0].flag}</Text>
            <Text style={[styles.podiumCountry, { color: appColors.text }]}>{WC_WINNERS[0].country}</Text>
            <View style={[styles.podiumBlock, { backgroundColor: '#FFD700', height: 90 }]}>
              <Text style={styles.podiumNumber}>1°</Text>
              <Text style={styles.podiumCups}>{WC_WINNERS[0].titles} 🏆</Text>
            </View>
          </View>
          {/* 3rd — Italy */}
          <View style={[styles.podiumItem, styles.podiumThird]}>
            <Text style={styles.podiumFlag}>{WC_WINNERS[2].flag}</Text>
            <Text style={[styles.podiumCountry, { color: appColors.text }]}>{WC_WINNERS[2].country}</Text>
            <View style={[styles.podiumBlock, { backgroundColor: '#CD7F32', height: 45 }]}>
              <Text style={styles.podiumNumber}>3°</Text>
              <Text style={styles.podiumCups}>{WC_WINNERS[2].titles} 🏆</Text>
            </View>
          </View>
        </View>

        {/* Full list */}
        <Text style={[styles.sectionTitle, { color: appColors.textSecondary }]}>TABLA COMPLETA</Text>
        {WC_WINNERS.map((w, i) => {
          const rankColor = RANK_COLORS[i] ?? appColors.textSecondary;
          return (
            <View key={w.code} style={[styles.row, { backgroundColor: appColors.surface }]}>
              <Text style={[styles.rank, { color: rankColor }]}>{RANK_LABELS[i]}</Text>
              <Text style={styles.flag}>{w.flag}</Text>
              <View style={styles.rowInfo}>
                <Text style={[styles.countryName, { color: appColors.text }]}>{w.country}</Text>
                <Text style={[styles.years, { color: appColors.textSecondary }]}>
                  {w.years.join(' · ')}
                </Text>
              </View>
              <View style={styles.starsColumn}>
                <TrophyStars count={w.titles} color={rankColor} />
                <Text style={[styles.titlesCount, { color: rankColor }]}>
                  {w.titles} {w.titles === 1 ? 'título' : 'títulos'}
                </Text>
              </View>
            </View>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.screen, paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: typography.fontSize.md, fontFamily: typography.fontFamily.bold },

  content: { paddingBottom: 40 },

  hero: {
    alignItems: 'center', paddingVertical: 28, paddingHorizontal: spacing.screen, gap: 4,
  },
  heroTrophy: { fontSize: 52 },
  heroTitle: { fontSize: 20, fontFamily: typography.fontFamily.bold, color: '#FFD700', marginTop: 4 },
  heroSub: { fontSize: 13, marginTop: 2 },

  // Podium
  podium: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center',
    paddingHorizontal: spacing.screen, paddingVertical: 24, gap: 8,
  },
  podiumItem: { alignItems: 'center', flex: 1, gap: 4 },
  podiumFirst: { marginBottom: 0 },
  podiumSecond: { marginBottom: 0 },
  podiumThird: { marginBottom: 0 },
  crownEmoji: { fontSize: 20 },
  podiumFlag: { fontSize: 28 },
  podiumCountry: { fontSize: 11, fontFamily: typography.fontFamily.semiBold, textAlign: 'center' },
  podiumBlock: {
    width: '100%', borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', gap: 2, paddingVertical: 6,
  },
  podiumNumber: { fontSize: 13, fontFamily: typography.fontFamily.bold, color: '#1a1a00' },
  podiumCups: { fontSize: 13, color: '#1a1a00' },

  // Section
  sectionTitle: {
    fontSize: 11, fontFamily: typography.fontFamily.bold, letterSpacing: 1,
    paddingHorizontal: spacing.screen, paddingVertical: spacing.sm,
  },

  // Row
  row: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: spacing.screen, marginBottom: spacing.xs,
    padding: spacing.md, borderRadius: borderRadius.lg, gap: spacing.sm,
  },
  rank: { width: 28, fontSize: 13, fontFamily: typography.fontFamily.bold, textAlign: 'center' },
  flag: { fontSize: 26 },
  rowInfo: { flex: 1, gap: 2 },
  countryName: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.semiBold },
  years: { fontSize: 11 },
  starsColumn: { alignItems: 'flex-end', gap: 2 },
  starsRow: { flexDirection: 'row', gap: 2 },
  trophy: { fontSize: 16 },
  titlesCount: { fontSize: 11, fontFamily: typography.fontFamily.bold },
});
