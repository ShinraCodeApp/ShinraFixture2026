import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { showMessage } from 'react-native-flash-message';

import { useAppTheme } from '../../hooks/useAppTheme';
import { apiService } from '../../services/api';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { TeamLogo } from '../../components/common/TeamLogo';

export interface BracketPicks {
  champion: string | null;
  finalists: string[];
  semis: string[];
  quarters: string[];
}

const EMPTY_PICKS: BracketPicks = {
  champion: null, finalists: [], semis: [], quarters: [],
};

const ROUNDS: { key: keyof BracketPicks; label: string; icon: string; max: number; pts: string; color: string }[] = [
  { key: 'quarters', label: 'Cuartos de Final', icon: 'trophy-outline',   max: 8, pts: '2 pts c/u', color: '#FF9800' },
  { key: 'semis',    label: 'Semifinalistas',   icon: 'trophy-variant',   max: 4, pts: '3 pts c/u', color: '#9C27B0' },
  { key: 'finalists',label: 'Finalistas',       icon: 'star-outline',     max: 2, pts: '5 pts c/u', color: '#1565C0' },
  { key: 'champion', label: 'Campeón',          icon: 'crown',            max: 1, pts: '10 pts',    color: '#FFD700' },
];

export function BracketPredictorScreen() {
  const navigation = useNavigation<any>();
  const { appColors } = useAppTheme();
  const queryClient = useQueryClient();

  const { data: tournaments = [] } = useQuery({
    queryKey: ['tournaments'],
    queryFn: async () => (await apiService.get('/tournaments')).data.data ?? [],
    staleTime: 5 * 60_000,
  });

  const wcTournament = useMemo(
    () => (tournaments as any[]).find((t: any) => t.type === 'WORLD_CUP') ?? null,
    [tournaments],
  );

  const { data: allTeams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ['teams-wc', wcTournament?.id],
    queryFn: async () => {
      const r = await apiService.get(`/teams?tournamentId=${wcTournament.id}&limit=48`);
      return r.data.data?.items ?? r.data.data ?? [];
    },
    enabled: !!wcTournament,
    staleTime: 10 * 60_000,
  });

  const { data: savedPick, isLoading: pickLoading, refetch } = useQuery({
    queryKey: ['bracket-pick', wcTournament?.id],
    queryFn: async () => {
      const r = await apiService.get(`/predictions/bracket?tournamentId=${wcTournament.id}`);
      return r.data.data;
    },
    enabled: !!wcTournament,
    staleTime: 30_000,
  });

  const { data: bracketRanking = [] } = useQuery({
    queryKey: ['bracket-ranking', wcTournament?.id],
    queryFn: async () => {
      const r = await apiService.get(`/predictions/bracket-ranking?tournamentId=${wcTournament.id}`);
      return r.data.data ?? [];
    },
    enabled: !!wcTournament,
    staleTime: 60_000,
  });

  const [picks, setPicks] = useState<BracketPicks>(EMPTY_PICKS);
  const [activeRound, setActiveRound] = useState<keyof BracketPicks>('champion');
  const [initialized, setInitialized] = useState(false);
  const [showRanking, setShowRanking] = useState(false);

  // Sync saved picks when loaded
  React.useEffect(() => {
    if (savedPick && !initialized) {
      setPicks({ ...EMPTY_PICKS, ...(savedPick.picks as BracketPicks) });
      setInitialized(true);
    } else if (!pickLoading && !savedPick && !initialized) {
      setInitialized(true);
    }
  }, [savedPick, pickLoading]);

  const saveMutation = useMutation({
    mutationFn: async (p: BracketPicks) => {
      const r = await apiService.post('/predictions/bracket', {
        tournamentId: wcTournament!.id,
        picks: p,
      });
      return r.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bracket-pick'] });
      showMessage({ message: '¡Pronóstico guardado!', type: 'success' });
    },
    onError: () => showMessage({ message: 'Error al guardar', type: 'danger' }),
  });

  const togglePick = (teamCode: string, roundKey: keyof BracketPicks) => {
    setPicks((prev) => {
      if (roundKey === 'champion') {
        return { ...prev, champion: prev.champion === teamCode ? null : teamCode };
      }
      const arr = prev[roundKey] as string[];
      const round = ROUNDS.find((r) => r.key === roundKey)!;
      if (arr.includes(teamCode)) {
        return { ...prev, [roundKey]: arr.filter((c) => c !== teamCode) };
      }
      if (arr.length >= round.max) {
        showMessage({ message: `Máximo ${round.max} equipos para esta ronda`, type: 'warning' });
        return prev;
      }
      return { ...prev, [roundKey]: [...arr, teamCode] };
    });
  };

  const isSelected = (teamCode: string, roundKey: keyof BracketPicks) => {
    if (roundKey === 'champion') return picks.champion === teamCode;
    return (picks[roundKey] as string[]).includes(teamCode);
  };

  const handleSave = () => {
    if (!picks.champion) {
      Alert.alert('Campeón requerido', 'Seleccioná al menos al campeón para guardar');
      return;
    }
    saveMutation.mutate(picks);
  };

  const currentRound = ROUNDS.find((r) => r.key === activeRound)!;
  const selectedCount = activeRound === 'champion'
    ? (picks.champion ? 1 : 0)
    : (picks[activeRound] as string[]).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appColors.background }]} edges={['top']}>
      <LinearGradient colors={['#1A237E', '#283593']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={26} color="white" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Bracket Predictor</Text>
          <Text style={styles.headerSub}>Copa Mundial 2026</Text>
        </View>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saveMutation.isPending}
          style={[styles.saveBtn, saveMutation.isPending && { opacity: 0.6 }]}
        >
          {saveMutation.isPending
            ? <ActivityIndicator size={16} color="white" />
            : <Text style={styles.saveBtnText}>Guardar</Text>}
        </TouchableOpacity>
      </LinearGradient>

      {/* My points + ranking toggle */}
      {savedPick && (
        <TouchableOpacity
          style={[styles.myPicksBanner, { backgroundColor: appColors.surface, borderBottomColor: appColors.border }]}
          onPress={() => setShowRanking(!showRanking)}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="crown" size={18} color="#FFD700" />
          <Text style={[styles.myPicksPts, { color: appColors.text }]}>
            {savedPick.points ?? 0} pts del bracket
          </Text>
          {savedPick.isResolved && (
            <View style={styles.resolvedBadge}>
              <Text style={styles.resolvedBadgeText}>Resuelto ✓</Text>
            </View>
          )}
          <MaterialCommunityIcons
            name={showRanking ? 'chevron-up' : 'trophy-outline'}
            size={16} color={colors.primary}
            style={{ marginLeft: 'auto' }}
          />
        </TouchableOpacity>
      )}

      {/* Bracket ranking modal-ish */}
      {showRanking && (bracketRanking as any[]).length > 0 && (
        <View style={[styles.rankingPanel, { backgroundColor: appColors.surface, borderBottomColor: appColors.border }]}>
          <Text style={[styles.rankingTitle, { color: appColors.text }]}>Ranking del Bracket</Text>
          {(bracketRanking as any[]).slice(0, 10).map((entry: any, i: number) => (
            <View key={entry.id} style={styles.rankingRow}>
              <Text style={[styles.rankingPos, { color: i < 3 ? '#FFD700' : appColors.textSecondary }]}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
              </Text>
              <Text style={[styles.rankingName, { color: appColors.text }]} numberOfLines={1}>
                {entry.user?.displayName ?? entry.user?.username}
              </Text>
              <Text style={[styles.rankingPts, { color: colors.primary }]}>{entry.points} pts</Text>
            </View>
          ))}
        </View>
      )}

      {/* Points info */}
      <View style={[styles.pointsRow, { backgroundColor: appColors.surface, borderBottomColor: appColors.border }]}>
        {ROUNDS.map((r) => (
          <View key={r.key} style={styles.pointsCell}>
            <MaterialCommunityIcons name={r.icon as any} size={14} color={r.color} />
            <Text style={[styles.pointsPts, { color: r.color }]}>{r.pts}</Text>
          </View>
        ))}
      </View>

      {/* Round tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.roundTabs, { borderBottomColor: appColors.border }]}
        contentContainerStyle={{ paddingHorizontal: spacing.screen, gap: spacing.sm }}
      >
        {ROUNDS.map((r) => {
          const count = r.key === 'champion' ? (picks.champion ? 1 : 0) : (picks[r.key] as string[]).length;
          const isActive = activeRound === r.key;
          return (
            <TouchableOpacity
              key={r.key}
              style={[styles.roundTab, isActive && { borderColor: r.color, borderBottomWidth: 2 }]}
              onPress={() => setActiveRound(r.key)}
            >
              <Text style={[styles.roundTabText, { color: isActive ? r.color : appColors.textSecondary }]}>
                {r.label}
              </Text>
              <Text style={[styles.roundTabCount, { color: isActive ? r.color : appColors.textSecondary }]}>
                {count}/{r.max}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Round header */}
      <View style={[styles.roundHeader, { backgroundColor: currentRound.color + '15' }]}>
        <MaterialCommunityIcons name={currentRound.icon as any} size={18} color={currentRound.color} />
        <Text style={[styles.roundHeaderText, { color: currentRound.color }]}>
          {currentRound.label} — seleccioná {currentRound.max} · {currentRound.pts}
        </Text>
        <Text style={[styles.roundHeaderCount, { color: currentRound.color }]}>
          {selectedCount}/{currentRound.max}
        </Text>
      </View>

      {/* Teams grid */}
      <ScrollView
        contentContainerStyle={styles.teamsGrid}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={teamsLoading || pickLoading} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {(allTeams as any[]).map((team: any) => {
          const selected = isSelected(team.code, activeRound);
          return (
            <TouchableOpacity
              key={team.id}
              style={[
                styles.teamCard,
                { backgroundColor: appColors.surface },
                selected && { backgroundColor: currentRound.color + '25', borderColor: currentRound.color, borderWidth: 1.5 },
              ]}
              onPress={() => togglePick(team.code, activeRound)}
              activeOpacity={0.75}
            >
              <TeamLogo uri={team.flagUrl} size={36} code={team.code} />
              <Text style={[styles.teamCode, { color: selected ? currentRound.color : appColors.text }]}>
                {team.code}
              </Text>
              {selected && (
                <MaterialCommunityIcons name="check-circle" size={14} color={currentRound.color} style={styles.checkIcon} />
              )}
            </TouchableOpacity>
          );
        })}
        {teamsLoading && (
          <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} size="large" />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.screen, paddingBottom: spacing.lg,
  },
  headerCenter: { flex: 1, marginHorizontal: spacing.sm },
  headerTitle: { color: 'white', fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: typography.fontSize.xs },
  saveBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: borderRadius.full,
    paddingHorizontal: spacing.base, paddingVertical: spacing.xs,
  },
  saveBtnText: { color: 'white', fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.bold },

  myPicksBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.screen, paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  myPicksPts: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.semiBold },
  resolvedBadge: {
    backgroundColor: '#4CAF50' + '25', borderRadius: borderRadius.full,
    paddingHorizontal: spacing.xs, paddingVertical: 2,
  },
  resolvedBadgeText: { color: '#4CAF50', fontSize: 10, fontFamily: typography.fontFamily.semiBold },
  rankingPanel: {
    paddingHorizontal: spacing.screen, paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth, gap: spacing.xs,
  },
  rankingTitle: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.bold, marginBottom: 4 },
  rankingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 2 },
  rankingPos: { width: 28, fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.bold },
  rankingName: { flex: 1, fontSize: typography.fontSize.sm },
  rankingPts: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.bold },

  pointsRow: {
    flexDirection: 'row', paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pointsCell: { flex: 1, alignItems: 'center', gap: 2 },
  pointsPts: { fontSize: 10, fontFamily: typography.fontFamily.semiBold },

  roundTabs: { borderBottomWidth: StyleSheet.hairlineWidth, maxHeight: 52 },
  roundTab: { paddingVertical: spacing.sm, borderColor: 'transparent', borderBottomWidth: 2, alignItems: 'center' },
  roundTabText: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.semiBold },
  roundTabCount: { fontSize: 10 },

  roundHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.screen, paddingVertical: spacing.sm,
  },
  roundHeaderText: { flex: 1, fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.medium },
  roundHeaderCount: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.bold },

  teamsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', padding: spacing.sm, gap: spacing.sm, paddingBottom: 80,
  },
  teamCard: {
    width: '22%', minWidth: 72, alignItems: 'center', padding: spacing.sm, gap: 4,
    borderRadius: borderRadius.lg, position: 'relative',
    ...shadows.sm,
  },
  teamCode: { fontSize: 11, fontFamily: typography.fontFamily.bold },
  checkIcon: { position: 'absolute', top: 4, right: 4 },
});
