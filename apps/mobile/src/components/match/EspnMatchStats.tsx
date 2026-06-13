import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, ScrollView,
} from 'react-native';
import { useAppTheme } from '../../hooks/useAppTheme';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { apiService } from '../../services/api';
import { MatchStatsView } from './MatchStatsView';

interface StatEntry { name: string; label: string; value: string }
interface TeamStat {
  team: { abbreviation: string; displayName: string; logo: string | null };
  isHome: boolean;
  stats: StatEntry[];
}
interface KeyEvent { type: string; time: string; text: string; team: string | null }

const PERCENTAGE_STATS = ['possessionPct', 'passPct', 'shotPct', 'tacklePct', 'crossPct'];

const STAT_LABELS: Record<string, string> = {
  possessionPct: 'Posesión %',
  totalShots: 'Remates',
  shotsOnTarget: 'Al arco',
  wonCorners: 'Córners',
  yellowCards: 'Tarjetas amarillas',
  redCards: 'Tarjetas rojas',
  foulsCommitted: 'Faltas',
  offsides: 'Fuera de juego',
  saves: 'Atajadas',
  totalPasses: 'Pases',
  passPct: 'Precisión pases %',
  effectiveTackles: 'Entradas efectivas',
  interceptions: 'Intercepciones',
};

function StatBar({ homeStat, awayStat, label, isPct }: {
  homeStat: string; awayStat: string; label: string; isPct: boolean;
}) {
  const { appColors } = useAppTheme();
  const hv = parseFloat(homeStat) || 0;
  const av = parseFloat(awayStat) || 0;
  const total = hv + av || 1;

  const homeWidth = isPct ? hv : Math.round((hv / total) * 100);
  const awayWidth = isPct ? av : Math.round((av / total) * 100);

  const displayHome = isPct ? `${Math.round(hv)}%` : homeStat;
  const displayAway = isPct ? `${Math.round(av)}%` : awayStat;

  return (
    <View style={ss.statRow}>
      <Text style={[ss.statVal, { color: appColors.text }]}>{displayHome}</Text>
      <View style={ss.barWrap}>
        <Text style={[ss.statLabel, { color: appColors.textSecondary }]}>{label}</Text>
        <View style={ss.barTrack}>
          {/* Home bar (grows from center leftward) */}
          <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end' }}>
            <View style={[ss.barHome, { width: `${homeWidth}%`, backgroundColor: colors.primary }]} />
          </View>
          <View style={[ss.barDivider, { backgroundColor: appColors.border }]} />
          {/* Away bar (grows from center rightward) */}
          <View style={{ flex: 1 }}>
            <View style={[ss.barAway, { width: `${awayWidth}%`, backgroundColor: appColors.textSecondary }]} />
          </View>
        </View>
      </View>
      <Text style={[ss.statValR, { color: appColors.text }]}>{displayAway}</Text>
    </View>
  );
}

export function EspnMatchStats({ matchId, fallbackStats, homeTeam, awayTeam }: {
  matchId: string;
  fallbackStats?: any;
  homeTeam: any;
  awayTeam: any;
}) {
  const { appColors } = useAppTheme();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ teamStats: TeamStat[]; keyEvents: KeyEvent[] } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    apiService.get(`/matches/${matchId}/espn-stats`)
      .then(r => {
        if (r.data.success && r.data.data) setData(r.data.data);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [matchId]);

  if (loading) {
    return (
      <View style={ss.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[ss.loadingTxt, { color: appColors.textSecondary }]}>Cargando estadísticas ESPN...</Text>
      </View>
    );
  }

  // Fallback to old stats view if ESPN data unavailable
  if (error || !data || !data.teamStats?.length) {
    return (
      <View>
        <View style={[ss.sourceBadge, { backgroundColor: appColors.surfaceSecondary }]}>
          <Text style={[ss.sourceTxt, { color: appColors.textSecondary }]}>Datos básicos · ESPN sin datos en vivo</Text>
        </View>
        {fallbackStats ? (
          <MatchStatsView stats={fallbackStats} homeTeam={homeTeam} awayTeam={awayTeam} />
        ) : (
          <View style={ss.center}>
            <Text style={[ss.noDataTxt, { color: appColors.textSecondary }]}>
              Las estadísticas estarán disponibles durante y después del partido
            </Text>
          </View>
        )}
      </View>
    );
  }

  const home = data.teamStats.find(t => t.isHome) ?? data.teamStats[0];
  const away = data.teamStats.find(t => !t.isHome) ?? data.teamStats[1];

  // Build paired stats
  const homeMap: Record<string, string> = {};
  const awayMap: Record<string, string> = {};
  for (const s of home.stats) homeMap[s.name] = s.value;
  for (const s of away.stats) awayMap[s.name] = s.value;

  const statKeys = home.stats.map(s => s.name);

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Source badge */}
      <View style={[ss.sourceBadge, { backgroundColor: '#003300' }]}>
        <Text style={[ss.sourceTxt, { color: '#00cc44' }]}>ESPN · Estadísticas en tiempo real</Text>
      </View>

      {/* Team headers */}
      <View style={[ss.teamHeader, { borderBottomColor: appColors.border }]}>
        <Text style={[ss.teamName, { color: colors.primary }]}>{home.team.abbreviation}</Text>
        <Text style={[ss.vsLabel, { color: appColors.textSecondary }]}>Estadísticas</Text>
        <Text style={[ss.teamName, { color: appColors.textSecondary }]}>{away.team.abbreviation}</Text>
      </View>

      {/* Stats rows */}
      <View style={ss.statsSection}>
        {statKeys.map(key => {
          const hv = homeMap[key];
          const av = awayMap[key];
          if (hv === undefined && av === undefined) return null;
          const label = STAT_LABELS[key] ?? key;
          const isPct = PERCENTAGE_STATS.includes(key);
          return (
            <StatBar
              key={key}
              homeStat={hv ?? '0'}
              awayStat={av ?? '0'}
              label={label}
              isPct={isPct}
            />
          );
        })}
      </View>

      {/* Key events */}
      {data.keyEvents.length > 0 && (
        <View style={[ss.section, { borderTopColor: appColors.border }]}>
          <Text style={[ss.sectionTitle, { color: appColors.text }]}>Eventos del partido</Text>
          {data.keyEvents.map((ev, i) => (
            <View key={i} style={ss.eventRow}>
              <Text style={[ss.eventTime, { color: colors.primary }]}>{ev.time}'</Text>
              <View style={[ss.eventDot, { backgroundColor: appColors.border }]} />
              <Text style={[ss.eventText, { color: appColors.text }]} numberOfLines={2}>{ev.text}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const ss = StyleSheet.create({
  center: { padding: spacing.xl, alignItems: 'center', gap: spacing.sm },
  loadingTxt: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.regular },
  noDataTxt: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.regular, textAlign: 'center' },
  sourceBadge: {
    margin: spacing.base, padding: 6,
    borderRadius: borderRadius.sm, alignItems: 'center',
  },
  sourceTxt: { fontSize: 11, fontFamily: typography.fontFamily.semiBold },
  teamHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.base, paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  teamName: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.bold, width: 50, textAlign: 'center' },
  vsLabel: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.regular },
  statsSection: { paddingHorizontal: spacing.base, paddingVertical: spacing.sm, gap: spacing.sm },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statVal: { width: 40, fontSize: 12, fontFamily: typography.fontFamily.semiBold, textAlign: 'center' },
  statValR: { width: 40, fontSize: 12, fontFamily: typography.fontFamily.semiBold, textAlign: 'center' },
  barWrap: { flex: 1, gap: 2 },
  statLabel: { fontSize: 10, fontFamily: typography.fontFamily.regular, textAlign: 'center' },
  barTrack: { flexDirection: 'row', alignItems: 'center', height: 6 },
  barHome: { height: 6, borderRadius: 3 },
  barAway: { height: 6, borderRadius: 3 },
  barDivider: { width: 2, height: 10, marginHorizontal: 1 },
  section: { borderTopWidth: StyleSheet.hairlineWidth, padding: spacing.base, gap: spacing.sm },
  sectionTitle: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.bold, marginBottom: 4 },
  eventRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  eventTime: { width: 28, fontSize: 12, fontFamily: typography.fontFamily.bold },
  eventDot: { width: 6, height: 6, borderRadius: 3, marginTop: 5 },
  eventText: { flex: 1, fontSize: 12, fontFamily: typography.fontFamily.regular },
});
