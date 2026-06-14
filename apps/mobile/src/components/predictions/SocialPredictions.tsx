import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import { useAppTheme } from '../../hooks/useAppTheme';
import { colors, spacing, typography, borderRadius } from '../../theme';

interface Props {
  matchId: string;
  homeTeam: any;
  awayTeam: any;
}

export function SocialPredictions({ matchId, homeTeam, awayTeam }: Props) {
  const { appColors } = useAppTheme();

  const { data } = useQuery({
    queryKey: ['prediction-stats', matchId],
    queryFn: async () => (await apiService.get(`/matches/${matchId}/prediction-stats`)).data.data,
    staleTime: 60_000,
  });

  if (!data || data.total === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: appColors.surface }]}>
        <Text style={{ fontSize: 28, marginBottom: 8 }}>🗳️</Text>
        <Text style={[styles.emptyText, { color: appColors.textSecondary }]}>
          Aún no hay predicciones de la comunidad
        </Text>
      </View>
    );
  }

  const bars = [
    { label: homeTeam?.shortName ?? homeTeam?.code ?? 'Local', pct: data.homeWin, color: colors.primary },
    { label: 'Empate', pct: data.draw, color: '#6B7280' },
    { label: awayTeam?.shortName ?? awayTeam?.code ?? 'Visitante', pct: data.awayWin, color: '#EF4444' },
  ];

  return (
    <View style={[styles.card, { backgroundColor: appColors.surface }]}>
      <Text style={[styles.title, { color: appColors.textSecondary }]}>
        PRONÓSTICOS DE LA COMUNIDAD · {data.total} voto{data.total !== 1 ? 's' : ''}
      </Text>

      {/* Win/Draw/Loss bars */}
      <View style={styles.barsWrap}>
        {bars.map((b) => (
          <View key={b.label} style={styles.barItem}>
            <Text style={[styles.barPct, { color: appColors.text }]}>{b.pct}%</Text>
            <View style={[styles.track, { backgroundColor: appColors.surfaceSecondary ?? appColors.border }]}>
              <View style={[styles.fill, { width: `${b.pct}%` as any, backgroundColor: b.color }]} />
            </View>
            <Text style={[styles.barLabel, { color: appColors.textSecondary }]} numberOfLines={1}>{b.label}</Text>
          </View>
        ))}
      </View>

      {/* Top exact scores */}
      {data.topPredictions?.length > 0 && (
        <>
          <Text style={[styles.subTitle, { color: appColors.textSecondary }]}>Marcadores más elegidos</Text>
          <View style={styles.scoreRow}>
            {data.topPredictions.map((p: any, i: number) => (
              <View key={p.score} style={[styles.scorePill, { backgroundColor: i === 0 ? colors.primary + '22' : appColors.surfaceSecondary ?? appColors.border, borderColor: i === 0 ? colors.primary : appColors.border }]}>
                <Text style={[styles.scoreText, { color: i === 0 ? colors.primary : appColors.text }]}>{p.score}</Text>
                <Text style={[styles.scorePct, { color: appColors.textSecondary }]}>{p.pct}%</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.xl, padding: spacing.base,
    marginTop: spacing.base,
  },
  title: {
    fontSize: 10, fontFamily: typography.fontFamily.bold,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.base,
  },
  barsWrap: { gap: spacing.sm },
  barItem: { gap: 4 },
  barPct: { fontSize: 13, fontFamily: typography.fontFamily.bold },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  barLabel: { fontSize: 11, fontFamily: typography.fontFamily.medium },
  subTitle: {
    fontSize: 10, fontFamily: typography.fontFamily.bold,
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginTop: spacing.base, marginBottom: spacing.sm,
  },
  scoreRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  scorePill: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: borderRadius.full, borderWidth: 1,
    alignItems: 'center',
  },
  scoreText: { fontSize: 14, fontFamily: typography.fontFamily.bold },
  scorePct: { fontSize: 10, fontFamily: typography.fontFamily.medium, marginTop: 2 },
  empty: {
    borderRadius: borderRadius.xl, padding: spacing.xl,
    alignItems: 'center', marginTop: spacing.base,
  },
  emptyText: { fontSize: typography.fontSize.sm, textAlign: 'center', fontFamily: typography.fontFamily.medium },
});
