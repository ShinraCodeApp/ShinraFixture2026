import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../../hooks/useAppTheme';
import { spacing, typography, borderRadius } from '../../theme';

interface Stats {
  homePossession?: number | null;
  awayPossession?: number | null;
  homeShots?: number | null;
  awayShots?: number | null;
  homeShotsOnTarget?: number | null;
  awayShotsOnTarget?: number | null;
  homeCorners?: number | null;
  awayCorners?: number | null;
  homeFouls?: number | null;
  awayFouls?: number | null;
  homeYellowCards?: number | null;
  awayYellowCards?: number | null;
  homeXG?: number | null;
  awayXG?: number | null;
}

interface Team { name: string; code: string }
interface MatchStatsViewProps { stats?: Stats | null; homeTeam: Team; awayTeam: Team }

function StatRow({ label, home, away }: { label: string; home: number; away: number }) {
  const { appColors } = useAppTheme();
  const total = (home + away) || 1;
  const homeP = Math.round((home / total) * 100);

  return (
    <View style={styles.row}>
      {/* Home value */}
      <Text style={[styles.value, { color: appColors.text }]}>{home}</Text>

      {/* Bar + label stacked */}
      <View style={styles.middle}>
        <Text style={[styles.label, { color: appColors.textSecondary }]}>{label}</Text>
        <View style={styles.track}>
          <View style={[styles.homeBar, { width: `${homeP}%` }]} />
          <View style={[styles.awayBar, { width: `${100 - homeP}%` }]} />
        </View>
      </View>

      {/* Away value */}
      <Text style={[styles.value, { color: appColors.text }]}>{away}</Text>
    </View>
  );
}

export function MatchStatsView({ stats, homeTeam, awayTeam }: MatchStatsViewProps) {
  const { appColors } = useAppTheme();

  if (!stats) {
    return (
      <View style={styles.empty}>
        <Text style={{ color: appColors.textSecondary, fontSize: typography.fontSize.sm }}>
          Estadísticas no disponibles
        </Text>
      </View>
    );
  }

  const rows = [
    { label: 'Posesión %', home: stats.homePossession ?? 50, away: stats.awayPossession ?? 50 },
    { label: 'Tiros', home: stats.homeShots ?? 0, away: stats.awayShots ?? 0 },
    { label: 'Al arco', home: stats.homeShotsOnTarget ?? 0, away: stats.awayShotsOnTarget ?? 0 },
    { label: 'Córners', home: stats.homeCorners ?? 0, away: stats.awayCorners ?? 0 },
    { label: 'Faltas', home: stats.homeFouls ?? 0, away: stats.awayFouls ?? 0 },
    { label: 'Amarillas', home: stats.homeYellowCards ?? 0, away: stats.awayYellowCards ?? 0 },
    ...(stats.homeXG != null ? [{ label: 'xG', home: stats.homeXG ?? 0, away: stats.awayXG ?? 0 }] : []),
  ];

  return (
    <View style={[styles.container, { backgroundColor: appColors.surface, borderRadius: borderRadius.lg }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.teamCode, { color: '#001489' }]}>{homeTeam.code}</Text>
        <Text style={[styles.title, { color: appColors.textSecondary }]}>Estadísticas</Text>
        <Text style={[styles.teamCode, { color: '#C8102E' }]}>{awayTeam.code}</Text>
      </View>

      {rows.map((r) => <StatRow key={r.label} {...r} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.base, marginVertical: spacing.sm },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing.md, paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  title: { fontSize: typography.fontSize.sm, fontFamily: 'Inter_600SemiBold' },
  teamCode: { fontSize: typography.fontSize.md, fontFamily: 'Inter_700Bold', minWidth: 36 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: spacing.sm, gap: spacing.sm,
  },
  value: {
    width: 32, textAlign: 'center',
    fontSize: typography.fontSize.sm, fontFamily: 'Inter_700Bold',
  },
  middle: { flex: 1, gap: 3 },
  label: {
    fontSize: 10, textAlign: 'center',
    fontFamily: 'Inter_500Medium',
  },
  track: {
    height: 8, borderRadius: 4, overflow: 'hidden',
    flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.06)',
  },
  homeBar: { height: 8, backgroundColor: '#001489', borderRadius: 4 },
  awayBar: { height: 8, backgroundColor: '#C8102E', borderRadius: 4 },
  empty: { padding: spacing.xl, alignItems: 'center' },
});
