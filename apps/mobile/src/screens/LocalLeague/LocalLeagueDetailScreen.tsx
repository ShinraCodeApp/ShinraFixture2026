import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { apiService } from '../../services/api';
import { useAppTheme } from '../../hooks/useAppTheme';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';

type Tab = 'standings' | 'fixture' | 'teams';

const TEAM_COLORS = ['#0D47A1','#C62828','#2E7D32','#F57F17','#6A1B9A','#00695C','#AD1457','#4527A0'];

function teamInitials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

function TeamBadge({ team, size = 36 }: { team: any; size?: number }) {
  const bg = team.color ?? TEAM_COLORS[0];
  const isImg = team.badge && (team.badge.startsWith('file://') || team.badge.startsWith('content://'));
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: bg + '33', borderWidth: 2, borderColor: bg,
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    }}>
      {isImg ? (
        <Image source={{ uri: team.badge }} style={{ width: size, height: size }} resizeMode="cover" />
      ) : (
        <Text style={{ color: bg, fontFamily: typography.fontFamily.bold, fontSize: size * 0.35 }}>
          {team.badge ?? teamInitials(team.name)}
        </Text>
      )}
    </View>
  );
}

function MatchRow({ match, leagueId, onResultSaved }: { match: any; leagueId: string; onResultSaved: () => void }) {
  const { appColors } = useAppTheme();
  const [editing, setEditing] = useState(false);
  const [hs, setHs] = useState(match.homeScore?.toString() ?? '');
  const [as_, setAs] = useState(match.awayScore?.toString() ?? '');
  const qc = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: () => apiService.get(`/local-leagues/${leagueId}/matches/${match.id}/g-update-result`, {
      params: { homeScore: Number(hs), awayScore: Number(as_) },
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['local-league', leagueId] });
      setEditing(false);
      onResultSaved();
    },
    onError: () => Alert.alert('Error', 'No se pudo guardar el resultado'),
  });

  return (
    <View style={[matchStyles.row, { backgroundColor: appColors.background }]}>
      <View style={matchStyles.team}>
        <TeamBadge team={match.homeTeam} size={28} />
        <Text style={[matchStyles.teamName, { color: appColors.text }]} numberOfLines={1}>
          {match.homeTeam?.name}
        </Text>
      </View>

      {editing ? (
        <View style={matchStyles.scoreEdit}>
          <TextScoreInput value={hs} onChange={setHs} />
          <Text style={[matchStyles.vs, { color: appColors.textSecondary }]}>-</Text>
          <TextScoreInput value={as_} onChange={setAs} />
          <TouchableOpacity onPress={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setEditing(false)}>
            <Ionicons name="close-circle" size={22} color={appColors.textSecondary} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={matchStyles.scoreBadge} onPress={() => setEditing(true)}>
          {match.isFinished ? (
            <Text style={matchStyles.scoreText}>{match.homeScore} - {match.awayScore}</Text>
          ) : (
            <Text style={[matchStyles.vsText, { color: appColors.textSecondary }]}>vs</Text>
          )}
        </TouchableOpacity>
      )}

      <View style={[matchStyles.team, matchStyles.teamAway]}>
        <Text style={[matchStyles.teamName, { color: appColors.text }]} numberOfLines={1}>
          {match.awayTeam?.name}
        </Text>
        <TeamBadge team={match.awayTeam} size={28} />
      </View>
    </View>
  );
}

function TextScoreInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { appColors } = useAppTheme();
  const { TextInput } = require('react-native');
  return (
    <TextInput
      style={[matchStyles.scoreInput, { backgroundColor: appColors.surface, color: appColors.text, borderColor: appColors.border }]}
      value={value}
      onChangeText={onChange}
      keyboardType="number-pad"
      maxLength={2}
      selectTextOnFocus
    />
  );
}

export function LocalLeagueDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { leagueId } = route.params;
  const { appColors } = useAppTheme();
  const [tab, setTab] = useState<Tab>('standings');
  const qc = useQueryClient();

  const { data: league, isLoading } = useQuery({
    queryKey: ['local-league', leagueId],
    queryFn: async () => (await apiService.get(`/local-leagues/${leagueId}`)).data.data,
  });

  const generateMutation = useMutation({
    mutationFn: () => apiService.get(`/local-leagues/${leagueId}/g-generate-fixture`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['local-league', leagueId] }),
    onError: () => Alert.alert('Error', 'No se pudo generar el fixture'),
  });

  const handleGenerateFixture = () => {
    const hasMatches = (league?.matches?.length ?? 0) > 0;
    if (hasMatches) {
      Alert.alert(
        'Regenerar fixture',
        'Esto borrará todos los partidos actuales. ¿Continuás?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Regenerar', style: 'destructive', onPress: () => generateMutation.mutate() },
        ]
      );
    } else {
      generateMutation.mutate();
    }
  };

  if (isLoading || !league) {
    return (
      <View style={{ flex: 1, backgroundColor: '#001489', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const sortedTeams = [...(league.teams ?? [])].sort(
    (a: any, b: any) => b.points - a.points || (b.goalDifference - a.goalDifference) || (b.goalsFor - a.goalsFor)
  );

  const matchesByRound: Record<number, any[]> = {};
  for (const m of league.matches ?? []) {
    if (!matchesByRound[m.round]) matchesByRound[m.round] = [];
    matchesByRound[m.round].push(m);
  }

  const TABS = [
    { key: 'standings', label: 'Posiciones', icon: 'table' },
    { key: 'fixture', label: 'Fixture', icon: 'calendar-check' },
    { key: 'teams', label: 'Equipos', icon: 'account-group' },
  ] as const;

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={['#001489', '#0D47A1', '#1565C0']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.leagueName} numberOfLines={1}>{league.name}</Text>
            <Text style={styles.leagueType}>{league.type} · {league.teams?.length ?? 0} equipos</Text>
          </View>
          <TouchableOpacity
            style={styles.addTeamBtn}
            onPress={() => navigation.navigate('EditLocalTeam', { leagueId, team: null })}
          >
            <Ionicons name="person-add-outline" size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {TABS.map((t) => (
            <TouchableOpacity key={t.key} style={styles.tab} onPress={() => setTab(t.key)}>
              <MaterialCommunityIcons
                name={t.icon as any}
                size={16}
                color={tab === t.key ? colors.accent : 'rgba(255,255,255,0.5)'}
              />
              <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>{t.label}</Text>
              {tab === t.key && <View style={styles.tabBar} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

          {/* POSICIONES */}
          {tab === 'standings' && (
            sortedTeams.length === 0 ? (
              <View style={styles.emptyTab}>
                <MaterialCommunityIcons name="table" size={40} color="rgba(255,255,255,0.3)" />
                <Text style={styles.emptyText}>Agregá equipos para ver las posiciones</Text>
              </View>
            ) : (
              <View style={styles.standingsTable}>
                <View style={styles.standHeader}>
                  {['#', 'Equipo', 'PJ', 'G', 'E', 'P', 'GF', 'GC', 'DG', 'Pts'].map((h) => (
                    <Text key={h} style={[styles.standHCell, h === 'Equipo' && styles.standTeamCell]}>{h}</Text>
                  ))}
                </View>
                {sortedTeams.map((t: any, i: number) => (
                  <View key={t.id} style={[styles.standRow, i % 2 === 0 && styles.standRowAlt]}>
                    <Text style={styles.standCell}>{i + 1}</Text>
                    <View style={[styles.standTeamCell, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                      <TeamBadge team={t} size={20} />
                      <Text style={styles.standTeamName} numberOfLines={1}>{t.name}</Text>
                    </View>
                    {[t.played, t.won, t.drawn, t.lost, t.goalsFor, t.goalsAgainst, t.goalDifference, t.points].map((v, vi) => (
                      <Text key={vi} style={[styles.standCell, vi === 7 && styles.standPts]}>{v}</Text>
                    ))}
                  </View>
                ))}
              </View>
            )
          )}

          {/* FIXTURE */}
          {tab === 'fixture' && (
            <View style={{ gap: spacing.base }}>
              <TouchableOpacity style={styles.generateBtn} onPress={handleGenerateFixture} disabled={generateMutation.isPending}>
                {generateMutation.isPending ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="refresh" size={18} color="white" />
                    <Text style={styles.generateBtnText}>
                      {(league.matches?.length ?? 0) > 0 ? 'Regenerar fixture' : 'Generar fixture'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {Object.keys(matchesByRound).length === 0 ? (
                <View style={styles.emptyTab}>
                  <MaterialCommunityIcons name="calendar-blank" size={40} color="rgba(255,255,255,0.3)" />
                  <Text style={styles.emptyText}>Tocá "Generar fixture" para crear los partidos</Text>
                </View>
              ) : (
                Object.entries(matchesByRound).map(([round, matches]) => (
                  <View key={round}>
                    <Text style={styles.roundLabel}>Fecha {round}</Text>
                    <View style={[styles.matchGroup, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
                      {(matches as any[]).map((m) => (
                        <MatchRow
                          key={m.id}
                          match={m}
                          leagueId={leagueId}
                          onResultSaved={() => qc.invalidateQueries({ queryKey: ['local-league', leagueId] })}
                        />
                      ))}
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* EQUIPOS */}
          {tab === 'teams' && (
            <View style={{ gap: spacing.sm }}>
              {(league.teams ?? []).map((team: any) => (
                <TouchableOpacity
                  key={team.id}
                  style={[styles.teamCard, { backgroundColor: 'rgba(255,255,255,0.1)' }]}
                  onPress={() => navigation.navigate('EditLocalTeam', { leagueId, team })}
                  activeOpacity={0.8}
                >
                  <TeamBadge team={team} size={40} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.teamCardName}>{team.name}</Text>
                    <Text style={styles.teamCardSub}>{team.players?.length ?? 0} jugadores · Tocá para editar</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.5)" />
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={styles.addTeamCardBtn}
                onPress={() => navigation.navigate('EditLocalTeam', { leagueId, team: null })}
              >
                <Ionicons name="add-circle-outline" size={22} color={colors.accent} />
                <Text style={[styles.addTeamCardText, { color: colors.accent }]}>Agregar equipo</Text>
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.base, paddingVertical: spacing.md,
  },
  leagueName: { color: 'white', fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold },
  leagueType: { color: 'rgba(255,255,255,0.6)', fontSize: typography.fontSize.xs },
  addTeamBtn: { padding: 4 },

  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.15)' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, gap: 3, position: 'relative' },
  tabLabel: { fontSize: 10, fontFamily: typography.fontFamily.medium, color: 'rgba(255,255,255,0.5)' },
  tabLabelActive: { color: colors.accent },
  tabBar: { position: 'absolute', bottom: 0, left: 8, right: 8, height: 2, backgroundColor: colors.accent, borderRadius: 1 },

  content: { padding: spacing.base, paddingBottom: 80 },

  emptyTab: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxxl },
  emptyText: { color: 'rgba(255,255,255,0.5)', textAlign: 'center', fontSize: typography.fontSize.sm },

  standingsTable: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: borderRadius.lg, overflow: 'hidden' },
  standHeader: { flexDirection: 'row', paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.15)' },
  standHCell: { width: 28, textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 10, fontFamily: typography.fontFamily.bold },
  standRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: spacing.sm },
  standRowAlt: { backgroundColor: 'rgba(255,255,255,0.04)' },
  standCell: { width: 28, textAlign: 'center', color: 'rgba(255,255,255,0.85)', fontSize: 11, fontFamily: typography.fontFamily.medium },
  standTeamCell: { flex: 1 },
  standTeamName: { color: 'white', fontSize: 11, fontFamily: typography.fontFamily.medium },
  standPts: { color: colors.accent, fontFamily: typography.fontFamily.bold },

  generateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.primary, borderRadius: borderRadius.md, paddingVertical: spacing.md,
  },
  generateBtnText: { color: 'white', fontFamily: typography.fontFamily.semiBold },

  roundLabel: { color: colors.accent, fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.sm, marginBottom: spacing.xs },
  matchGroup: { borderRadius: borderRadius.lg, overflow: 'hidden' },

  teamCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md, borderRadius: borderRadius.lg,
  },
  teamCardName: { color: 'white', fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.base },
  teamCardSub: { color: 'rgba(255,255,255,0.5)', fontSize: typography.fontSize.xs, marginTop: 2 },
  addTeamCardBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    paddingVertical: spacing.md, borderRadius: borderRadius.lg,
    borderWidth: 1.5, borderColor: colors.accent, borderStyle: 'dashed',
  },
  addTeamCardText: { fontFamily: typography.fontFamily.semiBold },
});

const matchStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  team: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  teamAway: { justifyContent: 'flex-end' },
  teamName: { flex: 1, fontSize: 11, fontFamily: typography.fontFamily.medium },
  scoreBadge: { paddingHorizontal: spacing.sm },
  scoreText: { color: 'white', fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.base },
  vsText: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.medium },
  scoreEdit: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  scoreInput: {
    width: 32, textAlign: 'center', borderWidth: 1, borderRadius: 6,
    paddingVertical: 2, fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.bold,
  },
  vs: { fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.base },
});
