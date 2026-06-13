import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import { useAppTheme } from '../../hooks/useAppTheme';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { TeamLogo } from '../../components/common/TeamLogo';

type Tab = 'wc-standings' | 'wc-scorers' | 'liga';

export function StatsScreen() {
  const { appColors } = useAppTheme();
  const [tab, setTab] = useState<Tab>('wc-standings');

  const { data: wcStandings, isLoading: loadStandings } = useQuery({
    queryKey: ['wc-standings'],
    queryFn: async () => (await apiService.get('/stats/wc-standings')).data.data,
    enabled: tab === 'wc-standings',
    staleTime: 5 * 60_000,
  });

  const { data: wcScorers, isLoading: loadScorers } = useQuery({
    queryKey: ['wc-scorers'],
    queryFn: async () => (await apiService.get('/stats/wc-scorers')).data.data,
    enabled: tab === 'wc-scorers',
    staleTime: 5 * 60_000,
  });

  const { data: ligaData, isLoading: loadLiga } = useQuery({
    queryKey: ['liga-argentina'],
    queryFn: async () => (await apiService.get('/stats/liga-argentina')).data.data,
    enabled: tab === 'liga',
    staleTime: 5 * 60_000,
  });

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: 'wc-standings', label: 'Grupos WC' },
    { key: 'wc-scorers', label: 'Goleadores' },
    { key: 'liga', label: 'Liga Arg.' },
  ];

  const isLoading = tab === 'wc-standings' ? loadStandings : tab === 'wc-scorers' ? loadScorers : loadLiga;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appColors.background }]} edges={['top']}>
      <Text style={[styles.title, { color: appColors.text }]}>Estadísticas</Text>

      <View style={[styles.tabs, { borderBottomColor: appColors.border }]}>
        {tabs.map((t) => (
          <TouchableOpacity key={t.key} style={[styles.tab, tab === t.key && styles.tabActive]} onPress={() => setTab(t.key)}>
            <Text style={[styles.tabLabel, { color: tab === t.key ? colors.primary : appColors.textSecondary }]}>{t.label}</Text>
            {tab === t.key && <View style={styles.tabBar} />}
          </TouchableOpacity>
        ))}
      </View>

      {isLoading && (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.loadingText, { color: appColors.textSecondary }]}>Cargando datos...</Text>
        </View>
      )}

      {/* WC Group Standings */}
      {tab === 'wc-standings' && !isLoading && wcStandings && (
        <ScrollView contentContainerStyle={styles.list}>
          <WCStandingsView data={wcStandings} appColors={appColors} />
        </ScrollView>
      )}

      {/* WC Top Scorers */}
      {tab === 'wc-scorers' && !isLoading && wcScorers && (
        <ScrollView contentContainerStyle={styles.list}>
          <WCScorersView data={wcScorers} appColors={appColors} />
        </ScrollView>
      )}

      {/* Liga Argentina */}
      {tab === 'liga' && !isLoading && ligaData && (
        <ScrollView contentContainerStyle={styles.list}>
          <LigaView data={ligaData} appColors={appColors} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── WC Standings component ──────────────────────────────────────────────────
function WCStandingsView({ data, appColors }: { data: any; appColors: any }) {
  // Support both DB format (array of {group, entries}) and ESPN format
  let groups: any[] = [];

  if (Array.isArray(data)) {
    // DB format: [{group:'A', entries:[{team, pj, pg, pe, pp, gf, gc, pts, dif},...]}]
    groups = data;
    return (
      <>
        {groups.map((g: any, gi: number) => (
          <View key={gi} style={{ marginBottom: spacing.base }}>
            <Text style={[styles.groupHeader, { color: appColors.text, backgroundColor: `${colors.primary}20` }]}>GRUPO {g.group}</Text>
            <View style={[styles.tableHeader, { backgroundColor: appColors.surface }]}>
              <Text style={[styles.thTeam, { color: appColors.textSecondary }]}>Equipo</Text>
              {['PJ','PG','PE','PP','GF','GC','Pts'].map(h => (
                <Text key={h} style={[styles.thNum, { color: appColors.textSecondary }]}>{h}</Text>
              ))}
            </View>
            {(g.entries ?? []).map((entry: any, ei: number) => {
              const team = entry.team ?? {};
              const logo = team.logo;
              return (
                <View key={ei} style={[styles.tableRow, { backgroundColor: ei % 2 === 0 ? appColors.surface : appColors.background }]}>
                  <View style={styles.teamCell}>
                    {logo ? <Image source={{ uri: logo }} style={styles.teamLogo} /> : null}
                    <Text style={[styles.teamName, { color: appColors.text }]} numberOfLines={1}>{team.shortName ?? team.name}</Text>
                  </View>
                  {[entry.pj, entry.pg, entry.pe, entry.pp, entry.gf, entry.gc, entry.pts].map((v: any, vi: number) => (
                    <Text key={vi} style={[styles.tdNum, vi === 6 && styles.tdPts, { color: vi === 6 ? colors.primary : appColors.text }]}>{v ?? 0}</Text>
                  ))}
                </View>
              );
            })}
          </View>
        ))}
      </>
    );
  }

  // ESPN format
  groups = data?.standings ?? data?.children ?? [];
  if (!groups.length) return <EmptyState label="Sin datos de grupos" appColors={appColors} />;
  return (
    <>
      {groups.map((group: any, gi: number) => {
        const groupName: string = group.name ?? group.shortName ?? `Grupo ${gi + 1}`;
        const entries: any[] = group.standings?.entries ?? group.entries ?? [];
        return (
          <View key={gi} style={{ marginBottom: spacing.base }}>
            <Text style={[styles.groupHeader, { color: appColors.text, backgroundColor: `${colors.primary}20` }]}>{groupName}</Text>
            <View style={[styles.tableHeader, { backgroundColor: appColors.surface }]}>
              <Text style={[styles.thTeam, { color: appColors.textSecondary }]}>Equipo</Text>
              {['PJ','PG','PE','PP','GF','GC','Pts'].map(h => (
                <Text key={h} style={[styles.thNum, { color: appColors.textSecondary }]}>{h}</Text>
              ))}
            </View>
            {entries.map((entry: any, ei: number) => {
              const team = entry.team ?? {};
              const stats = entry.stats ?? [];
              const getStat = (n: string) => stats.find((s: any) => s.name === n || s.abbreviation === n)?.value ?? '-';
              const logo = team.logos?.[0]?.href ?? team.logo;
              return (
                <View key={ei} style={[styles.tableRow, { backgroundColor: ei % 2 === 0 ? appColors.surface : appColors.background }]}>
                  <View style={styles.teamCell}>
                    {logo ? <Image source={{ uri: logo }} style={styles.teamLogo} /> : null}
                    <Text style={[styles.teamName, { color: appColors.text }]} numberOfLines={1}>{team.shortDisplayName ?? team.displayName ?? team.name}</Text>
                  </View>
                  {[getStat('gamesPlayed'), getStat('wins'), getStat('ties'), getStat('losses'),
                    getStat('pointsFor'), getStat('pointsAgainst'), getStat('points')].map((v: any, vi: number) => (
                    <Text key={vi} style={[styles.tdNum, vi === 6 && styles.tdPts, { color: vi === 6 ? colors.primary : appColors.text }]}>{v}</Text>
                  ))}
                </View>
              );
            })}
          </View>
        );
      })}
    </>
  );
}

// ── WC Scorers component ────────────────────────────────────────────────────
function WCScorersView({ data, appColors }: { data: any; appColors: any }) {
  const categories: any[] = data?.categories ?? data?.leaders ?? [];
  const goalsCategory = categories.find((c: any) =>
    (c.displayName ?? c.name ?? '').toLowerCase().includes('gol') ||
    (c.displayName ?? c.name ?? '').toLowerCase().includes('goal')
  ) ?? categories[0];

  const leaders: any[] = goalsCategory?.leaders ?? goalsCategory?.items ?? data?.items ?? [];
  if (!leaders.length) return <EmptyState label="Sin datos de goleadores disponibles" appColors={appColors} />;

  return (
    <>
      <Text style={[styles.groupHeader, { color: appColors.text, backgroundColor: `${colors.primary}20` }]}>
        {goalsCategory?.displayName ?? 'Goleadores'}
      </Text>
      {leaders.map((item: any, i: number) => {
        // DB format: {name, goals, team:{name,code,flagUrl}}
        // ESPN format: {athlete:{displayName,headshot,team}, value}
        const isDbFormat = !!item.goals;
        const playerName = isDbFormat ? item.name : (item.athlete?.displayName ?? '—');
        const goals = isDbFormat ? item.goals : (item.value ?? item.statValue ?? '—');
        const teamInfo = isDbFormat ? item.team : item.athlete?.team;
        const teamLogo = teamInfo?.flagUrl ?? teamInfo?.logos?.[0]?.href ?? teamInfo?.logo;
        const teamName = teamInfo?.name ?? teamInfo?.displayName ?? '';
        const photo = item.athlete?.headshot?.href;

        return (
          <View key={i} style={[styles.row, { backgroundColor: appColors.surface }]}>
            <Text style={[styles.rank, { color: appColors.textSecondary }]}>#{i + 1}</Text>
            {photo
              ? <Image source={{ uri: photo }} style={styles.photo} />
              : <View style={[styles.photo, { backgroundColor: appColors.border, borderRadius: 20 }]} />}
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: appColors.text }]}>{playerName}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                {teamLogo ? <Image source={{ uri: teamLogo }} style={{ width: 16, height: 11, borderRadius: 1 }} /> : null}
                <Text style={[styles.sub, { color: appColors.textSecondary }]}>{teamName}</Text>
              </View>
            </View>
            <View style={styles.statBadge}>
              <Text style={styles.statBadgeText}>{goals}</Text>
              <Text style={[styles.statBadgeLabel, { color: appColors.textSecondary }]}>goles</Text>
            </View>
          </View>
        );
      })}
    </>
  );
}

// ── Liga Argentina component ────────────────────────────────────────────────
function LigaView({ data, appColors }: { data: any; appColors: any }) {
  // Handle both TyC Sports scraped array and ESPN JSON format
  if (Array.isArray(data) && data[0]?.team !== undefined) {
    // TyC Sports format
    return (
      <>
        <View style={[styles.tableHeader, { backgroundColor: appColors.surface }]}>
          <Text style={[{ width: 28, color: appColors.textSecondary, fontSize: 10 }]}>#</Text>
          <Text style={[styles.thTeam, { color: appColors.textSecondary }]}>Equipo</Text>
          {['PJ','Pts'].map(h => (
            <Text key={h} style={[styles.thNum, { color: appColors.textSecondary }]}>{h}</Text>
          ))}
        </View>
        {data.map((item: any, i: number) => (
          <View key={i} style={[styles.tableRow, { backgroundColor: i % 2 === 0 ? appColors.surface : appColors.background }]}>
            <Text style={[styles.rank, { color: appColors.textSecondary }]}>{item.pos ?? i + 1}</Text>
            <View style={styles.teamCell}>
              {item.shield ? <Image source={{ uri: item.shield }} style={styles.teamLogo} /> : null}
              <Text style={[styles.teamName, { color: appColors.text }]} numberOfLines={1}>{item.team}</Text>
            </View>
            <Text style={[styles.tdNum, { color: appColors.text }]}>{item.pj}</Text>
            <Text style={[styles.tdNum, styles.tdPts, { color: colors.primary }]}>{item.pts}</Text>
          </View>
        ))}
      </>
    );
  }

  // ESPN format
  const groups: any[] = data?.standings ?? data?.children ?? [];
  if (!groups.length) return <EmptyState label="Sin datos de Liga Argentina" appColors={appColors} />;
  return <WCStandingsView data={data} appColors={appColors} />;
}

function EmptyState({ label, appColors }: { label: string; appColors: any }) {
  return (
    <View style={{ padding: spacing.xl, alignItems: 'center' }}>
      <Text style={{ color: appColors.textSecondary, fontSize: typography.fontSize.sm }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.bold, padding: spacing.base },
  tabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, position: 'relative' },
  tabActive: {},
  tabLabel: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.medium },
  tabBar: { position: 'absolute', bottom: 0, left: 8, right: 8, height: 2, backgroundColor: colors.primary, borderRadius: 1 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  loadingText: { fontSize: typography.fontSize.sm },
  list: { padding: spacing.sm, gap: spacing.xs, paddingBottom: 80 },

  groupHeader: {
    fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.bold,
    paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: borderRadius.sm, marginBottom: 2,
  },
  tableHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.sm, marginBottom: 2 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: borderRadius.sm },
  thTeam: { flex: 1, fontSize: 9, fontFamily: typography.fontFamily.medium },
  thNum: { width: 26, textAlign: 'center', fontSize: 9, fontFamily: typography.fontFamily.medium },
  teamCell: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  teamLogo: { width: 20, height: 20, borderRadius: 10, resizeMode: 'contain' },
  teamName: { flex: 1, fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.medium },
  tdNum: { width: 26, textAlign: 'center', fontSize: typography.fontSize.xs },
  tdPts: { fontFamily: typography.fontFamily.bold },

  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: borderRadius.md },
  rank: { width: 24, fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.bold, textAlign: 'center' },
  photo: { width: 40, height: 40, borderRadius: 20 },
  name: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.medium },
  sub: { fontSize: typography.fontSize.xs },
  statBadge: {
    minWidth: 48, alignItems: 'center', justifyContent: 'center',
    backgroundColor: `${colors.primary}20`, borderRadius: borderRadius.md, padding: spacing.xs,
  },
  statBadgeText: { color: colors.primary, fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.black },
  statBadgeLabel: { fontSize: 9 },
});
