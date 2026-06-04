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

interface Team {
  name: string;
  code: string;
}

interface MatchStatsViewProps {
  stats?: Stats | null;
  homeTeam: Team;
  awayTeam: Team;
}

function StatRow({ label, home, away }: { label: string; home: number; away: number }) {
  const { appColors } = useAppTheme();
  const total = home + away || 1;
  const homeW = home / total;
  const awayW = away / total;

  return (
    <View style={styles.row}>
      <Text style={[styles.value, { color: appColors.text }]}>{home}</Text>
      <View style={styles.barContainer}>
        <View style={[styles.homeBar, { flex: homeW, backgroundColor: '#001489' }]} />
        <Text style={[styles.label, { color: appColors.textSecondary }]}>{label}</Text>
        <View style={[styles.awayBar, { flex: awayW, backgroundColor: '#C8102E' }]} />
      </View>
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
  ];

  return (
    <View style={[styles.container, { backgroundColor: appColors.surface, borderRadius: borderRadius.lg }]}>
      <View style={styles.header}>
        <Text style={[styles.teamName, { color: appColors.text }]}>{homeTeam.code}</Text>
        <Text style={[styles.title, { color: appColors.textSecondary }]}>Estadísticas</Text>
        <Text style={[styles.teamName, { color: appColors.text }]}>{awayTeam.code}</Text>
      </View>
      {rows.map((r) => (
        <StatRow key={r.label} {...r} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.base, marginVertical: spacing.sm },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing.base, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  title: { fontSize: typography.fontSize.sm, fontFamily: 'Inter_600SemiBold' },
  teamName: { fontSize: typography.fontSize.md, fontFamily: 'Inter_700Bold' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, gap: spacing.sm },
  value: { width: 28, textAlign: 'center', fontSize: typography.fontSize.sm, fontFamily: 'Inter_700Bold' },
  barContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', height: 6, borderRadius: 3, overflow: 'hidden', gap: 4 },
  homeBar: { height: 6, borderRadius: 3 },
  awayBar: { height: 6, borderRadius: 3 },
  label: { fontSize: 9, textAlign: 'center', width: 70 },
  empty: { padding: spacing.xl, alignItems: 'center' },
});
