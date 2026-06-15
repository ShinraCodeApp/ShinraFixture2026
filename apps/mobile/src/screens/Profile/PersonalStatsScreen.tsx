import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';

import { useAppTheme } from '../../hooks/useAppTheme';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { apiService } from '../../services/api';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';

interface PredictionItem {
  id: string;
  status: 'WON' | 'LOST' | 'PENDING';
  pointsEarned: number;
  homeScore: number;
  awayScore: number;
  match: {
    homeScore?: number | null;
    awayScore?: number | null;
    homeTeam?: { code: string };
    awayTeam?: { code: string };
    matchDate: string;
  };
}

function calcStreaks(items: PredictionItem[]) {
  const settled = items.filter((p) => p.status !== 'PENDING');
  let current = 0;
  let best = 0;
  let tmp = 0;
  for (let i = settled.length - 1; i >= 0; i--) {
    if (settled[i].status === 'WON') {
      tmp++;
      if (i === settled.length - 1 || settled[i + 1].status === 'WON') current++;
    } else {
      if (tmp > best) best = tmp;
      tmp = 0;
      if (i === settled.length - 1) current = 0;
    }
  }
  if (tmp > best) best = tmp;
  return { current, best };
}

export function PersonalStatsScreen() {
  const navigation = useNavigation<any>();
  const { appColors } = useAppTheme();
  const { user } = useSelector((state: RootState) => state.auth);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['my-predictions-stats'],
    queryFn: async () => {
      const r = await apiService.get('/predictions?limit=200');
      return r.data.data;
    },
  });

  const { data: myRanking } = useQuery({
    queryKey: ['my-ranking'],
    queryFn: async () => {
      const r = await apiService.get('/predictions/my-ranking');
      return r.data.data;
    },
  });

  const { data: duelHistory = [] } = useQuery({
    queryKey: ['duels-history'],
    queryFn: async () => (await apiService.get('/duels/history')).data.data ?? [],
    staleTime: 60_000,
  });

  const { data: bracketPick } = useQuery({
    queryKey: ['bracket-pick-any'],
    queryFn: async () => {
      const r = await apiService.get('/predictions/bracket?tournamentId=wc2026');
      return r.data.data;
    },
    staleTime: 60_000,
  });

  const items: PredictionItem[] = useMemo(() => data?.items ?? [], [data]);

  const stats = useMemo(() => {
    const total = items.length;
    const settled = items.filter((p) => p.status !== 'PENDING');
    const won = items.filter((p) => p.status === 'WON');
    const lost = items.filter((p) => p.status === 'LOST');
    const pending = items.filter((p) => p.status === 'PENDING');
    const accuracy = settled.length > 0 ? Math.round((won.length / settled.length) * 100) : 0;
    const totalPoints = items.reduce((s, p) => s + (p.pointsEarned ?? 0), 0);
    const avgPoints = settled.length > 0 ? (totalPoints / settled.length).toFixed(1) : '0';

    // Points breakdown
    const exactScores = won.filter((p) => p.pointsEarned >= 5).length;
    const winnerGD = won.filter((p) => p.pointsEarned === 4).length;
    const winnerOnly = won.filter((p) => p.pointsEarned === 3).length;

    const { current: currentStreak, best: bestStreak } = calcStreaks(items);

    // Last 20 settled for the dot timeline
    const last20 = settled.slice(-20);

    return { total, settled: settled.length, won: won.length, lost: lost.length, pending: pending.length, accuracy, totalPoints, avgPoints, exactScores, winnerGD, winnerOnly, currentStreak, bestStreak, last20 };
  }, [items]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appColors.background }]} edges={['top']}>
      {/* Header */}
      <LinearGradient colors={['#1565C0', '#0D47A1']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={26} color="white" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: spacing.sm }}>
          <Text style={styles.headerTitle}>Mis Estadísticas</Text>
          <Text style={styles.headerSub}>{user?.displayName ?? 'Usuario'}</Text>
        </View>
        {myRanking?.rank && (
          <View style={styles.rankBadge}>
            <Text style={styles.rankBadgeText}>#{myRanking.rank}</Text>
            <Text style={styles.rankBadgeSub}>ranking</Text>
          </View>
        )}
      </LinearGradient>

      {isLoading ? (
        <View style={{ padding: spacing.screen, gap: spacing.base }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <LoadingSkeleton key={i} style={{ height: 80, borderRadius: borderRadius.lg }} />
          ))}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        >
          {/* ── Summary Cards ──────────────────────── */}
          <View style={styles.summaryGrid}>
            {[
              { label: 'Total', value: stats.total, icon: 'lightning-bolt', color: colors.primary },
              { label: 'Aciertos', value: stats.won, icon: 'check-circle', color: '#4CAF50' },
              { label: 'Precisión', value: `${stats.accuracy}%`, icon: 'target', color: '#FF9800' },
              { label: 'Puntos', value: stats.totalPoints, icon: 'star', color: '#FFD700' },
            ].map((s) => (
              <View key={s.label} style={[styles.summaryCard, { backgroundColor: appColors.surface }, shadows.sm]}>
                <MaterialCommunityIcons name={s.icon as any} size={22} color={s.color} />
                <Text style={[styles.summaryValue, { color: appColors.text }]}>{s.value}</Text>
                <Text style={[styles.summaryLabel, { color: appColors.textSecondary }]}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* ── Rachas ──────────────────────────────── */}
          <View style={[styles.section, { backgroundColor: appColors.surface }, shadows.sm]}>
            <Text style={[styles.sectionTitle, { color: appColors.text }]}>Rachas</Text>
            <View style={styles.streakRow}>
              <View style={styles.streakItem}>
                <MaterialCommunityIcons name="fire" size={28} color="#FF6B35" />
                <Text style={[styles.streakValue, { color: appColors.text }]}>{stats.currentStreak}</Text>
                <Text style={[styles.streakLabel, { color: appColors.textSecondary }]}>Racha actual</Text>
              </View>
              <View style={[styles.streakDivider, { backgroundColor: appColors.border }]} />
              <View style={styles.streakItem}>
                <MaterialCommunityIcons name="trophy" size={28} color="#FFD700" />
                <Text style={[styles.streakValue, { color: appColors.text }]}>{stats.bestStreak}</Text>
                <Text style={[styles.streakLabel, { color: appColors.textSecondary }]}>Mejor racha</Text>
              </View>
              <View style={[styles.streakDivider, { backgroundColor: appColors.border }]} />
              <View style={styles.streakItem}>
                <MaterialCommunityIcons name="chart-line" size={28} color={colors.primary} />
                <Text style={[styles.streakValue, { color: appColors.text }]}>{stats.avgPoints}</Text>
                <Text style={[styles.streakLabel, { color: appColors.textSecondary }]}>Pts promedio</Text>
              </View>
            </View>
          </View>

          {/* ── Desglose por tipo ────────────────────── */}
          <View style={[styles.section, { backgroundColor: appColors.surface }, shadows.sm]}>
            <Text style={[styles.sectionTitle, { color: appColors.text }]}>Desglose de aciertos</Text>
            {[
              { label: 'Marcador exacto', pts: 5, count: stats.exactScores, color: '#4CAF50', icon: 'bullseye-arrow' },
              { label: 'Ganador + diferencia', pts: 4, count: stats.winnerGD, color: '#8BC34A', icon: 'check-decagram' },
              { label: 'Ganador correcto', pts: 3, count: stats.winnerOnly, color: '#CDDC39', icon: 'check' },
              { label: 'Sin puntos', pts: 0, count: stats.lost, color: '#F44336', icon: 'close-circle-outline' },
              { label: 'Sin resolver', pts: null, count: stats.pending, color: appColors.textSecondary, icon: 'clock-outline' },
            ].map((row) => {
              const pct = stats.total > 0 ? row.count / stats.total : 0;
              return (
                <View key={row.label} style={styles.breakdownRow}>
                  <MaterialCommunityIcons name={row.icon as any} size={16} color={row.color} />
                  <View style={{ flex: 1 }}>
                    <View style={styles.breakdownTop}>
                      <Text style={[styles.breakdownLabel, { color: appColors.text }]}>{row.label}</Text>
                      <Text style={[styles.breakdownCount, { color: row.color }]}>
                        {row.count}{row.pts !== null ? ` (+${row.pts} pts)` : ''}
                      </Text>
                    </View>
                    <View style={[styles.barBg, { backgroundColor: appColors.border }]}>
                      <View style={[styles.barFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: row.color }]} />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          {/* ── Historial visual (dots) ──────────────── */}
          {stats.last20.length > 0 && (
            <View style={[styles.section, { backgroundColor: appColors.surface }, shadows.sm]}>
              <Text style={[styles.sectionTitle, { color: appColors.text }]}>
                Últimas {stats.last20.length} predicciones
              </Text>
              <View style={styles.dotsRow}>
                {stats.last20.map((p, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      {
                        backgroundColor: p.status === 'WON' ? '#4CAF50' : p.status === 'LOST' ? '#F44336' : appColors.border,
                      },
                    ]}
                  />
                ))}
              </View>
              <View style={styles.dotsLegend}>
                {[{ color: '#4CAF50', label: 'Acierto' }, { color: '#F44336', label: 'Fallo' }].map((l) => (
                  <View key={l.label} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: l.color }]} />
                    <Text style={[styles.legendLabel, { color: appColors.textSecondary }]}>{l.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── Duelos 1v1 ───────────────────────────── */}
          {(duelHistory as any[]).length > 0 && (() => {
            const resolved = (duelHistory as any[]).filter((d: any) => d.status === 'RESOLVED');
            const wins  = resolved.filter((d: any) => d.winnerId === user?.id).length;
            const losses = resolved.filter((d: any) => d.winnerId !== null && d.winnerId !== user?.id).length;
            const ties   = resolved.filter((d: any) => d.winnerId === null).length;
            return (
              <View style={[styles.section, { backgroundColor: appColors.surface }, shadows.sm]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                  <Text style={[styles.sectionTitle, { color: appColors.text }]}>⚔️ Duelos 1v1</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Duels')}>
                    <Text style={{ color: colors.primary, fontSize: 12 }}>Ver todos →</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  {[
                    { label: 'Victorias', value: wins,   color: '#10B981', icon: 'trophy' },
                    { label: 'Derrotas',  value: losses, color: '#EF4444', icon: 'close-circle' },
                    { label: 'Empates',   value: ties,   color: '#F59E0B', icon: 'handshake' },
                  ].map((s) => (
                    <View key={s.label} style={[styles.summaryCard, { backgroundColor: appColors.background, flex: 1 }]}>
                      <MaterialCommunityIcons name={s.icon as any} size={20} color={s.color} />
                      <Text style={[styles.summaryValue, { color: appColors.text }]}>{s.value}</Text>
                      <Text style={[styles.summaryLabel, { color: appColors.textSecondary }]}>{s.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })()}

          {/* ── Bracket Predictor ─────────────────────── */}
          {bracketPick && (
            <View style={[styles.section, { backgroundColor: appColors.surface }, shadows.sm]}>
              <Text style={[styles.sectionTitle, { color: appColors.text }]}>🏆 Bracket Predictor</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.base, marginTop: spacing.sm }}>
                <MaterialCommunityIcons name="crown" size={32} color="#FFD700" />
                <View>
                  <Text style={[styles.summaryValue, { color: appColors.text }]}>{bracketPick.points ?? 0} pts</Text>
                  <Text style={[styles.summaryLabel, { color: appColors.textSecondary }]}>
                    {bracketPick.isResolved ? 'Bracket resuelto ✓' : 'Bracket en progreso'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* ── CTA al historial completo ─────────────── */}
          <TouchableOpacity
            style={[styles.ctaButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('PredictionsTab', { screen: 'Predictions', params: { tab: 'history' } })}
          >
            <MaterialCommunityIcons name="history" size={18} color="white" />
            <Text style={styles.ctaText}>Ver historial completo</Text>
            <Ionicons name="chevron-forward" size={16} color="white" />
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    padding: spacing.screen, paddingBottom: spacing.xl,
  },
  headerTitle: { color: 'white', fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.bold },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: typography.fontSize.sm },
  rankBadge: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: borderRadius.md, paddingHorizontal: 10, paddingVertical: 4 },
  rankBadgeText: { color: 'white', fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.black },
  rankBadgeSub: { color: 'rgba(255,255,255,0.7)', fontSize: 10 },

  scroll: { padding: spacing.screen, gap: spacing.base, paddingBottom: 100 },

  summaryGrid: { flexDirection: 'row', gap: spacing.sm },
  summaryCard: {
    flex: 1, alignItems: 'center', gap: 4,
    borderRadius: borderRadius.lg, padding: spacing.sm,
  },
  summaryValue: { fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.black },
  summaryLabel: { fontSize: 10, fontFamily: typography.fontFamily.medium },

  section: { borderRadius: borderRadius.xl, padding: spacing.base, gap: spacing.sm },
  sectionTitle: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.bold, marginBottom: spacing.xs },

  streakRow: { flexDirection: 'row', alignItems: 'center' },
  streakItem: { flex: 1, alignItems: 'center', gap: 4 },
  streakDivider: { width: StyleSheet.hairlineWidth, height: 60 },
  streakValue: { fontSize: typography.fontSize.xxl, fontFamily: typography.fontFamily.black },
  streakLabel: { fontSize: 10, fontFamily: typography.fontFamily.medium, textAlign: 'center' },

  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  breakdownTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  breakdownLabel: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.medium },
  breakdownCount: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.bold },
  barBg: { height: 4, borderRadius: 2, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 2, minWidth: 2 },

  dotsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  dotsLegend: { flexDirection: 'row', gap: spacing.base, marginTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 11 },

  ctaButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, borderRadius: borderRadius.lg, padding: spacing.base,
  },
  ctaText: { color: 'white', fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.base, flex: 1 },
});
