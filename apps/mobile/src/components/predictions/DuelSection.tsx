import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, Alert, FlatList,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { showMessage } from 'react-native-flash-message';

import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useAppTheme } from '../../hooks/useAppTheme';
import { apiService } from '../../services/api';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';

interface DuelSectionProps {
  matchId: string;
  matchStatus: string;
  homeTeam: { shortName?: string; code: string };
  awayTeam: { shortName?: string; code: string };
}

function ScoreTag({ score, color }: { score: string; color: string }) {
  return (
    <View style={[scoreTagStyles.wrap, { borderColor: color }]}>
      <Text style={[scoreTagStyles.txt, { color }]}>{score}</Text>
    </View>
  );
}
const scoreTagStyles = StyleSheet.create({
  wrap: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  txt: { fontSize: 13, fontFamily: 'bold' },
});

export function DuelSection({ matchId, matchStatus, homeTeam, awayTeam }: DuelSectionProps) {
  const { appColors } = useAppTheme();
  const queryClient = useQueryClient();
  const { user } = useSelector((state: RootState) => state.auth);
  const isScheduled = matchStatus === 'SCHEDULED';

  // My active duels for this match
  const { data: myDuels = [], isLoading } = useQuery({
    queryKey: ['duels-active'],
    queryFn: async () => {
      const r = await apiService.get('/duels');
      return (r.data.data ?? []) as any[];
    },
    staleTime: 30_000,
  });

  const matchDuels = myDuels.filter((d: any) => d.matchId === matchId);

  // Friends for picking an opponent
  const { data: friends = [] } = useQuery({
    queryKey: ['friends-list'],
    queryFn: async () => {
      const r = await apiService.get('/friends');
      return (r.data.data ?? []) as any[];
    },
    staleTime: 5 * 60_000,
    enabled: isScheduled,
  });

  const [showChallenge, setShowChallenge] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [pickHome, setPickHome] = useState('');
  const [pickAway, setPickAway] = useState('');
  const [friendSearch, setFriendSearch] = useState('');
  const [xpBet, setXpBet] = useState(0);

  const filteredFriends = (friends as any[]).filter((f: any) => {
    const name = (f.displayName ?? f.username ?? '').toLowerCase();
    return friendSearch === '' || name.includes(friendSearch.toLowerCase());
  });

  const challengeMutation = useMutation({
    mutationFn: async () => {
      const ph = parseInt(pickHome, 10);
      const pa = parseInt(pickAway, 10);
      if (isNaN(ph) || isNaN(pa)) throw new Error('Score inválido');
      await apiService.post('/duels', {
        matchId,
        opponentId: selectedFriend.id,
        challengerPick: `${ph}-${pa}`,
        xpBet,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['duels-active'] });
      showMessage({ message: `¡Desafío enviado a ${selectedFriend?.displayName ?? selectedFriend?.username}!`, type: 'success' });
      setShowChallenge(false);
      setSelectedFriend(null);
      setPickHome('');
      setPickAway('');
      setXpBet(0);
    },
    onError: (e: any) => showMessage({ message: e?.response?.data?.error ?? 'Error al enviar desafío', type: 'danger' }),
  });

  const acceptMutation = useMutation({
    mutationFn: async ({ duelId, pick }: { duelId: string; pick: string }) => {
      await apiService.post(`/duels/${duelId}/accept`, { opponentPick: pick });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['duels-active'] });
      showMessage({ message: '¡Duelo aceptado!', type: 'success' });
    },
    onError: (e: any) => showMessage({ message: e?.response?.data?.error ?? 'Error', type: 'danger' }),
  });

  const declineMutation = useMutation({
    mutationFn: async (duelId: string) => {
      await apiService.post(`/duels/${duelId}/decline`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['duels-active'] });
      showMessage({ message: 'Duelo rechazado', type: 'info' });
    },
  });

  const [acceptDuel, setAcceptDuel] = useState<any>(null);
  const [acceptHome, setAcceptHome] = useState('');
  const [acceptAway, setAcceptAway] = useState('');

  const handleAccept = (duel: any) => {
    setAcceptDuel(duel);
    setAcceptHome('');
    setAcceptAway('');
  };

  const confirmAccept = () => {
    const ph = parseInt(acceptHome, 10);
    const pa = parseInt(acceptAway, 10);
    if (isNaN(ph) || isNaN(pa)) {
      Alert.alert('Score inválido', 'Ingresá un pronóstico válido');
      return;
    }
    acceptMutation.mutate({ duelId: acceptDuel.id, pick: `${ph}-${pa}` });
    setAcceptDuel(null);
  };

  const S = StyleSheet.create({
    container: { marginTop: spacing.base },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
    sectionTitle: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.bold, color: appColors.text },
    challengeBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: colors.primary + '20', borderRadius: borderRadius.full,
      paddingHorizontal: spacing.sm, paddingVertical: 4,
    },
    challengeBtnText: { fontSize: 12, color: colors.primary, fontFamily: typography.fontFamily.semiBold },

    duelCard: {
      backgroundColor: appColors.surface, borderRadius: borderRadius.lg,
      padding: spacing.sm, marginBottom: spacing.sm, ...shadows.sm,
    },
    duelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    duelName: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.semiBold, color: appColors.text, flex: 1 },
    statusBadge: { borderRadius: borderRadius.full, paddingHorizontal: 8, paddingVertical: 2 },
    statusText: { fontSize: 10, fontFamily: typography.fontFamily.bold },
    picksRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 6 },
    pickLabel: { fontSize: 11, color: appColors.textSecondary },
    actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    acceptBtn: { flex: 1, backgroundColor: '#10B981', borderRadius: borderRadius.base, paddingVertical: 8, alignItems: 'center' },
    declineBtn: { flex: 1, backgroundColor: appColors.border, borderRadius: borderRadius.base, paddingVertical: 8, alignItems: 'center' },
    actionText: { fontSize: 12, fontFamily: typography.fontFamily.bold, color: 'white' },

    empty: { alignItems: 'center', paddingVertical: spacing.xl },
    emptyText: { color: appColors.textSecondary, fontSize: 13 },

    // Modal
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: {
      backgroundColor: appColors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
      padding: spacing.screen, paddingBottom: 40, maxHeight: '80%',
    },
    sheetTitle: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.bold, color: appColors.text, marginBottom: spacing.base },
    scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.base, marginBottom: spacing.base },
    scoreInput: {
      width: 60, height: 48, borderRadius: borderRadius.base,
      backgroundColor: appColors.background, borderWidth: 1, borderColor: appColors.border,
      textAlign: 'center', fontSize: 22, fontFamily: typography.fontFamily.bold, color: appColors.text,
    },
    scoreDash: { fontSize: 24, color: appColors.textSecondary },
    friendSearch: {
      backgroundColor: appColors.background, borderRadius: borderRadius.base,
      borderWidth: 1, borderColor: appColors.border, paddingHorizontal: spacing.sm, paddingVertical: 8,
      color: appColors.text, marginBottom: spacing.sm,
    },
    friendItem: {
      flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth, borderColor: appColors.border,
    },
    friendName: { fontSize: typography.fontSize.sm, color: appColors.text, flex: 1 },
    friendSelected: { backgroundColor: colors.primary + '15', borderRadius: borderRadius.base, paddingHorizontal: 8 },
    sendBtn: {
      backgroundColor: colors.primary, borderRadius: borderRadius.base,
      paddingVertical: 14, alignItems: 'center', marginTop: spacing.base,
    },
    sendBtnText: { color: 'white', fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.base },
  });

  return (
    <View style={S.container}>
      <View style={S.sectionHeader}>
        <Text style={S.sectionTitle}>⚔️ Duelos 1v1</Text>
        {isScheduled && (
          <TouchableOpacity style={S.challengeBtn} onPress={() => setShowChallenge(true)}>
            <MaterialCommunityIcons name="sword-cross" size={14} color={colors.primary} />
            <Text style={S.challengeBtnText}>Desafiar amigo</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : matchDuels.length === 0 ? (
        <View style={S.empty}>
          <MaterialCommunityIcons name="sword-cross" size={32} color={appColors.textSecondary} />
          <Text style={S.emptyText}>Ningún duelo activo para este partido</Text>
          {isScheduled && (
            <Text style={[S.emptyText, { fontSize: 11, marginTop: 4 }]}>
              Desafiá a un amigo a predecir el resultado
            </Text>
          )}
        </View>
      ) : (
        matchDuels.map((duel: any) => {
          const amChallenger = duel.challengerId === user?.id;
          const amOpponent   = duel.opponentId   === user?.id;
          const statusColor = duel.status === 'PENDING' ? '#F59E0B' : duel.status === 'ACCEPTED' ? '#10B981' : '#6B7280';

          return (
            <View key={duel.id} style={S.duelCard}>
              <View style={S.duelRow}>
                <MaterialCommunityIcons name="sword-cross" size={16} color={statusColor} style={{ marginRight: 6 }} />
                <Text style={S.duelName}>
                  {duel.challenger?.displayName ?? duel.challenger?.username} vs {duel.opponent?.displayName ?? duel.opponent?.username}
                </Text>
                <View style={[S.statusBadge, { backgroundColor: statusColor + '20' }]}>
                  <Text style={[S.statusText, { color: statusColor }]}>
                    {duel.status === 'PENDING' ? 'Pendiente' : duel.status === 'ACCEPTED' ? 'Aceptado' : duel.status}
                  </Text>
                </View>
              </View>

              <View style={S.picksRow}>
                <Text style={S.pickLabel}>{duel.challenger?.displayName}:</Text>
                {duel.challengerPick
                  ? <ScoreTag score={duel.challengerPick} color={colors.primary} />
                  : <Text style={S.pickLabel}>-</Text>}
                <Text style={S.pickLabel}>{duel.opponent?.displayName}:</Text>
                {duel.opponentPick
                  ? <ScoreTag score={duel.opponentPick} color="#9C27B0" />
                  : <Text style={S.pickLabel}>Pendiente</Text>}
              </View>
              {duel.xpBet > 0 && (
                <Text style={[S.pickLabel, { color: '#F59E0B', marginTop: 4 }]}>⚡ {duel.xpBet} XP en juego</Text>
              )}

              {/* Only opponent sees Accept/Decline on PENDING duels */}
              {duel.status === 'PENDING' && amOpponent && (
                <View style={S.actionRow}>
                  <TouchableOpacity style={S.acceptBtn} onPress={() => handleAccept(duel)}>
                    <Text style={S.actionText}>Aceptar y apostar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={S.declineBtn} onPress={() => declineMutation.mutate(duel.id)}>
                    <Text style={[S.actionText, { color: appColors.text }]}>Rechazar</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Challenger sees waiting message */}
              {duel.status === 'PENDING' && amChallenger && (
                <Text style={[S.pickLabel, { marginTop: 6, fontStyle: 'italic' }]}>
                  Esperando respuesta de {duel.opponent?.displayName ?? duel.opponent?.username}…
                </Text>
              )}
            </View>
          );
        })
      )}

      {/* Challenge Modal */}
      <Modal visible={showChallenge} transparent animationType="slide" onRequestClose={() => setShowChallenge(false)}>
        <TouchableOpacity style={S.backdrop} activeOpacity={1} onPress={() => setShowChallenge(false)} />
        <View style={S.sheet}>
          <Text style={S.sheetTitle}>⚔️ Desafiar a un amigo</Text>

          <Text style={{ color: appColors.textSecondary, fontSize: 12, marginBottom: spacing.sm }}>
            Tu pronóstico ({homeTeam.shortName ?? homeTeam.code} vs {awayTeam.shortName ?? awayTeam.code})
          </Text>
          <View style={S.scoreRow}>
            <TextInput
              style={S.scoreInput}
              value={pickHome}
              onChangeText={setPickHome}
              keyboardType="numeric"
              maxLength={2}
              placeholder="0"
              placeholderTextColor={appColors.textSecondary}
            />
            <Text style={S.scoreDash}>-</Text>
            <TextInput
              style={S.scoreInput}
              value={pickAway}
              onChangeText={setPickAway}
              keyboardType="numeric"
              maxLength={2}
              placeholder="0"
              placeholderTextColor={appColors.textSecondary}
            />
          </View>

          {/* XP Bet */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm, paddingHorizontal: 4 }}>
            <Text style={{ color: appColors.textSecondary, fontSize: 12 }}>⚡ Apostar XP (opcional)</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity onPress={() => setXpBet(Math.max(0, xpBet - 10))}>
                <Text style={{ fontSize: 20, color: appColors.textSecondary, fontFamily: typography.fontFamily.bold }}>−</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 16, fontFamily: typography.fontFamily.bold, color: xpBet > 0 ? '#F59E0B' : appColors.textSecondary, minWidth: 36, textAlign: 'center' }}>
                {xpBet} XP
              </Text>
              <TouchableOpacity onPress={() => setXpBet(xpBet + 10)}>
                <Text style={{ fontSize: 20, color: colors.primary, fontFamily: typography.fontFamily.bold }}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TextInput
            style={S.friendSearch}
            value={friendSearch}
            onChangeText={setFriendSearch}
            placeholder="Buscar amigo..."
            placeholderTextColor={appColors.textSecondary}
          />

          <FlatList
            data={filteredFriends}
            keyExtractor={(item: any) => item.id}
            style={{ maxHeight: 200 }}
            renderItem={({ item }: { item: any }) => (
              <TouchableOpacity
                style={[S.friendItem, selectedFriend?.id === item.id && S.friendSelected]}
                onPress={() => setSelectedFriend(item)}
              >
                <Text style={S.friendName}>{item.displayName ?? item.username}</Text>
                {selectedFriend?.id === item.id && (
                  <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={{ color: appColors.textSecondary, fontSize: 13, textAlign: 'center', paddingVertical: 12 }}>
                Sin amigos para desafiar
              </Text>
            }
          />

          <TouchableOpacity
            style={[S.sendBtn, (!selectedFriend || challengeMutation.isPending) && { opacity: 0.6 }]}
            onPress={() => challengeMutation.mutate()}
            disabled={!selectedFriend || challengeMutation.isPending}
          >
            {challengeMutation.isPending
              ? <ActivityIndicator color="white" size={16} />
              : <Text style={S.sendBtnText}>Enviar Desafío</Text>}
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Accept Duel Modal */}
      <Modal visible={!!acceptDuel} transparent animationType="slide" onRequestClose={() => setAcceptDuel(null)}>
        <TouchableOpacity style={S.backdrop} activeOpacity={1} onPress={() => setAcceptDuel(null)} />
        <View style={S.sheet}>
          <Text style={S.sheetTitle}>Aceptar desafío de {acceptDuel?.challenger?.displayName}</Text>
          <Text style={{ color: appColors.textSecondary, fontSize: 12, marginBottom: spacing.sm }}>
            Su pronóstico: {acceptDuel?.challengerPick}  ·  Tu pronóstico:
          </Text>
          <View style={S.scoreRow}>
            <TextInput
              style={S.scoreInput}
              value={acceptHome}
              onChangeText={setAcceptHome}
              keyboardType="numeric"
              maxLength={2}
              placeholder="0"
              placeholderTextColor={appColors.textSecondary}
            />
            <Text style={S.scoreDash}>-</Text>
            <TextInput
              style={S.scoreInput}
              value={acceptAway}
              onChangeText={setAcceptAway}
              keyboardType="numeric"
              maxLength={2}
              placeholder="0"
              placeholderTextColor={appColors.textSecondary}
            />
          </View>
          <TouchableOpacity
            style={[S.sendBtn, acceptMutation.isPending && { opacity: 0.6 }]}
            onPress={confirmAccept}
            disabled={acceptMutation.isPending}
          >
            {acceptMutation.isPending
              ? <ActivityIndicator color="white" size={16} />
              : <Text style={S.sendBtnText}>Confirmar y aceptar</Text>}
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}
