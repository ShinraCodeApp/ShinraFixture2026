import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SectionList, FlatList, Image, ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import 'dayjs/locale/es';

import { useAppTheme } from '../../hooks/useAppTheme';
import { useMatches } from '../../hooks/useMatches';
import { apiService } from '../../services/api';
import { RootState } from '../../store';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { MatchCard } from '../../components/match/MatchCard';
import { StandingsTab } from '../../components/standings/StandingsTab';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { FilterPill } from '../../components/common/FilterPill';

dayjs.locale('es');

type ViewMode = 'fixture' | 'standings';
type FilterType = 'all' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L';

const WC_GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
const OTHER_GROUPS = ['A', 'B', 'C', 'D', 'E', 'F'];

const TOURNAMENT_ICONS: Record<string, string> = {
  WORLD_CUP: '🌍',
  COPA_AMERICA: '🏆',
  EURO: '⭐',
  NATIONS_LEAGUE: '🏅',
  CHAMPIONS_LEAGUE: '👑',
  LIBERTADORES: '🦅',
  FRIENDLY: '🤝',
};

export function FixtureScreen() {
  const navigation = useNavigation<any>();
  const { appColors } = useAppTheme();
  const [viewMode, setViewMode] = useState<ViewMode>('fixture');
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);

  const { data: tournaments = [] } = useQuery({
    queryKey: ['tournaments'],
    queryFn: async () => (await apiService.get('/tournaments')).data.data ?? [],
    staleTime: 60_000 * 10,
  });

  const activeTournament = selectedTournamentId
    ? tournaments.find((t: any) => t.id === selectedTournamentId)
    : tournaments.find((t: any) => t.type === 'WORLD_CUP') ?? tournaments[0];

  const isWC = activeTournament?.type === 'WORLD_CUP';
  const GROUPS = isWC ? WC_GROUPS : OTHER_GROUPS;

  const { allMatches, isLoading } = useMatches({
    group: selectedFilter !== 'all' ? selectedFilter : undefined,
    tournamentId: activeTournament?.id,
  });

  const { favoriteTeam } = useSelector((state: RootState) => state.settings);
  const bgImageUri = favoriteTeam?.shieldUrl ?? favoriteTeam?.flagUrl ?? null;

  // Group matches by date
  const sections = useMemo(() => {
    if (!allMatches.length) return [];

    const grouped = allMatches.reduce<Record<string, typeof allMatches>>((acc, match) => {
      const dateKey = dayjs(match.matchDate).format('YYYY-MM-DD');
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(match);
      return acc;
    }, {});

    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        title: dayjs(date).format('dddd, D [de] MMMM'),
        data,
      }));
  }, [allMatches]);

  return (
    <View style={[styles.container, { backgroundColor: appColors.background }]}>
      {bgImageUri && (
        <Image
          source={{ uri: bgImageUri }}
          style={StyleSheet.flatten([StyleSheet.absoluteFillObject, styles.bgImage])}
          resizeMode="center"
          blurRadius={1}
        />
      )}
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      {/* ── Header ─────────────────────────────────── */}
      <View style={[styles.header, { backgroundColor: appColors.surface + 'EE', borderBottomColor: appColors.border }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.title, { color: appColors.text }]}>Fixture</Text>
            <Text style={[styles.subtitle, { color: appColors.textSecondary }]} numberOfLines={1}>
              {activeTournament?.name ?? 'FIFA World Cup 2026™'}
            </Text>
          </View>
          {/* Mode Toggle */}
          <View style={[styles.modeToggle, { backgroundColor: appColors.surfaceSecondary }]}>
            {(['fixture', 'standings'] as ViewMode[]).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[styles.modeButton, viewMode === mode && { backgroundColor: appColors.surface }]}
                onPress={() => setViewMode(mode)}
              >
                <Text style={[
                  styles.modeText,
                  { color: viewMode === mode ? colors.primary : appColors.textSecondary },
                ]}>
                  {mode === 'fixture' ? 'Partidos' : 'Tabla'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* ── Tournament Selector ──────────────────────── */}
      {tournaments.length > 0 && (
        <View style={[styles.tournamentBar, { backgroundColor: appColors.surface + 'CC', borderBottomColor: appColors.border }]}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={tournaments}
            keyExtractor={(t: any) => t.id}
            contentContainerStyle={styles.tournamentList}
            renderItem={({ item }: { item: any }) => {
              const isSelected = activeTournament?.id === item.id;
              return (
                <TouchableOpacity
                  style={[
                    styles.tournamentPill,
                    { backgroundColor: isSelected ? colors.primary : appColors.surfaceSecondary },
                  ]}
                  onPress={() => {
                    setSelectedTournamentId(item.id);
                    setSelectedFilter('all');
                  }}
                >
                  <Text style={styles.tournamentIcon}>{TOURNAMENT_ICONS[item.type] ?? '🏆'}</Text>
                  <Text style={[styles.tournamentLabel, { color: isSelected ? 'white' : appColors.textSecondary }]}>
                    {item.shortName}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {viewMode === 'standings' ? (
        <StandingsTab />
      ) : (
        <>
          {/* ── Group Filters ─────────────────────── */}
          <View style={styles.filtersContainer}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={['all', ...GROUPS]}
              keyExtractor={(item) => item}
              contentContainerStyle={styles.filtersList}
              renderItem={({ item }) => (
                <FilterPill
                  label={item === 'all' ? 'Todos' : `Grupo ${item}`}
                  isSelected={selectedFilter === item}
                  onPress={() => setSelectedFilter(item as FilterType)}
                />
              )}
            />
          </View>

          {/* ── Matches List ──────────────────────── */}
          {isLoading ? (
            <View style={styles.skeletonContainer}>
              {Array.from({ length: 5 }).map((_, i) => (
                <LoadingSkeleton key={i} style={styles.matchSkeleton} />
              ))}
            </View>
          ) : (
            <SectionList
              sections={sections}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              stickySectionHeadersEnabled
              renderSectionHeader={({ section }) => (
                <View style={[styles.sectionHeader, { backgroundColor: appColors.background }]}>
                  <Text style={[styles.sectionDate, { color: appColors.textSecondary }]}>
                    {section.title}
                  </Text>
                </View>
              )}
              renderItem={({ item }) => (
                <MatchCard
                  match={item}
                  onPress={() => navigation.navigate('MatchDetail', { matchId: item.id })}
                />
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: appColors.textSecondary }]}>
                    No hay partidos disponibles
                  </Text>
                </View>
              }
            />
          )}
        </>
      )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgImage: {
    opacity: 0.12,
  },
  header: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTop: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  title: { fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.bold },
  subtitle: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.regular, maxWidth: 200 },
  modeToggle: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    padding: 3,
  },
  modeButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  modeText: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.medium },
  tournamentBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.xs,
  },
  tournamentList: { paddingHorizontal: spacing.screen, gap: spacing.xs },
  tournamentPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: spacing.sm, paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  tournamentIcon: { fontSize: 14 },
  tournamentLabel: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.semiBold },
  filtersContainer: { paddingVertical: spacing.sm },
  filtersList: { paddingHorizontal: spacing.screen, gap: spacing.xs },
  listContent: { paddingBottom: 100 },
  sectionHeader: {
    paddingHorizontal: spacing.screen,
    paddingVertical: spacing.xs,
  },
  sectionDate: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  skeletonContainer: { padding: spacing.screen, gap: spacing.sm },
  matchSkeleton: { height: 90, borderRadius: borderRadius.md },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { fontSize: typography.fontSize.base },
});
