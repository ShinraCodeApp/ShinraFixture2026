import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Modal, TextInput, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { showMessage } from 'react-native-flash-message';

import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useAppTheme } from '../../hooks/useAppTheme';
import { apiService } from '../../services/api';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';

const STATUS_COLOR: Record<string, string> = {
  OPEN: '#10B981',
  IN_PROGRESS: '#3B82F6',
  FINISHED: '#6B7280',
};
const STATUS_LABEL: Record<string, string> = {
  OPEN: 'Abierto',
  IN_PROGRESS: 'En curso',
  FINISHED: 'Finalizado',
};

function TournamentCard({ tournament, userId, onRespond }: { tournament: any; userId?: string; onRespond: (id: string, accept: boolean) => void }) {
  const { appColors } = useAppTheme();
  const myParticipation = tournament.participants?.find((p: any) => p.userId === userId);
  const statusColor = STATUS_COLOR[tournament.status] ?? '#6B7280';
  const isInvited = myParticipation?.status === 'INVITED';
  const sorted = [...(tournament.participants ?? [])].filter((p: any) => p.status === 'JOINED').sort((a: any, b: any) => b.points - a.points);

  return (
    <View style={[TC.card, { backgroundColor: appColors.surface }, shadows.sm]}>
      <View style={TC.headerRow}>
        <Text style={[TC.name, { color: appColors.text }]} numberOfLines={1}>{tournament.name}</Text>
        <View style={[TC.pill, { backgroundColor: statusColor + '20' }]}>
          <Text style={[TC.pillText, { color: statusColor }]}>{STATUS_LABEL[tournament.status]}</Text>
        </View>
      </View>

      <Text style={[TC.creator, { color: appColors.textSecondary }]}>
        Organizado por {tournament.creator?.displayName ?? tournament.creator?.username}
        {' · '}{(tournament.matchIds as string[]).length} partido(s)
      </Text>

      {/* Top 3 leaderboard */}
      {sorted.length > 0 && (
        <View style={TC.leaderboard}>
          {sorted.slice(0, 3).map((p: any, idx: number) => (
            <View key={p.userId} style={TC.leaderRow}>
              <Text style={[TC.rank, { color: idx === 0 ? '#F59E0B' : appColors.textSecondary }]}>
                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
              </Text>
              <Text style={[TC.leaderName, { color: p.userId === userId ? colors.primary : appColors.text }]} numberOfLines={1}>
                {p.user?.displayName ?? p.user?.username}
              </Text>
              <Text style={[TC.leaderPoints, { color: appColors.textSecondary }]}>{p.points} pts</Text>
            </View>
          ))}
        </View>
      )}

      {/* Invitation buttons */}
      {isInvited && (
        <View style={TC.actionRow}>
          <TouchableOpacity style={TC.acceptBtn} onPress={() => onRespond(tournament.id, true)}>
            <Text style={TC.actionTxt}>Unirme</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[TC.declineBtn, { backgroundColor: appColors.border }]} onPress={() => onRespond(tournament.id, false)}>
            <Text style={[TC.actionTxt, { color: appColors.text }]}>Rechazar</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const TC = StyleSheet.create({
  card: { borderRadius: borderRadius.lg, padding: spacing.base, marginBottom: spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  name: { fontSize: 14, fontFamily: typography.fontFamily.bold, flex: 1, marginRight: 8 },
  pill: { borderRadius: borderRadius.full, paddingHorizontal: 8, paddingVertical: 2 },
  pillText: { fontSize: 10, fontFamily: typography.fontFamily.bold },
  creator: { fontSize: 11, marginBottom: 8 },
  leaderboard: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#E5E7EB', paddingTop: 8, gap: 4 },
  leaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rank: { fontSize: 16, width: 24 },
  leaderName: { flex: 1, fontSize: 13, fontFamily: typography.fontFamily.semiBold },
  leaderPoints: { fontSize: 12, fontFamily: typography.fontFamily.bold },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  acceptBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: borderRadius.base, paddingVertical: 10, alignItems: 'center' },
  declineBtn: { flex: 1, borderRadius: borderRadius.base, paddingVertical: 10, alignItems: 'center' },
  actionTxt: { fontSize: 13, fontFamily: typography.fontFamily.bold, color: 'white' },
});

export function FriendTournamentsScreen() {
  const navigation = useNavigation<any>();
  const { appColors } = useAppTheme();
  const queryClient = useQueryClient();
  const { user } = useSelector((state: RootState) => state.auth);

  const [showCreate, setShowCreate] = useState(false);
  const [tournamentName, setTournamentName] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);

  const { data: tournaments = [], isLoading, refetch } = useQuery({
    queryKey: ['friend-tournaments'],
    queryFn: async () => (await apiService.get('/friend-tournaments')).data.data ?? [],
    staleTime: 30_000,
  });

  const { data: friends = [] } = useQuery({
    queryKey: ['friends-list'],
    queryFn: async () => (await apiService.get('/friends')).data.data ?? [],
    staleTime: 5 * 60_000,
    enabled: showCreate,
  });

  // Upcoming scheduled matches for selecting which to include
  const { data: upcomingMatches = [] } = useQuery({
    queryKey: ['matches-scheduled'],
    queryFn: async () => {
      const r = await apiService.get('/matches?status=SCHEDULED&limit=20');
      return (r.data.data?.matches ?? r.data.data ?? []) as any[];
    },
    staleTime: 5 * 60_000,
    enabled: showCreate,
  });

  const [selectedMatchIds, setSelectedMatchIds] = useState<string[]>([]);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!tournamentName.trim()) throw new Error('Ingresá un nombre');
      if (selectedMatchIds.length === 0) throw new Error('Seleccioná al menos 1 partido');
      await apiService.post('/friend-tournaments', {
        name: tournamentName.trim(),
        matchIds: selectedMatchIds,
        friendIds: selectedFriends,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friend-tournaments'] });
      showMessage({ message: '¡Torneo creado!', type: 'success' });
      setShowCreate(false);
      setTournamentName('');
      setSelectedFriends([]);
      setSelectedMatchIds([]);
    },
    onError: (e: any) => showMessage({ message: e?.response?.data?.error ?? e.message ?? 'Error', type: 'danger' }),
  });

  const respondMutation = useMutation({
    mutationFn: async ({ id, accept }: { id: string; accept: boolean }) =>
      apiService.post(`/friend-tournaments/${id}/respond`, { accept }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['friend-tournaments'] });
      showMessage({ message: vars.accept ? '¡Te uniste al torneo!' : 'Invitación rechazada', type: vars.accept ? 'success' : 'info' });
    },
  });

  const toggleFriend = (id: string) =>
    setSelectedFriends(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);

  const toggleMatch = (id: string) =>
    setSelectedMatchIds(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);

  const invitations = (tournaments as any[]).filter((t: any) =>
    t.participants?.some((p: any) => p.userId === user?.id && p.status === 'INVITED')
  );
  const myTournaments = (tournaments as any[]).filter((t: any) =>
    !invitations.find((i: any) => i.id === t.id)
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appColors.background }]} edges={['top']}>
      <LinearGradient colors={['#1A237E', '#283593']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={26} color="white" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Torneos entre amigos</Text>
          <Text style={styles.headerSub}>
            {invitations.length > 0 ? `${invitations.length} invitación(es) pendiente(s)` : 'Competí con tus amigos'}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setShowCreate(true)}>
          <Ionicons name="add-circle" size={28} color="white" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : tournaments.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="trophy-outline" size={48} color={appColors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: appColors.text }]}>Sin torneos todavía</Text>
            <Text style={[styles.emptySub, { color: appColors.textSecondary }]}>
              Tocá + para crear un torneo e invitar a tus amigos
            </Text>
            <TouchableOpacity
              style={[styles.createBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowCreate(true)}
            >
              <Text style={styles.createBtnText}>Crear torneo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {invitations.length > 0 && (
              <Text style={[styles.sectionLabel, { color: appColors.textSecondary }]}>INVITACIONES</Text>
            )}
            {invitations.map((t: any) => (
              <TournamentCard
                key={t.id}
                tournament={t}
                userId={user?.id}
                onRespond={(id, accept) => respondMutation.mutate({ id, accept })}
              />
            ))}
            {myTournaments.length > 0 && (
              <Text style={[styles.sectionLabel, { color: appColors.textSecondary, marginTop: invitations.length > 0 ? spacing.base : 0 }]}>
                MIS TORNEOS
              </Text>
            )}
            {myTournaments.map((t: any) => (
              <TournamentCard
                key={t.id}
                tournament={t}
                userId={user?.id}
                onRespond={(id, accept) => respondMutation.mutate({ id, accept })}
              />
            ))}
          </>
        )}
      </ScrollView>

      {/* Create Tournament Modal */}
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setShowCreate(false)} />
        <View style={[styles.sheet, { backgroundColor: appColors.surface }]}>
          <Text style={[styles.sheetTitle, { color: appColors.text }]}>🏆 Crear torneo</Text>

          <TextInput
            style={[styles.nameInput, { backgroundColor: appColors.background, borderColor: appColors.border, color: appColors.text }]}
            value={tournamentName}
            onChangeText={setTournamentName}
            placeholder="Nombre del torneo"
            placeholderTextColor={appColors.textSecondary}
            maxLength={40}
          />

          <Text style={[styles.subLabel, { color: appColors.textSecondary }]}>
            Partidos ({selectedMatchIds.length} seleccionados)
          </Text>
          <FlatList
            data={upcomingMatches.slice(0, 15)}
            keyExtractor={(item: any) => item.id}
            style={{ maxHeight: 140 }}
            renderItem={({ item }: { item: any }) => {
              const selected = selectedMatchIds.includes(item.id);
              return (
                <TouchableOpacity
                  style={[styles.matchItem, { borderColor: appColors.border }, selected && { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}
                  onPress={() => toggleMatch(item.id)}
                >
                  <Text style={[styles.matchText, { color: appColors.text }]} numberOfLines={1}>
                    {item.homeTeam?.name ?? '?'} vs {item.awayTeam?.name ?? '?'}
                  </Text>
                  {selected && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
                </TouchableOpacity>
              );
            }}
          />

          <Text style={[styles.subLabel, { color: appColors.textSecondary, marginTop: spacing.sm }]}>
            Invitar amigos ({selectedFriends.length} seleccionados)
          </Text>
          <FlatList
            data={friends as any[]}
            keyExtractor={(item: any) => item.id}
            style={{ maxHeight: 120 }}
            renderItem={({ item }: { item: any }) => {
              const selected = selectedFriends.includes(item.id);
              return (
                <TouchableOpacity
                  style={[styles.friendItem, { borderColor: appColors.border }, selected && { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}
                  onPress={() => toggleFriend(item.id)}
                >
                  <Text style={[styles.friendName, { color: appColors.text }]} numberOfLines={1}>
                    {item.displayName ?? item.username}
                  </Text>
                  {selected && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <Text style={{ color: appColors.textSecondary, fontSize: 12, paddingVertical: 8 }}>
                Agregá amigos primero para invitarlos
              </Text>
            }
          />

          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: colors.primary, marginTop: spacing.base }, createMutation.isPending && { opacity: 0.6 }]}
            onPress={() => createMutation.mutate()}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending
              ? <ActivityIndicator color="white" size={16} />
              : <Text style={styles.createBtnText}>Crear torneo</Text>}
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: spacing.screen, paddingBottom: spacing.lg, gap: spacing.sm },
  headerCenter: { flex: 1 },
  headerTitle: { color: 'white', fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: typography.fontSize.xs },
  list: { padding: spacing.screen, paddingBottom: 40 },
  sectionLabel: { fontSize: 11, fontFamily: typography.fontFamily.bold, letterSpacing: 0.8, marginBottom: spacing.sm },
  empty: { alignItems: 'center', paddingVertical: 60, gap: spacing.sm },
  emptyTitle: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.bold },
  emptySub: { fontSize: 13, textAlign: 'center', maxWidth: 260 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: spacing.screen, paddingBottom: 36, maxHeight: '90%',
  },
  sheetTitle: { fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold, marginBottom: spacing.base },
  nameInput: {
    borderWidth: 1, borderRadius: borderRadius.base, padding: spacing.sm,
    fontSize: typography.fontSize.base, marginBottom: spacing.base,
  },
  subLabel: { fontSize: 12, fontFamily: typography.fontFamily.semiBold, marginBottom: 6 },
  matchItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
    paddingHorizontal: spacing.sm, borderWidth: 1, borderRadius: borderRadius.base,
    marginBottom: 4,
  },
  matchText: { flex: 1, fontSize: 13 },
  friendItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
    paddingHorizontal: spacing.sm, borderWidth: 1, borderRadius: borderRadius.base,
    marginBottom: 4,
  },
  friendName: { flex: 1, fontSize: 13 },
  createBtn: { borderRadius: borderRadius.base, paddingVertical: 14, alignItems: 'center' },
  createBtnText: { color: 'white', fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.base },
});
