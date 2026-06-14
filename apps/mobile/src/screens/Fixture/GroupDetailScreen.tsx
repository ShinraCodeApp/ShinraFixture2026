import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, KeyboardAvoidingView, Platform, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { useSelector } from 'react-redux';

import { useAppTheme } from '../../hooks/useAppTheme';
import { apiService } from '../../services/api';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { TeamLogo } from '../../components/common/TeamLogo';
import { RootState } from '../../store';

dayjs.locale('es');

type GoalType = 'PIE' | 'CABEZA' | 'PENAL';

interface GoalEvent {
  minute: number;
  teamId: string;
  type: GoalType;
  assistPlayerId?: string;
  description: string;
}

interface MatchScoreForm {
  homeScore: string;
  awayScore: string;
  status: string;
  goals: GoalEvent[];
  fouls: { teamId: string; minute: number; description: string }[];
  injuries: { teamId: string; minute: number; description: string }[];
}

function ScoreEntryModal({
  match,
  visible,
  onClose,
  language,
}: {
  match: any;
  visible: boolean;
  onClose: () => void;
  language: string;
}) {
  const { appColors } = useAppTheme();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<MatchScoreForm>({
    homeScore: match?.homeScore?.toString() ?? '0',
    awayScore: match?.awayScore?.toString() ?? '0',
    status: match?.status === 'FINISHED' ? 'FINISHED' : 'LIVE',
    goals: [],
    fouls: [],
    injuries: [],
  });
  const [activeTab, setActiveTab] = useState<'score' | 'events'>('score');
  const [newGoal, setNewGoal] = useState({ minute: '', teamId: match?.homeTeam?.id ?? '', type: 'PIE' as GoalType, description: '' });

  const mutation = useMutation({
    mutationFn: async () => {
      const events = [
        ...form.goals.map(g => ({ type: 'GOAL', minute: g.minute, teamId: g.teamId, description: `${g.type}${g.description ? ' - ' + g.description : ''}` })),
        ...form.fouls.map(f => ({ type: 'FOUL', minute: f.minute, teamId: f.teamId, description: f.description })),
        ...form.injuries.map(i => ({ type: 'INJURY', minute: i.minute, teamId: i.teamId, description: i.description })),
      ];
      await apiService.patch(`/matches/${match.id}/score`, {
        homeScore: parseInt(form.homeScore) || 0,
        awayScore: parseInt(form.awayScore) || 0,
        status: form.status,
        events,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-matches'] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      Alert.alert('✅ Guardado', 'Resultado actualizado correctamente.');
      onClose();
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const teamName = (team: any) => language === 'en' ? (team?.shortName || team?.name) : team?.name;

  const addGoal = () => {
    if (!newGoal.minute) return;
    setForm(f => ({
      ...f,
      goals: [...f.goals, { minute: parseInt(newGoal.minute), teamId: newGoal.teamId, type: newGoal.type, description: newGoal.description }],
      homeScore: newGoal.teamId === match.homeTeam.id
        ? String(parseInt(f.homeScore || '0') + 1) : f.homeScore,
      awayScore: newGoal.teamId === match.awayTeam.id
        ? String(parseInt(f.awayScore || '0') + 1) : f.awayScore,
    }));
    setNewGoal({ minute: '', teamId: match.homeTeam.id, type: 'PIE', description: '' });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <SafeAreaView style={[styles.modal, { backgroundColor: appColors.background }]} edges={['top']}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: appColors.border }]}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={appColors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: appColors.text }]}>Cargar Partido</Text>
            <TouchableOpacity onPress={() => mutation.mutate()} disabled={mutation.isPending}>
              <Text style={[styles.saveBtn, { color: colors.primary }]}>
                {mutation.isPending ? '...' : 'Guardar'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Teams row */}
          <View style={[styles.teamsRow, { backgroundColor: appColors.surface }]}>
            <View style={styles.teamCol}>
              <TeamLogo uri={match?.homeTeam?.flagUrl} size={40} code={match?.homeTeam?.code} />
              <Text style={[styles.teamLabel, { color: appColors.text }]} numberOfLines={1}>
                {teamName(match?.homeTeam)}
              </Text>
            </View>
            <View style={styles.scoreInputRow}>
              <TextInput
                style={[styles.scoreInput, { backgroundColor: appColors.surfaceSecondary, color: appColors.text, borderColor: appColors.border }]}
                value={form.homeScore}
                onChangeText={(v) => setForm(f => ({ ...f, homeScore: v.replace(/\D/, '') }))}
                keyboardType="numeric"
                maxLength={2}
                textAlign="center"
              />
              <Text style={[styles.scoreSep, { color: appColors.textSecondary }]}>-</Text>
              <TextInput
                style={[styles.scoreInput, { backgroundColor: appColors.surfaceSecondary, color: appColors.text, borderColor: appColors.border }]}
                value={form.awayScore}
                onChangeText={(v) => setForm(f => ({ ...f, awayScore: v.replace(/\D/, '') }))}
                keyboardType="numeric"
                maxLength={2}
                textAlign="center"
              />
            </View>
            <View style={styles.teamCol}>
              <TeamLogo uri={match?.awayTeam?.flagUrl} size={40} code={match?.awayTeam?.code} />
              <Text style={[styles.teamLabel, { color: appColors.text }]} numberOfLines={1}>
                {teamName(match?.awayTeam)}
              </Text>
            </View>
          </View>

          {/* Status picker */}
          <View style={[styles.statusRow, { backgroundColor: appColors.surface }]}>
            {['SCHEDULED','LIVE','HALF_TIME','FINISHED'].map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.statusBtn, form.status === s && { backgroundColor: colors.primary }]}
                onPress={() => setForm(f => ({ ...f, status: s }))}
              >
                <Text style={[styles.statusText, form.status === s && { color: 'white' }]}>
                  {s === 'SCHEDULED' ? 'Prog.' : s === 'LIVE' ? 'Vivo' : s === 'HALF_TIME' ? 'ET' : 'Final'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tabs */}
          <View style={[styles.tabRow, { borderBottomColor: appColors.border }]}>
            {(['score', 'events'] as const).map((t) => (
              <TouchableOpacity key={t} style={[styles.tab, activeTab === t && styles.tabActive]} onPress={() => setActiveTab(t)}>
                <Text style={[styles.tabText, { color: activeTab === t ? colors.primary : appColors.textSecondary }]}>
                  {t === 'score' ? 'Resultado' : 'Eventos'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.base }}>
            {activeTab === 'events' && (
              <View>
                <Text style={[styles.eventSectionTitle, { color: appColors.text }]}>⚽ Agregar Gol</Text>
                <View style={[styles.eventForm, { backgroundColor: appColors.surface }]}>
                  {/* Minuto */}
                  <View style={styles.eventRow}>
                    <Text style={[styles.eventLabel, { color: appColors.textSecondary }]}>Minuto</Text>
                    <TextInput
                      style={[styles.eventInput, { backgroundColor: appColors.surfaceSecondary, color: appColors.text, borderColor: appColors.border }]}
                      value={newGoal.minute}
                      onChangeText={(v) => setNewGoal(g => ({ ...g, minute: v.replace(/\D/, '') }))}
                      keyboardType="numeric"
                      placeholder="45"
                      placeholderTextColor={appColors.textSecondary}
                    />
                  </View>
                  {/* Equipo */}
                  <View style={styles.eventRow}>
                    <Text style={[styles.eventLabel, { color: appColors.textSecondary }]}>Equipo</Text>
                    <View style={styles.toggleRow}>
                      {[match?.homeTeam, match?.awayTeam].map((team) => (
                        <TouchableOpacity
                          key={team?.id}
                          style={[styles.toggleBtn, newGoal.teamId === team?.id && { backgroundColor: colors.primary }]}
                          onPress={() => setNewGoal(g => ({ ...g, teamId: team?.id }))}
                        >
                          <Text style={[styles.toggleText, newGoal.teamId === team?.id && { color: 'white' }]}>
                            {team?.code}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  {/* Tipo */}
                  <View style={styles.eventRow}>
                    <Text style={[styles.eventLabel, { color: appColors.textSecondary }]}>Tipo</Text>
                    <View style={styles.toggleRow}>
                      {(['PIE', 'CABEZA', 'PENAL'] as GoalType[]).map((t) => (
                        <TouchableOpacity
                          key={t}
                          style={[styles.toggleBtn, newGoal.type === t && { backgroundColor: colors.primary }]}
                          onPress={() => setNewGoal(g => ({ ...g, type: t }))}
                        >
                          <Text style={[styles.toggleText, newGoal.type === t && { color: 'white' }]}>
                            {t === 'PIE' ? '🦶' : t === 'CABEZA' ? '🤯' : '⚽'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  {/* Asistencia */}
                  <View style={styles.eventRow}>
                    <Text style={[styles.eventLabel, { color: appColors.textSecondary }]}>Asistencia</Text>
                    <TextInput
                      style={[styles.eventInput, { flex: 1, backgroundColor: appColors.surfaceSecondary, color: appColors.text, borderColor: appColors.border }]}
                      value={newGoal.description}
                      onChangeText={(v) => setNewGoal(g => ({ ...g, description: v }))}
                      placeholder="Nombre del asistente (opcional)"
                      placeholderTextColor={appColors.textSecondary}
                    />
                  </View>
                  <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={addGoal}>
                    <Text style={styles.addBtnText}>+ Agregar gol</Text>
                  </TouchableOpacity>
                </View>

                {/* Goals list */}
                {form.goals.length > 0 && (
                  <View style={{ marginTop: spacing.sm }}>
                    {form.goals.map((g, i) => (
                      <View key={i} style={[styles.eventItem, { backgroundColor: appColors.surface }]}>
                        <Text style={{ color: appColors.textSecondary, fontSize: 12 }}>{g.minute}'</Text>
                        <Text style={{ color: appColors.text, flex: 1, marginLeft: 8 }}>
                          ⚽ {g.type} — {g.teamId === match?.homeTeam?.id ? match?.homeTeam?.code : match?.awayTeam?.code}
                          {g.description ? ` (${g.description})` : ''}
                        </Text>
                        <TouchableOpacity onPress={() => setForm(f => ({ ...f, goals: f.goals.filter((_, j) => j !== i) }))}>
                          <Ionicons name="close-circle" size={18} color={colors.error} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function GroupDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { group, tournamentId } = route.params;
  const { appColors } = useAppTheme();
  const { language } = useSelector((state: RootState) => state.settings);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);

  const { data: tournament, refetch: refetchTournament } = useQuery({
    queryKey: ['tournament', tournamentId],
    queryFn: async () => (await apiService.get(`/tournaments/${tournamentId}`)).data.data,
    staleTime: 5 * 60_000,
  });

  const { data: groupMatches = [], refetch: refetchMatches } = useQuery({
    queryKey: ['group-matches', tournamentId, group],
    queryFn: async () => {
      const res = await apiService.get(`/matches?group=${group}&tournamentId=${tournamentId}&limit=50`);
      return res.data.data?.items ?? [];
    },
    staleTime: 60_000,
  });

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchTournament(), refetchMatches()]);
    setRefreshing(false);
  };

  const currentGroup = tournament?.groups?.find((g: any) => g.letter === group);
  const teams = currentGroup?.teams?.map((t: any) => t.team) ?? [];

  const displayName = (team: any) =>
    language === 'en' ? (team?.shortName || team?.name) : team?.name;

  const matchesByDate = groupMatches.reduce<Record<string, any[]>>((acc, m: any) => {
    const key = dayjs(m.matchDate).format('YYYY-MM-DD');
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appColors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: appColors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={24} color={appColors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: appColors.text }]}>Grupo {group}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        {/* Teams */}
        <View style={[styles.teamsCard, { backgroundColor: appColors.surface }]}>
          <Text style={[styles.sectionTitle, { color: appColors.textSecondary }]}>EQUIPOS</Text>
          {teams.map((team: any, i: number) => (
            <View key={team.id} style={[styles.teamRow, i < teams.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: appColors.border }]}>
              <Text style={[styles.pos, { color: i < 2 ? colors.primary : appColors.textSecondary }]}>{i + 1}</Text>
              <TeamLogo uri={team.flagUrl} size={28} code={team.code} />
              <Text style={[styles.teamName, { color: appColors.text }]}>{displayName(team)}</Text>
              <Text style={[styles.teamCode, { color: appColors.textSecondary }]}>{team.code}</Text>
            </View>
          ))}
        </View>

        {/* Matches */}
        <View style={{ paddingHorizontal: spacing.screen, marginTop: spacing.lg }}>
          <Text style={[styles.sectionTitle, { color: appColors.textSecondary }]}>PARTIDOS</Text>
          {Object.entries(matchesByDate).sort().map(([date, matches]) => (
            <View key={date}>
              <Text style={[styles.dateLabel, { color: appColors.textSecondary }]}>
                {dayjs(date).format('dddd, D [de] MMMM')}
              </Text>
              {matches.map((match: any) => (
                <View key={match.id} style={[styles.matchCard, { backgroundColor: appColors.surface }]}>
                  <View style={styles.matchRow}>
                    <View style={styles.matchTeam}>
                      <TeamLogo uri={match.homeTeam?.flagUrl} size={24} code={match.homeTeam?.code} />
                      <Text style={[styles.matchTeamName, { color: appColors.text }]} numberOfLines={1}>
                        {displayName(match.homeTeam)}
                      </Text>
                    </View>
                    <View style={styles.matchCenter}>
                      {match.status === 'SCHEDULED' ? (
                        <Text style={[styles.matchTime, { color: appColors.text }]}>
                          {dayjs(match.matchDate).format('HH:mm')}
                        </Text>
                      ) : (
                        <Text style={[styles.matchScore, { color: match.status === 'LIVE' ? colors.live : appColors.text }]}>
                          {match.homeScore ?? 0} - {match.awayScore ?? 0}
                        </Text>
                      )}
                      <Text style={[styles.matchStatus, {
                        color: match.status === 'FINISHED' ? colors.success :
                               match.status === 'LIVE' ? colors.live : appColors.textSecondary,
                      }]}>
                        {match.status === 'SCHEDULED' ? 'Programado' :
                         match.status === 'LIVE' ? '🔴 En vivo' :
                         match.status === 'HALF_TIME' ? 'ET' : 'Final'}
                      </Text>
                    </View>
                    <View style={[styles.matchTeam, { alignItems: 'flex-end' }]}>
                      <TeamLogo uri={match.awayTeam?.flagUrl} size={24} code={match.awayTeam?.code} />
                      <Text style={[styles.matchTeamName, { color: appColors.text }]} numberOfLines={1}>
                        {displayName(match.awayTeam)}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.entryBtn, { borderColor: colors.primary }]}
                    onPress={() => setSelectedMatch(match)}
                  >
                    <MaterialCommunityIcons name="pencil" size={14} color={colors.primary} />
                    <Text style={[styles.entryBtnText, { color: colors.primary }]}>Cargar resultado</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ))}
          {groupMatches.length === 0 && (
            <Text style={[styles.empty, { color: appColors.textSecondary }]}>No hay partidos registrados para este grupo.</Text>
          )}
        </View>
      </ScrollView>

      {selectedMatch && (
        <ScoreEntryModal
          match={selectedMatch}
          visible={!!selectedMatch}
          onClose={() => setSelectedMatch(null)}
          language={language}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.screen, paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold },
  teamsCard: { margin: spacing.screen, borderRadius: borderRadius.lg, overflow: 'hidden' },
  sectionTitle: { fontSize: 10, fontFamily: typography.fontFamily.bold, letterSpacing: 0.8, paddingHorizontal: spacing.base, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  teamRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.base, paddingVertical: spacing.sm, gap: spacing.sm },
  pos: { width: 20, fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.bold, textAlign: 'center' },
  teamName: { flex: 1, fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.medium },
  teamCode: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.bold },
  dateLabel: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.medium, textTransform: 'uppercase', marginBottom: spacing.xs, marginTop: spacing.sm },
  matchCard: { borderRadius: borderRadius.lg, marginBottom: spacing.sm, overflow: 'hidden' },
  matchRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.base },
  matchTeam: { flex: 1, alignItems: 'center', gap: 4 },
  matchTeamName: { fontSize: 11, fontFamily: typography.fontFamily.medium, textAlign: 'center' },
  matchCenter: { alignItems: 'center', paddingHorizontal: spacing.sm },
  matchScore: { fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.black },
  matchTime: { fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold },
  matchStatus: { fontSize: 10, marginTop: 2 },
  entryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    borderTopWidth: StyleSheet.hairlineWidth, padding: spacing.sm,
  },
  entryBtnText: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.semiBold },
  empty: { textAlign: 'center', marginTop: spacing.xl, fontSize: typography.fontSize.sm },

  // Modal styles
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.screen, paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: { fontSize: typography.fontSize.md, fontFamily: typography.fontFamily.bold },
  saveBtn: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.bold },
  teamsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.base, marginHorizontal: spacing.screen, marginTop: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  teamCol: { flex: 1, alignItems: 'center', gap: 4 },
  teamLabel: { fontSize: 11, fontFamily: typography.fontFamily.medium, textAlign: 'center' },
  scoreInputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  scoreInput: {
    width: 52, height: 52, borderRadius: borderRadius.md, borderWidth: 1,
    fontSize: typography.fontSize.xxl, fontFamily: typography.fontFamily.black,
  },
  scoreSep: { fontSize: typography.fontSize.xl },
  statusRow: {
    flexDirection: 'row', gap: spacing.xs, padding: spacing.sm,
    marginHorizontal: spacing.screen, marginTop: spacing.sm, borderRadius: borderRadius.lg,
  },
  statusBtn: {
    flex: 1, paddingVertical: 6, borderRadius: borderRadius.sm,
    alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.06)',
  },
  statusText: { fontSize: 11, fontFamily: typography.fontFamily.semiBold },
  tabRow: {
    flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.screen, marginTop: spacing.sm,
  },
  tab: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabText: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.semiBold },
  eventSectionTitle: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.bold, marginBottom: spacing.sm },
  eventForm: { borderRadius: borderRadius.lg, padding: spacing.base, gap: spacing.sm },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  eventLabel: { width: 80, fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.medium },
  eventInput: { borderWidth: 1, borderRadius: borderRadius.sm, padding: spacing.xs, fontSize: typography.fontSize.sm, minWidth: 80 },
  toggleRow: { flexDirection: 'row', gap: spacing.xs },
  toggleBtn: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.sm, backgroundColor: 'rgba(0,0,0,0.06)' },
  toggleText: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.semiBold },
  addBtn: { marginTop: spacing.sm, padding: spacing.sm, borderRadius: borderRadius.md, alignItems: 'center' },
  addBtnText: { color: 'white', fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.sm },
  eventItem: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, borderRadius: borderRadius.sm, marginBottom: 4 },
});
