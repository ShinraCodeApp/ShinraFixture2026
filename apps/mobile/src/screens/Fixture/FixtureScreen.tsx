import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';

import { useAppTheme } from '../../hooks/useAppTheme';
import { apiService } from '../../services/api';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { StandingsTab } from '../../components/standings/StandingsTab';
import { selectTournament } from '../../store/slices/tournamentSlice';
import { RootState } from '../../store';

const TOURNAMENT_ICONS: Record<string, string> = {
  WORLD_CUP: '🌍', COPA_AMERICA: '🏆', EURO: '⭐', NATIONS_LEAGUE: '🏅',
  CHAMPIONS_LEAGUE: '👑', LIBERTADORES: '🦅', SUDAMERICANA: '🌎', FRIENDLY: '🤝',
  PREMIER_LEAGUE: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', LA_LIGA: '🇪🇸', BUNDESLIGA: '🇩🇪', SERIE_A: '🇮🇹',
  LIGUE_1: '🇫🇷', LIGA_ARG: '🇦🇷', LEAGUE: '🏆',
};

export function FixtureScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { appColors } = useAppTheme();
  const dispatch = useDispatch();
  const selectedId = useSelector((state: RootState) => state.tournament.selectedId);

  // Si llegan params (desde HomeScreen tile), actualizar selección global
  useEffect(() => {
    if (route.params?.tournamentId) {
      dispatch(selectTournament(route.params.tournamentId));
    }
  }, [route.params?.tournamentId]);

  const { data: tournaments = [] } = useQuery({
    queryKey: ['tournaments'],
    queryFn: async () => (await apiService.get('/tournaments')).data.data ?? [],
    staleTime: 60_000 * 10,
  });

  const activeTournament = selectedId
    ? tournaments.find((t: any) => t.id === selectedId)
    : tournaments.find((t: any) => t.type === 'WORLD_CUP') ?? tournaments[0];

  return (
    <View style={[styles.container, { backgroundColor: appColors.background }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: appColors.surface + 'EE', borderBottomColor: appColors.border }]}>
          <Text style={[styles.title, { color: appColors.text }]}>Fixture</Text>
          <Text style={[styles.subtitle, { color: appColors.textSecondary }]} numberOfLines={1}>
            {activeTournament?.name ?? 'Copa Mundial 2026'}
          </Text>
        </View>

        {/* Selector de torneos */}
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
                    onPress={() => dispatch(selectTournament(item.id))}
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

        {/* Tabla de posiciones */}
        <StandingsTab
          tournamentId={activeTournament?.id}
          tournamentType={activeTournament?.type}
          onGroupPress={(group, tid) =>
            navigation.navigate('GroupDetail', { group, tournamentId: tid })
          }
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: spacing.screen, paddingTop: spacing.sm, paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.bold },
  subtitle: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.regular },
  tournamentBar: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: spacing.xs },
  tournamentList: { paddingHorizontal: spacing.screen, gap: spacing.xs },
  tournamentPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: spacing.sm, paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  tournamentIcon: { fontSize: 14 },
  tournamentLabel: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.semiBold },
});
