import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SectionList, FlatList,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector, useDispatch } from 'react-redux';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAppTheme } from '../../hooks/useAppTheme';
import { apiService } from '../../services/api';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { TeamLogo } from '../../components/common/TeamLogo';
import { RootState } from '../../store';
import { selectTournament } from '../../store/slices/tournamentSlice';

dayjs.locale('es');

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: '', LIVE: '🔴 En vivo', HALF_TIME: '⏸ ET', FINISHED: 'Final',
};
const STATUS_COLOR: Record<string, string> = {
  LIVE: colors.live, HALF_TIME: colors.live, FINISHED: colors.success, SCHEDULED: '',
};

const TOURNAMENT_ICONS: Record<string, string> = {
  WORLD_CUP: '🌍', COPA_AMERICA: '🏆', EURO: '⭐', NATIONS_LEAGUE: '🏅',
  CHAMPIONS_LEAGUE: '👑', LIBERTADORES: '🦅', SUDAMERICANA: '🌎', FRIENDLY: '🤝',
  PREMIER_LEAGUE: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', LA_LIGA: '🇪🇸', BUNDESLIGA: '🇩🇪', SERIE_A: '🇮🇹',
  LIGUE_1: '🇫🇷', LIGA_ARG: '🇦🇷', LEAGUE: '🏆',
};

export function MatchesScreen() {
  const navigation = useNavigation<any>();
  const { appColors } = useAppTheme();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const syncedOnce = useRef(false);
  const sectionListRef = useRef<SectionList<any>>(null);
  const scrolledToToday = useRef(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const today = dayjs().format('YYYY-MM-DD');

  const toggleSection = useCallback((dateKey: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) next.delete(dateKey);
      else next.add(dateKey);
      return next;
    });
  }, []);
  const { language } = useSelector((state: RootState) => state.settings);
  const selectedId = useSelector((state: RootState) => state.tournament.selectedId);

  const { data: tournaments = [] } = useQuery({
    queryKey: ['tournaments'],
    queryFn: async () => (await apiService.get('/tournaments')).data.data ?? [],
    staleTime: 60_000 * 5,
  });

  const activeTournamentId = selectedId ?? (() => {
    const ts = tournaments as any[];
    const wcTournament = ts.find((t: any) => t.type === 'WORLD_CUP');
    const wcStarted = wcTournament?.startDate && new Date(wcTournament.startDate) <= new Date();
    if (!wcStarted) {
      const friendly = ts.find((t: any) => t.type === 'FRIENDLY' && t.isActive);
      if (friendly) return friendly.id;
    }
    return wcTournament?.id ?? ts[0]?.id ?? null;
  })();

  const { data: allMatches = [], isLoading, refetch } = useQuery({
    queryKey: ['matches-all', activeTournamentId],
    queryFn: async () => {
      const qs = activeTournamentId ? `&tournamentId=${activeTournamentId}` : '';
      const res = await apiService.get(`/matches?limit=200${qs}`);
      return res.data.data?.items ?? [];
    },
    staleTime: 2 * 60_000,
    enabled: !!activeTournamentId,
  });

  const syncMutation = useMutation({
    mutationFn: () => apiService.post('/matches/espn-sync', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      queryClient.invalidateQueries({ queryKey: ['matches-all'] });
    },
  });

  // One sync on mount (to warm data); server cron handles live updates automatically
  useEffect(() => {
    if (!syncedOnce.current) {
      syncedOnce.current = true;
      syncMutation.mutate();
    }
  }, []);

  const displayName = (team: any) =>
    language === 'en' ? (team?.shortName || team?.name) : team?.name;

  const allSections = Object.entries(
    (allMatches as any[]).reduce<Record<string, any[]>>((acc, m) => {
      const key = dayjs(m.matchDate).format('YYYY-MM-DD');
      if (!acc[key]) acc[key] = [];
      acc[key].push(m);
      return acc;
    }, {})
  )
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({ title: dayjs(date).format('dddd, D [de] MMMM YYYY'), dateKey: date, data }));

  // Auto-collapse past sections on first load
  useEffect(() => {
    if (allSections.length === 0) return;
    setCollapsedSections(new Set(allSections.filter((s) => s.dateKey < today).map((s) => s.dateKey)));
  }, [allSections.length === 0]);

  // Sections with collapsed ones having empty data (SectionList requires data array)
  const sections = allSections.map((s) => ({
    ...s,
    data: collapsedSections.has(s.dateKey) ? [] : s.data,
  }));

  // Auto-scroll to today (or nearest future date) once data loads
  useEffect(() => {
    if (allSections.length === 0 || scrolledToToday.current) return;
    const todayIdx = allSections.findIndex((s) => s.dateKey >= today);
    if (todayIdx < 0) return;
    scrolledToToday.current = true;
    // Small delay to let SectionList finish layout
    const t = setTimeout(() => {
      try {
        sectionListRef.current?.scrollToLocation({ sectionIndex: todayIdx, itemIndex: 0, animated: true, viewOffset: 0 });
      } catch { /* ok if not ready */ }
    }, 400);
    return () => clearTimeout(t);
  }, [allSections.length]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appColors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: appColors.border }]}>
        <Text style={[styles.title, { color: appColors.text }]}>Partidos</Text>
        <TouchableOpacity
          style={styles.syncBtn}
          onPress={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
        >
          {syncMutation.isPending ? (
            <ActivityIndicator size={14} color={colors.primary} />
          ) : (
            <MaterialCommunityIcons name="sync" size={18} color={colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      {/* Tournament pills (FlatList horizontal) */}
      {tournaments.length > 0 && (
        <View style={[styles.tournamentBar, { borderBottomColor: appColors.border }]}>
          <FlatList
            horizontal
            data={tournaments as any[]}
            keyExtractor={(t) => t.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillList}
            renderItem={({ item }) => {
              const isActive = activeTournamentId === item.id;
              return (
                <TouchableOpacity
                  style={[styles.pill, { backgroundColor: isActive ? colors.primary : appColors.surfaceSecondary }]}
                  onPress={() => dispatch(selectTournament(item.id))}
                >
                  <Text style={[styles.pillText, { color: isActive ? 'white' : appColors.textSecondary }]}>
                    {item.shortName}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {/* Matches grouped by day */}
      <SectionList
        ref={sectionListRef}
        sections={sections}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />
        }
        renderSectionHeader={({ section }) => {
          const isToday = dayjs((section as any).dateKey).isSame(dayjs(), 'day');
          const isPast = (section as any).dateKey < today;
          const isCollapsed = collapsedSections.has((section as any).dateKey);
          return (
            <TouchableOpacity
              onPress={() => toggleSection((section as any).dateKey)}
              style={[styles.dayHeader, { backgroundColor: appColors.background }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.dayText, { color: isToday ? colors.primary : isPast ? appColors.textSecondary : appColors.text }]}>
                {isToday ? '📅 HOY — ' : ''}{section.title}
              </Text>
              <MaterialCommunityIcons
                name={isCollapsed ? 'chevron-down' : 'chevron-up'}
                size={16}
                color={isToday ? colors.primary : appColors.textSecondary}
              />
            </TouchableOpacity>
          );
        }}
        renderItem={({ item: match }) => {
          const isLive = match.status === 'LIVE' || match.status === 'HALF_TIME';
          return (
          <TouchableOpacity
            onPress={() => navigation.navigate('MatchDetail', { matchId: match.id })}
            style={[styles.matchCard, { backgroundColor: appColors.surface }, isLive && styles.matchCardLive]}
            activeOpacity={0.85}
          >
            <View style={styles.matchMeta}>
              {match.stage && match.stage !== 'FRIENDLY' && (
                <Text style={[styles.matchGroup, { color: appColors.textSecondary }]}>
                  {match.stage === 'GROUP' ? `Grupo ${match.group}` : match.stage.replace(/_/g, ' ')}
                </Text>
              )}
              {match.status !== 'SCHEDULED' && (
                <Text style={[styles.matchStatusLabel, { color: STATUS_COLOR[match.status] || appColors.textSecondary }]}>
                  {STATUS_LABEL[match.status] ?? match.status}
                </Text>
              )}
            </View>
            <View style={styles.matchRow}>
              <View style={styles.teamBlock}>
                <TeamLogo uri={match.homeTeam?.flagUrl} size={32} code={match.homeTeam?.code} />
                <Text style={[styles.teamName, { color: appColors.text }]} numberOfLines={2}>
                  {displayName(match.homeTeam)}
                </Text>
              </View>
              <View style={styles.centerBlock}>
                {match.status === 'SCHEDULED' ? (
                  <>
                    <Text style={[styles.matchTime, { color: appColors.text }]}>
                      {dayjs(match.matchDate).format('HH:mm')}
                    </Text>
                    <MaterialCommunityIcons name="soccer" size={14} color={appColors.textSecondary} style={{ marginTop: 2 }} />
                  </>
                ) : (
                  <Text style={[styles.matchScore, {
                    color: (match.status === 'LIVE' || match.status === 'HALF_TIME') ? colors.live : appColors.text,
                  }]}>
                    {match.homeScore ?? 0} – {match.awayScore ?? 0}
                  </Text>
                )}
              </View>
              <View style={[styles.teamBlock, { alignItems: 'flex-end' }]}>
                <TeamLogo uri={match.awayTeam?.flagUrl} size={32} code={match.awayTeam?.code} />
                <Text style={[styles.teamName, { color: appColors.text, textAlign: 'right' }]} numberOfLines={2}>
                  {displayName(match.awayTeam)}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="soccer-field" size={48} color={appColors.border} style={{ marginBottom: 12 }} />
              <Text style={[styles.emptyText, { color: appColors.textSecondary }]}>
                {syncMutation.isPending ? 'Sincronizando partidos...' : 'No hay partidos disponibles'}
              </Text>
              {!syncMutation.isPending && (
                <TouchableOpacity style={[styles.syncEmptyBtn, { backgroundColor: colors.primary }]} onPress={() => syncMutation.mutate()}>
                  <Text style={{ color: 'white', fontSize: 13, fontFamily: typography.fontFamily.semiBold }}>Sincronizar amistosos</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: spacing.screen,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.bold },
  syncBtn: { padding: 4 },
  tournamentBar: { borderBottomWidth: StyleSheet.hairlineWidth },
  pillList: { paddingHorizontal: spacing.screen, paddingVertical: spacing.xs, gap: spacing.xs },
  pill: { paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: borderRadius.full },
  pillText: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.semiBold },
  listContent: { paddingBottom: 100 },
  dayHeader: { paddingHorizontal: spacing.screen, paddingVertical: spacing.xs, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayText: { fontSize: 11, fontFamily: typography.fontFamily.medium, textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 },
  matchCard: {
    marginHorizontal: spacing.screen, marginBottom: spacing.xs,
    borderRadius: borderRadius.lg, overflow: 'hidden',
  },
  matchCardLive: {
    borderWidth: 1.5,
    borderColor: colors.live,
  },
  matchMeta: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: spacing.base, paddingTop: spacing.xs,
  },
  matchGroup: { fontSize: 10, fontFamily: typography.fontFamily.medium, textTransform: 'uppercase' },
  matchStatusLabel: { fontSize: 10, fontFamily: typography.fontFamily.bold },
  matchRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.base, paddingTop: spacing.xs },
  teamBlock: { flex: 1, alignItems: 'center', gap: 4 },
  teamName: { fontSize: 11, fontFamily: typography.fontFamily.medium, textAlign: 'center' },
  centerBlock: { alignItems: 'center', paddingHorizontal: spacing.sm, minWidth: 60 },
  matchScore: { fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.black },
  matchTime: { fontSize: typography.fontSize.md, fontFamily: typography.fontFamily.bold },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: spacing.screen },
  emptyText: { fontSize: typography.fontSize.base, textAlign: 'center', marginBottom: 16 },
  syncEmptyBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.full },
});
