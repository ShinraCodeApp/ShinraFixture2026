import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SectionList, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import 'dayjs/locale/es';

import { useAppTheme } from '../../hooks/useAppTheme';
import { useMatches } from '../../hooks/useMatches';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { MatchCard } from '../../components/match/MatchCard';
import { StandingsTab } from '../../components/standings/StandingsTab';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { FilterPill } from '../../components/common/FilterPill';

dayjs.locale('es');

type ViewMode = 'fixture' | 'standings';
type FilterType = 'all' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L';

const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
const STAGES = ['GROUP', 'ROUND_OF_32', 'ROUND_OF_16', 'QUARTER_FINAL', 'SEMI_FINAL', 'THIRD_PLACE', 'FINAL'];

export function FixtureScreen() {
  const navigation = useNavigation<any>();
  const { appColors } = useAppTheme();
  const [viewMode, setViewMode] = useState<ViewMode>('fixture');
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const { allMatches, isLoading } = useMatches({ group: selectedFilter !== 'all' ? selectedFilter : undefined });

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
    <SafeAreaView style={[styles.container, { backgroundColor: appColors.background }]} edges={['top']}>
      {/* ── Header ─────────────────────────────────── */}
      <View style={[styles.header, { backgroundColor: appColors.surface, borderBottomColor: appColors.border }]}>
        <Text style={[styles.title, { color: appColors.text }]}>Fixture</Text>
        <Text style={[styles.subtitle, { color: appColors.textSecondary }]}>FIFA World Cup 2026™</Text>

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
                {mode === 'fixture' ? 'Partidos' : 'Posiciones'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: spacing.screen,
    paddingVertical: spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: typography.fontSize.xxl, fontFamily: typography.fontFamily.bold },
  subtitle: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.regular, marginBottom: spacing.sm },
  modeToggle: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    padding: 3,
    marginTop: spacing.sm,
  },
  modeButton: {
    flex: 1,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  modeText: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.medium },
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
