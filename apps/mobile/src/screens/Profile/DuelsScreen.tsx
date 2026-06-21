import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
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

type DuelTab = 'pending' | 'active' | 'history';

const STATUS_COLOR: Record<string, string> = {
  PENDING: '#F59E0B',
  ACCEPTED: '#3B82F6',
  RESOLVED: '#10B981',
  DECLINED: '#6B7280',
  EXPIRED: '#6B7280',
};
const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  ACCEPTED: 'En juego',
  RESOLVED: 'Resuelto',
  DECLINED: 'Rechazado',
  EXPIRED: 'Expirado',
};

function DuelCard({ duel, userId, onAccept, onDecline }: { duel: any; userId?: string; onAccept: (d: any) => void; onDecline: (id: string) => void }) {
  const { appColors } = useAppTheme();
  const isChallenger = duel.challengerId === userId;
  const opponent = isChallenger ? duel.opponent : duel.challenger;
  const statusColor = STATUS_COLOR[duel.status] ?? '#6B7280';
  const isWinner = duel.status === 'RESOLVED' && duel.winnerId === userId;
  const isLoser = duel.status === 'RESOLVED' && duel.winnerId !== null && duel.winnerId !== userId;
  const isTie = duel.status === 'RESOLVED' && duel.winnerId === null;

  const resultIcon = isWinner ? '🏆' : isLoser ? '😔' : isTie ? '🤝' : null;

  const home = duel.match?.homeTeam?.code ?? '?';
  const away = duel.match?.awayTeam?.code ?? '?';
  const actualScore = duel.match?.homeScore != null ? `${duel.match.homeScore}-${duel.match.awayScore}` : null;

  return (
    <View style={[S.duelCard, { backgroundColor: appColors.surface }, shadows.sm]}>
      {/* Match info */}
      <View style={S.matchRow}>
        <Text style={[S.matchTeams, { color: appColors.textSecondary }]}>{home} vs {away}</Text>
        <View style={[S.statusPill, { backgroundColor: statusColor + '20' }]}>
          <Text style={[S.statusText, { color: statusColor }]}>{STATUS_LABEL[duel.status]}</Text>
        </View>
      </View>

      {/* vs row */}
      <View style={S.vsRow}>
        <View style={S.playerSide}>
          <MaterialCommunityIcons name="sword" size={14} color={colors.primary} />
          <Text style={[S.playerName, { color: appColors.text }]} numberOfLines={1}>
            {duel.challenger?.displayName ?? duel.challenger?.username}
          </Text>
          {duel.challengerPick && (
            <View style={[S.pickBadge, { borderColor: colors.primary }]}>
              <Text style={[S.pickText, { color: colors.primary }]}>{duel.challengerPick}</Text>
            </View>
          )}
        </View>
        <Text style={[S.vsTxt, { color: appColors.textSecondary }]}>VS</Text>
        <View style={[S.playerSide, { alignItems: 'flex-end' }]}>
          <MaterialCommunityIcons name="shield" size={14} color="#9C27B0" />
          <Text style={[S.playerName, { color: appColors.text }]} numberOfLines={1}>
            {duel.opponent?.displayName ?? duel.opponent?.username}
          </Text>
          {duel.opponentPick ? (
            <View style={[S.pickBadge, { borderColor: '#9C27B0' }]}>
              <Text style={[S.pickText, { color: '#9C27B0' }]}>{duel.opponentPick}</Text>
            </View>
          ) : (
            <Text style={[S.pendingPick, { color: appColors.textSecondary }]}>—</Text>
          )}
        </View>
      </View>

      {/* XP bet indicator */}
      {duel.xpBet > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
          <Text style={{ fontSize: 12, color: '#F59E0B', fontFamily: typography.fontFamily.semiBold }}>
            ⚡ {duel.xpBet} XP en juego
          </Text>
        </View>
      )}

      {/* Result */}
      {duel.status === 'RESOLVED' && (
        <View style={S.resultRow}>
          <Text style={S.resultIcon}>{resultIcon}</Text>
          <Text style={[S.resultText, { color: isWinner ? '#10B981' : isLoser ? '#EF4444' : '#F59E0B' }]}>
            {isWinner ? `Ganaste${duel.xpBet > 0 ? ` +${duel.xpBet * 2} XP` : ''}` : isLoser ? 'Perdiste' : 'Empate'}{actualScore ? ` · Real: ${actualScore}` : ''}
          </Text>
        </View>
      )}

      {/* Accept / Decline buttons for opponent on PENDING duels */}
      {duel.status === 'PENDING' && !isChallenger && (
        <View style={S.actionRow}>
          <TouchableOpacity style={S.acceptBtn} onPress={() => onAccept(duel)}>
            <Text style={S.actionTxt}>Aceptar y apostar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[S.declineBtn, { backgroundColor: appColors.border }]} onPress={() => onDecline(duel.id)}>
            <Text style={[S.actionTxt, { color: appColors.text }]}>Rechazar</Text>
          </TouchableOpacity>
        </View>
      )}

      {duel.status === 'PENDING' && isChallenger && (
        <Text style={[S.waitingText, { color: appColors.textSecondary }]}>
          Esperando respuesta de {duel.opponent?.displayName ?? duel.opponent?.username}…
        </Text>
      )}
    </View>
  );
}

const S = StyleSheet.create({
  duelCard: { borderRadius: borderRadius.lg, padding: spacing.base, marginBottom: spacing.sm },
  matchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  matchTeams: { fontSize: 12, fontFamily: typography.fontFamily.medium },
  statusPill: { borderRadius: borderRadius.full, paddingHorizontal: 8, paddingVertical: 2 },
  statusText: { fontSize: 10, fontFamily: typography.fontFamily.bold },
  vsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  playerSide: { flex: 1, gap: 4 },
  playerName: { fontSize: 13, fontFamily: typography.fontFamily.semiBold, maxWidth: 110 },
  vsTxt: { fontSize: 11, fontFamily: typography.fontFamily.bold },
  pickBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  pickText: { fontSize: 13, fontFamily: typography.fontFamily.bold },
  pendingPick: { fontSize: 12 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#E5E7EB' },
  resultIcon: { fontSize: 16 },
  resultText: { fontSize: 13, fontFamily: typography.fontFamily.bold },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  acceptBtn: { flex: 1, backgroundColor: '#10B981', borderRadius: borderRadius.base, paddingVertical: 10, alignItems: 'center' },
  declineBtn: { flex: 1, borderRadius: borderRadius.base, paddingVertical: 10, alignItems: 'center' },
  actionTxt: { fontSize: 13, fontFamily: typography.fontFamily.bold, color: 'white' },
  waitingText: { fontSize: 11, marginTop: 6, fontStyle: 'italic' },
});

export function DuelsScreen() {
  const navigation = useNavigation<any>();
  const { appColors } = useAppTheme();
  const queryClient = useQueryClient();
  const { user } = useSelector((state: RootState) => state.auth);
  const [tab, setTab] = useState<DuelTab>('pending');
  const [acceptDuel, setAcceptDuel] = useState<any>(null);
  const [acceptHome, setAcceptHome] = useState('');
  const [acceptAway, setAcceptAway] = useState('');

  const { data: activeDuels = [], isLoading: loadingActive, refetch: refetchActive } = useQuery({
    queryKey: ['duels-active'],
    queryFn: async () => (await apiService.get('/duels')).data.data ?? [],
    staleTime: 30_000,
  });

  const { data: historyDuels = [], isLoading: loadingHistory, refetch: refetchHistory } = useQuery({
    queryKey: ['duels-history'],
    queryFn: async () => (await apiService.get('/duels/history')).data.data ?? [],
    staleTime: 60_000,
    enabled: tab === 'history',
  });

  const declineMutation = useMutation({
    mutationFn: async (duelId: string) => apiService.post(`/duels/${duelId}/decline`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['duels-active'] });
      showMessage({ message: 'Duelo rechazado', type: 'info' });
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async ({ duelId, pick }: { duelId: string; pick: string }) =>
      apiService.post(`/duels/${duelId}/accept`, { opponentPick: pick }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['duels-active'] });
      showMessage({ message: '¡Duelo aceptado!', type: 'success' });
      setAcceptDuel(null);
    },
    onError: (e: any) => showMessage({ message: e?.response?.data?.error ?? 'Error', type: 'danger' }),
  });

  const pending = (activeDuels as any[]).filter((d: any) => d.status === 'PENDING');
  const active  = (activeDuels as any[]).filter((d: any) => d.status === 'ACCEPTED');

  const wins   = (historyDuels as any[]).filter((d: any) => d.status === 'RESOLVED' && d.winnerId === user?.id).length;
  const losses = (historyDuels as any[]).filter((d: any) => d.status === 'RESOLVED' && d.winnerId !== null && d.winnerId !== user?.id).length;

  const isLoading = loadingActive || (tab === 'history' && loadingHistory);
  const onRefresh = () => { refetchActive(); if (tab === 'history') refetchHistory(); };

  const tabs: { key: DuelTab; label: string; count?: number }[] = [
    { key: 'pending', label: 'Pendientes', count: pending.length },
    { key: 'active',  label: 'En juego',   count: active.length },
    { key: 'history', label: 'Historial' },
  ];

  const displayed = tab === 'pending' ? pending : tab === 'active' ? active : (historyDuels as any[]);

  const confirmAccept = () => {
    const ph = parseInt(acceptHome, 10);
    const pa = parseInt(acceptAway, 10);
    if (isNaN(ph) || isNaN(pa)) return showMessage({ message: 'Score inválido', type: 'warning' });
    acceptMutation.mutate({ duelId: acceptDuel.id, pick: `${ph}-${pa}` });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appColors.background }]} edges={['top']}>
      <LinearGradient colors={['#1A237E', '#283593']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={26} color="white" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Mis Duelos</Text>
          <Text style={styles.headerSub}>{pending.length > 0 ? `${pending.length} esperando respuesta` : 'Desafiá a tus amigos'}</Text>
        </View>
        <MaterialCommunityIcons name="sword-cross" size={24} color="rgba(255,255,255,0.8)" />
      </LinearGradient>

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: appColors.border, backgroundColor: appColors.surface }]}>
        {tabs.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabItem, tab === t.key && { borderBottomWidth: 2, borderBottomColor: colors.primary }]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabLabel, { color: tab === t.key ? colors.primary : appColors.textSecondary }]}>
              {t.label}
            </Text>
            {t.count != null && t.count > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{t.count}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : displayed.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="sword-cross" size={48} color={appColors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: appColors.text }]}>
              {tab === 'pending' ? 'Sin duelos pendientes' : tab === 'active' ? 'Sin duelos en juego' : 'Sin historial'}
            </Text>
            <Text style={[styles.emptySub, { color: appColors.textSecondary }]}>
              {tab === 'pending'
                ? 'Nadie te ha desafiado todavía'
                : tab === 'active'
                ? 'Aceptá un desafío o desafiá a un amigo desde un partido'
                : 'Los duelos resueltos aparecerán acá'}
            </Text>
          </View>
        ) : (
          displayed.map((duel: any) => (
            <DuelCard
              key={duel.id}
              duel={duel}
              userId={user?.id}
              onAccept={setAcceptDuel}
              onDecline={(id) => declineMutation.mutate(id)}
            />
          ))
        )}
      </ScrollView>

      {/* Accept modal */}
      {acceptDuel && (
        <View style={[styles.acceptSheet, { backgroundColor: appColors.surface }]}>
          <Text style={[styles.acceptTitle, { color: appColors.text }]}>
            Aceptar desafío de {acceptDuel.challenger?.displayName}
          </Text>
          <Text style={[styles.acceptSub, { color: appColors.textSecondary }]}>
            Su pronóstico: {acceptDuel.challengerPick}  ·  Ingresá el tuyo:
          </Text>
          <View style={styles.scoreInputRow}>
            {(['acceptHome', 'acceptAway'] as const).map((field, idx) => (
              <React.Fragment key={field}>
                {idx === 1 && <Text style={[styles.scoreDash, { color: appColors.textSecondary }]}>-</Text>}
                <View style={[styles.scoreInput, { borderColor: appColors.border, backgroundColor: appColors.background }]}>
                  <Text
                    style={[styles.scoreInputText, { color: appColors.text }]}
                    onPress={() => {}}
                  >
                    {field === 'acceptHome' ? acceptHome || '0' : acceptAway || '0'}
                  </Text>
                  <View style={styles.steppers}>
                    <TouchableOpacity onPress={() => field === 'acceptHome'
                      ? setAcceptHome(String(Math.max(0, parseInt(acceptHome || '0', 10) + 1)))
                      : setAcceptAway(String(Math.max(0, parseInt(acceptAway || '0', 10) + 1)))
                    }>
                      <Text style={[styles.stepperBtn, { color: colors.primary }]}>+</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => field === 'acceptHome'
                      ? setAcceptHome(String(Math.max(0, parseInt(acceptHome || '0', 10) - 1)))
                      : setAcceptAway(String(Math.max(0, parseInt(acceptAway || '0', 10) - 1)))
                    }>
                      <Text style={[styles.stepperBtn, { color: appColors.textSecondary }]}>−</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </React.Fragment>
            ))}
          </View>
          <View style={styles.acceptActions}>
            <TouchableOpacity style={[styles.cancelBtn, { borderColor: appColors.border }]} onPress={() => setAcceptDuel(null)}>
              <Text style={[styles.cancelTxt, { color: appColors.textSecondary }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, acceptMutation.isPending && { opacity: 0.6 }]}
              onPress={confirmAccept}
              disabled={acceptMutation.isPending}
            >
              {acceptMutation.isPending
                ? <ActivityIndicator color="white" size={16} />
                : <Text style={styles.confirmTxt}>Confirmar</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: spacing.screen, paddingBottom: spacing.lg, gap: spacing.sm },
  headerCenter: { flex: 1 },
  headerTitle: { color: 'white', fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: typography.fontSize.xs },

  tabBar: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tabItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 4 },
  tabLabel: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.semiBold },
  tabBadge: { backgroundColor: colors.primary, borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tabBadgeText: { color: 'white', fontSize: 10, fontFamily: typography.fontFamily.bold },

  list: { padding: spacing.screen, paddingBottom: 40 },

  empty: { alignItems: 'center', paddingVertical: 60, gap: spacing.sm },
  emptyTitle: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.bold },
  emptySub: { fontSize: 13, textAlign: 'center', maxWidth: 260 },

  acceptSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: spacing.screen, paddingBottom: 32,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 12,
  },
  acceptTitle: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.bold, marginBottom: 4 },
  acceptSub: { fontSize: 12, marginBottom: spacing.base },
  scoreInputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.base, marginBottom: spacing.base },
  scoreInput: {
    width: 72, borderRadius: borderRadius.base, borderWidth: 1,
    alignItems: 'center', paddingVertical: spacing.sm,
  },
  scoreInputText: { fontSize: 28, fontFamily: typography.fontFamily.bold },
  scoreDash: { fontSize: 24 },
  steppers: { flexDirection: 'row', gap: spacing.base, marginTop: 2 },
  stepperBtn: { fontSize: 22, fontFamily: typography.fontFamily.bold },
  acceptActions: { flexDirection: 'row', gap: spacing.sm },
  cancelBtn: { flex: 1, borderWidth: 1, borderRadius: borderRadius.base, paddingVertical: 12, alignItems: 'center' },
  cancelTxt: { fontFamily: typography.fontFamily.semiBold },
  confirmBtn: { flex: 2, backgroundColor: '#10B981', borderRadius: borderRadius.base, paddingVertical: 12, alignItems: 'center' },
  confirmTxt: { color: 'white', fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.base },
});
