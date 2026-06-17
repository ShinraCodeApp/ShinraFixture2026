import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import { useAppTheme } from '../../hooks/useAppTheme';
import { colors, spacing, typography, borderRadius } from '../../theme';

type Tab = 'wc-global' | 'wc-groups' | 'wc-scorers' | 'liga';

export function StatsScreen() {
  const { appColors } = useAppTheme();
  const navigation = useNavigation<any>();
  const [tab, setTab] = useState<Tab>('wc-global');

  const { data: wcStandings, isLoading: loadStandings, refetch: refetchStandings } = useQuery({
    queryKey: ['wc-standings'],
    queryFn: async () => (await apiService.get('/stats/wc-standings')).data.data,
    enabled: tab === 'wc-global' || tab === 'wc-groups',
    staleTime: 5 * 60_000,
  });

  const [scorersSubTab, setScorersSubTab] = useState<'goals' | 'assists'>('goals');

  const { data: wcScorers, isLoading: loadScorers, refetch: refetchScorers } = useQuery({
    queryKey: ['wc-scorers'],
    queryFn: async () => (await apiService.get('/stats/wc-scorers')).data.data,
    enabled: tab === 'wc-scorers',
    staleTime: 4 * 60_000,
  });

  const { data: wcAssists, isLoading: loadAssists, refetch: refetchAssists } = useQuery({
    queryKey: ['wc-assists'],
    queryFn: async () => (await apiService.get('/stats/wc-assists')).data.data,
    enabled: tab === 'wc-scorers' && scorersSubTab === 'assists',
    staleTime: 4 * 60_000,
  });

  const { data: ligaData, isLoading: loadLiga, refetch: refetchLiga } = useQuery({
    queryKey: ['liga-argentina'],
    queryFn: async () => (await apiService.get('/stats/liga-argentina')).data.data,
    enabled: tab === 'liga',
    staleTime: 5 * 60_000,
  });

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    if (tab === 'wc-global' || tab === 'wc-groups') await refetchStandings();
    else if (tab === 'wc-scorers') {
      await refetchScorers();
      if (scorersSubTab === 'assists') await refetchAssists();
    } else await refetchLiga();
    setRefreshing(false);
  };

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: 'wc-global', label: '#WC' },
    { key: 'wc-groups', label: 'Grupos' },
    { key: 'wc-scorers', label: 'Goles' },
    { key: 'liga', label: 'Liga Arg.' },
  ];

  const isLoading =
    tab === 'wc-global' ? loadStandings :
    tab === 'wc-groups' ? loadStandings :
    tab === 'wc-scorers' ? (scorersSubTab === 'goals' ? loadScorers : loadAssists) : loadLiga;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appColors.background }]} edges={['top']}>
      <View style={styles.screenHeader}>
        <Text style={[styles.title, { color: appColors.text }]}>Estadísticas</Text>
        <TouchableOpacity
          style={[styles.winnersBtn, { backgroundColor: '#FFD70022', borderColor: '#FFD70055' }]}
          onPress={() => navigation.navigate('WorldCupWinners')}
        >
          <Text style={styles.winnersBtnText}>🏆 Campeones</Text>
        </TouchableOpacity>
      </View>

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

      {/* WC Global ranking — ALL 48 teams sorted by pts/DIF/GF */}
      {tab === 'wc-global' && !isLoading && wcStandings && (
        <ScrollView contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
          <WCGlobalView data={wcStandings} appColors={appColors} />
        </ScrollView>
      )}

      {/* WC Group standings */}
      {tab === 'wc-groups' && !isLoading && wcStandings && (
        <ScrollView contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
          <WCStandingsView data={wcStandings} appColors={appColors} />
        </ScrollView>
      )}

      {/* WC Top Scorers / Assists */}
      {tab === 'wc-scorers' && (
        <>
          <View style={[styles.subTabRow, { borderBottomColor: appColors.border }]}>
            {([['goals', 'Goleadores'], ['assists', 'Asistencias']] as const).map(([key, label]) => (
              <TouchableOpacity
                key={key}
                style={[styles.subTab, scorersSubTab === key && styles.subTabActive]}
                onPress={() => setScorersSubTab(key)}
              >
                <Text style={[styles.subTabLabel, { color: scorersSubTab === key ? colors.primary : appColors.textSecondary }]}>{label}</Text>
                {scorersSubTab === key && <View style={styles.subTabBar} />}
              </TouchableOpacity>
            ))}
          </View>
          {isLoading
            ? <View style={styles.loader}><ActivityIndicator color={colors.primary} size="large" /></View>
            : <ScrollView contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
                {scorersSubTab === 'goals'
                  ? <WCScorersView data={wcScorers} type="goals" appColors={appColors} />
                  : <WCScorersView data={wcAssists} type="assists" appColors={appColors} />}
              </ScrollView>}
        </>
      )}

      {/* Liga Argentina */}
      {tab === 'liga' && !isLoading && ligaData && (
        <ScrollView contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
          <LigaView data={ligaData} appColors={appColors} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── WC Global ranking (#1–48) ───────────────────────────────────────────────
function WCGlobalView({ data, appColors }: { data: any; appColors: any }) {
  if (!Array.isArray(data) || !data.length) return <EmptyState label="Sin datos del mundial" appColors={appColors} />;

  // Flatten all groups into one array
  const allTeams: any[] = [];
  for (const g of data) {
    for (const entry of g.entries ?? []) {
      allTeams.push({ ...entry, groupName: g.group });
    }
  }

  // Sort globally: pts DESC → DIF DESC → GF DESC
  allTeams.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.dif !== a.dif) return b.dif - a.dif;
    return b.gf - a.gf;
  });

  const cols = ['PJ','PG','PE','PP','GF','GC','DIF','Pts'];

  return (
    <>
      <Text style={[styles.groupHeader, { color: appColors.text, backgroundColor: `${colors.primary}20` }]}>
        Clasificación Mundial 2026
      </Text>
      <View style={[styles.tableHeader, { backgroundColor: appColors.surface }]}>
        <Text style={[{ width: 24, color: appColors.textSecondary, fontSize: 9, textAlign: 'center' }]}>#</Text>
        <Text style={[styles.thTeam, { color: appColors.textSecondary }]}>Equipo</Text>
        <Text style={[{ width: 20, color: appColors.textSecondary, fontSize: 9, textAlign: 'center' }]}>G</Text>
        {cols.map(h => (
          <Text key={h} style={[styles.thNum, { color: appColors.textSecondary }]}>{h}</Text>
        ))}
      </View>
      {allTeams.map((entry: any, idx: number) => {
        const team = entry.team ?? {};
        const logo = team.logo;
        return (
          <View key={idx} style={[styles.tableRow, { backgroundColor: idx % 2 === 0 ? appColors.surface : appColors.background }]}>
            <Text style={[styles.rankNum, { color: idx < 3 ? colors.primary : appColors.textSecondary }]}>
              {idx + 1}
            </Text>
            <View style={styles.teamCell}>
              {logo ? <Image source={{ uri: logo }} style={styles.teamLogo} /> : null}
              <Text style={[styles.teamName, { color: appColors.text }]} numberOfLines={1}>
                {team.shortName ?? team.name}
              </Text>
            </View>
            <Text style={[styles.tdNum, { color: appColors.textSecondary, width: 20, fontSize: 9 }]}>
              {entry.groupName}
            </Text>
            {[entry.pj, entry.pg, entry.pe, entry.pp, entry.gf, entry.gc, entry.dif, entry.pts].map((v: any, vi: number) => (
              <Text key={vi} style={[styles.tdNum, vi === 7 && styles.tdPts, { color: vi === 7 ? colors.primary : vi === 6 ? (v > 0 ? '#10B981' : v < 0 ? '#EF4444' : appColors.text) : appColors.text }]}>
                {v ?? 0}
              </Text>
            ))}
          </View>
        );
      })}
    </>
  );
}

// ── WC Standings by group ───────────────────────────────────────────────────
function WCStandingsView({ data, appColors }: { data: any; appColors: any }) {
  let groups: any[] = [];

  if (Array.isArray(data)) {
    groups = data;
    return (
      <>
        {groups.map((g: any, gi: number) => (
          <View key={gi} style={{ marginBottom: spacing.base }}>
            <Text style={[styles.groupHeader, { color: appColors.text, backgroundColor: `${colors.primary}20` }]}>GRUPO {g.group}</Text>
            <View style={[styles.tableHeader, { backgroundColor: appColors.surface }]}>
              <Text style={[styles.thTeam, { color: appColors.textSecondary }]}>Equipo</Text>
              {['PJ','PG','PE','PP','GF','GC','DIF','Pts'].map(h => (
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
                  {[entry.pj, entry.pg, entry.pe, entry.pp, entry.gf, entry.gc, entry.dif, entry.pts].map((v: any, vi: number) => (
                    <Text key={vi} style={[styles.tdNum, vi === 7 && styles.tdPts, { color: vi === 7 ? colors.primary : appColors.text }]}>{v ?? 0}</Text>
                  ))}
                </View>
              );
            })}
          </View>
        ))}
      </>
    );
  }

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
              {['PJ','PG','PE','PP','GF','GC','DIF','Pts'].map(h => (
                <Text key={h} style={[styles.thNum, { color: appColors.textSecondary }]}>{h}</Text>
              ))}
            </View>
            {entries.map((entry: any, ei: number) => {
              const team = entry.team ?? {};
              const stats = entry.stats ?? [];
              const getStat = (n: string) => stats.find((s: any) => s.name === n || s.abbreviation === n)?.value ?? 0;
              const logo = team.logos?.[0]?.href ?? team.logo;
              return (
                <View key={ei} style={[styles.tableRow, { backgroundColor: ei % 2 === 0 ? appColors.surface : appColors.background }]}>
                  <View style={styles.teamCell}>
                    {logo ? <Image source={{ uri: logo }} style={styles.teamLogo} /> : null}
                    <Text style={[styles.teamName, { color: appColors.text }]} numberOfLines={1}>{team.shortDisplayName ?? team.displayName ?? team.name}</Text>
                  </View>
                  {[getStat('gamesPlayed'), getStat('wins'), getStat('ties'), getStat('losses'),
                    getStat('pointsFor'), getStat('pointsAgainst'),
                    getStat('pointsFor') - getStat('pointsAgainst'), getStat('points')].map((v: any, vi: number) => (
                    <Text key={vi} style={[styles.tdNum, vi === 7 && styles.tdPts, { color: vi === 7 ? colors.primary : appColors.text }]}>{v}</Text>
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

// ── WC Scorers / Assists ───────────────────────────────────────────────────
function WCScorersView({ data, type, appColors }: { data: any; type: 'goals' | 'assists'; appColors: any }) {
  const isGoals = type === 'goals';
  const emptyLabel = isGoals ? 'Sin datos de goleadores' : 'Sin datos de asistencias';

  if (!data) return <EmptyState label={emptyLabel} appColors={appColors} />;

  const categories: any[] = data?.categories ?? data?.leaders ?? [];
  const category = categories[0];
  const leaders: any[] = category?.leaders ?? category?.items ?? data?.items ?? [];

  if (!leaders.length) return <EmptyState label={emptyLabel} appColors={appColors} />;

  return (
    <>
      {leaders.map((item: any, i: number) => {
        // Supports both espn-web format ({name, team:{name}, value, goals/assists})
        // and ESPN API format ({athlete:{displayName}, value, athlete:{team:{...}}})
        const playerName = item.name ?? item.athlete?.displayName ?? '—';
        const statValue = isGoals
          ? (item.goals ?? item.value ?? item.statValue ?? '—')
          : (item.assists ?? item.value ?? item.statValue ?? '—');
        const teamInfo = item.team ?? item.athlete?.team;
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
            <View style={[styles.statBadge, !isGoals && { backgroundColor: '#7C3AED22' }]}>
              <Text style={[styles.statBadgeText, !isGoals && { color: '#7C3AED' }]}>{statValue}</Text>
              <Text style={[styles.statBadgeLabel, { color: appColors.textSecondary }]}>{isGoals ? 'goles' : 'asist.'}</Text>
            </View>
          </View>
        );
      })}
    </>
  );
}

// ── Liga Argentina ─────────────────────────────────────────────────────────
function LigaView({ data, appColors }: { data: any; appColors: any }) {
  if (Array.isArray(data) && data[0]?.team !== undefined) {
    return (
      <>
        <View style={[styles.tableHeader, { backgroundColor: appColors.surface }]}>
          <Text style={[{ width: 24, color: appColors.textSecondary, fontSize: 9, textAlign: 'center' }]}>#</Text>
          <Text style={[styles.thTeam, { color: appColors.textSecondary }]}>Equipo</Text>
          {['PJ','PG','PE','PP','GF','GC','DIF','Pts'].map(h => (
            <Text key={h} style={[styles.thNum, { color: appColors.textSecondary }]}>{h}</Text>
          ))}
        </View>
        {data.map((item: any, i: number) => (
          <View key={i} style={[styles.tableRow, { backgroundColor: i % 2 === 0 ? appColors.surface : appColors.background }]}>
            <Text style={[styles.rankNum, { color: i < 4 ? colors.primary : appColors.textSecondary }]}>{item.pos ?? i + 1}</Text>
            <View style={styles.teamCell}>
              {item.shield ? <Image source={{ uri: item.shield }} style={styles.teamLogo} /> : null}
              <Text style={[styles.teamName, { color: appColors.text }]} numberOfLines={1}>{item.team}</Text>
            </View>
            {[item.pj, item.pg, item.pe, item.pp, item.gf, item.gc, item.dif, item.pts].map((v: any, vi: number) => (
              <Text key={vi} style={[styles.tdNum, vi === 7 && styles.tdPts, {
                color: vi === 7 ? colors.primary : vi === 6 ? (Number(v) > 0 ? '#10B981' : Number(v) < 0 ? '#EF4444' : appColors.text) : appColors.text
              }]}>{v ?? '-'}</Text>
            ))}
          </View>
        ))}
      </>
    );
  }

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
  screenHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: spacing.base },
  title: { fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.bold, padding: spacing.base },
  winnersBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: borderRadius.full, borderWidth: 1 },
  winnersBtnText: { fontSize: 12, fontFamily: typography.fontFamily.semiBold, color: '#FFD700' },
  tabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, position: 'relative' },
  tabActive: {},
  tabLabel: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.medium },
  tabBar: { position: 'absolute', bottom: 0, left: 8, right: 8, height: 2, backgroundColor: colors.primary, borderRadius: 1 },
  subTabRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.base },
  subTab: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, position: 'relative' },
  subTabActive: {},
  subTabLabel: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.semiBold },
  subTabBar: { position: 'absolute', bottom: 0, left: 8, right: 8, height: 2, backgroundColor: colors.primary, borderRadius: 1 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  loadingText: { fontSize: typography.fontSize.sm },
  list: { padding: spacing.sm, gap: spacing.xs, paddingBottom: 80 },

  groupHeader: {
    fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.bold,
    paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: borderRadius.sm, marginBottom: 2,
  },
  tableHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.sm, marginBottom: 2 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: borderRadius.sm },
  rankNum: { width: 24, textAlign: 'center', fontSize: 10, fontFamily: typography.fontFamily.bold },
  thTeam: { flex: 1, fontSize: 9, fontFamily: typography.fontFamily.medium },
  thNum: { width: 26, textAlign: 'center', fontSize: 9, fontFamily: typography.fontFamily.medium },
  teamCell: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 },
  teamLogo: { width: 18, height: 18, borderRadius: 9, resizeMode: 'contain' },
  teamName: { flex: 1, fontSize: 10, fontFamily: typography.fontFamily.medium },
  tdNum: { width: 26, textAlign: 'center', fontSize: 10 },
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
