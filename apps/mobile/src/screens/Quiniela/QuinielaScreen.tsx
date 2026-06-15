import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  Alert, Modal, Share, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { apiService } from '../../services/api';
import { useAppTheme } from '../../hooks/useAppTheme';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';

const PRESET_PRIZES = [
  { label: '🥩 Asado', value: 'Asado' },
  { label: '🍾 Fernet+Coca', value: 'Fernet+Coca' },
  { label: '🍺 Ronda de birras', value: 'Ronda de birras' },
  { label: '🥤 Coca', value: 'Coca' },
  { label: '🍕 Pizza', value: 'Pizza' },
];

export function QuinielaScreen() {
  const { appColors } = useAppTheme();
  const queryClient = useQueryClient();
  const navigation = useNavigation<any>();

  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  // Create form state
  const [newName, setNewName] = useState('');
  const [selectedPrize, setSelectedPrize] = useState<string | null>(null);
  const [customPrize, setCustomPrize] = useState('');
  const [matchPrizeEnabled, setMatchPrizeEnabled] = useState(false);
  const [selectedMatchPrize, setSelectedMatchPrize] = useState<string | null>(null);
  const [customMatchPrize, setCustomMatchPrize] = useState('');

  const [joinCode, setJoinCode] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['quinielas'],
    queryFn: async () => (await apiService.get('/quiniela')).data.data ?? [],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const prize = selectedPrize === 'custom' ? customPrize.trim() : selectedPrize;
      const mPrize = selectedMatchPrize === 'custom' ? customMatchPrize.trim() : selectedMatchPrize;
      return (await apiService.post('/quiniela', {
        name: newName,
        prizeDescription: prize || undefined,
        matchPrizeEnabled,
        matchPrizeDefault: matchPrizeEnabled ? (mPrize || undefined) : undefined,
      })).data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quinielas'] });
      setShowCreate(false);
      resetCreateForm();
    },
    onError: (e: any) => Alert.alert('Error', e.response?.data?.message ?? 'No se pudo crear'),
  });

  const joinMutation = useMutation({
    mutationFn: async () => (await apiService.post('/quiniela/join', { inviteCode: joinCode.trim().toUpperCase() })).data.data,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['quinielas'] }); setShowJoin(false); setJoinCode(''); },
    onError: (e: any) => Alert.alert('Error', e.response?.data?.message ?? 'Código inválido'),
  });

  const resetCreateForm = () => {
    setNewName('');
    setSelectedPrize(null);
    setCustomPrize('');
    setMatchPrizeEnabled(false);
    setSelectedMatchPrize(null);
    setCustomMatchPrize('');
  };

  const handleShare = async (code: string, name: string, prize?: string) => {
    const link = `https://shinracode.github.io/ShinraFixture2026/quiniela/join/?code=${code}`;
    await Share.share({
      message: `¡Únete a mi quiniela "${name}" en ShinraFixture 2026!\n${link}${prize ? `\nPremio: ${prize}` : ''}`,
      url: link,
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appColors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: appColors.border }]}>
        <Text style={[styles.title, { color: appColors.text }]}>Quinielas</Text>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setShowJoin(true)}>
            <Ionicons name="enter-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={() => setShowCreate(true)}>
            <Ionicons name="add" size={18} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading && !data && (
        <View style={styles.skeletonList}>
          {[0, 1, 2].map(i => (
            <View key={i} style={[styles.skeletonCard, { backgroundColor: appColors.surface }]}>
              <LoadingSkeleton width="60%" height={18} style={{ marginBottom: 8 }} />
              <LoadingSkeleton width="40%" height={13} />
            </View>
          ))}
        </View>
      )}

      <FlatList
        data={data ?? []}
        keyExtractor={(g: any) => g.id}
        refreshing={false}
        onRefresh={refetch}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons name="account-group" size={64} color={appColors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: appColors.text }]}>No tienes quinielas</Text>
            <Text style={[styles.emptySub, { color: appColors.textSecondary }]}>Crea una o únete con un código</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowCreate(true)}>
              <Text style={styles.emptyBtnText}>Crear quiniela</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }: { item: any }) => {
          const myMember = item.members?.[0];
          return (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: appColors.surface }]}
              onPress={() => navigation.navigate('QuinielaDetail', { quinielaId: item.id })}
              activeOpacity={0.85}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardInfo}>
                  <Text style={[styles.cardName, { color: appColors.text }]}>{item.name}</Text>
                  <Text style={[styles.cardMeta, { color: appColors.textSecondary }]}>
                    {item._count?.members ?? item.members?.length ?? 0} / {item.maxMembers} miembros
                  </Text>
                </View>
                {myMember?.rank && (
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>#{myMember.rank}</Text>
                  </View>
                )}
              </View>

              {item.prizeDescription && (
                <View style={styles.prizeRow}>
                  <MaterialCommunityIcons name="trophy" size={13} color={colors.accent} />
                  <Text style={[styles.prizeText, { color: appColors.textSecondary }]} numberOfLines={1}>
                    {item.prizeDescription}
                  </Text>
                </View>
              )}

              {item.matchPrizeEnabled && item.matchPrizeDefault && (
                <View style={styles.prizeRow}>
                  <MaterialCommunityIcons name="soccer" size={13} color={appColors.textSecondary} />
                  <Text style={[styles.prizeText, { color: appColors.textSecondary }]} numberOfLines={1}>
                    Por partido: {item.matchPrizeDefault}
                  </Text>
                </View>
              )}

              <View style={styles.pointsRow}>
                <MaterialCommunityIcons name="star" size={14} color={colors.accent} />
                <Text style={[styles.points, { color: appColors.text }]}>{myMember?.totalPoints ?? 0} pts</Text>
              </View>

              <View style={[styles.codeRow, { borderTopColor: appColors.border }]}>
                <Text style={[styles.codeLabel, { color: appColors.textSecondary }]}>Código:</Text>
                <Text style={[styles.codeValue, { color: colors.primary }]}>{item.inviteCode}</Text>
                <TouchableOpacity onPress={() => handleShare(item.inviteCode, item.name, item.prizeDescription)}>
                  <Ionicons name="share-social-outline" size={18} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* ── CREATE MODAL ── */}
      <Modal visible={showCreate} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: appColors.surface }]}>
            <Text style={[styles.modalTitle, { color: appColors.text }]}>Nueva quiniela</Text>

            <TextInput
              style={[styles.modalInput, { color: appColors.text, borderColor: appColors.border }]}
              placeholder="Nombre del grupo (ej: Los pibes del barrio)"
              placeholderTextColor={appColors.textSecondary}
              value={newName}
              onChangeText={setNewName}
              autoFocus
              maxLength={60}
            />

            {/* Tournament prize */}
            <Text style={[styles.sectionLabel, { color: appColors.text }]}>🏆 Premio del torneo</Text>
            <View style={styles.presetGrid}>
              {PRESET_PRIZES.map((p) => (
                <TouchableOpacity
                  key={p.value}
                  style={[
                    styles.presetChip,
                    { borderColor: appColors.border, backgroundColor: appColors.surfaceSecondary },
                    selectedPrize === p.value && { borderColor: colors.primary, backgroundColor: colors.primary + '22' },
                  ]}
                  onPress={() => { setSelectedPrize(p.value); setCustomPrize(''); }}
                >
                  <Text style={[styles.presetText, { color: selectedPrize === p.value ? colors.primary : appColors.text }]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[
                  styles.presetChip,
                  { borderColor: appColors.border, backgroundColor: appColors.surfaceSecondary },
                  selectedPrize === 'custom' && { borderColor: colors.primary, backgroundColor: colors.primary + '22' },
                ]}
                onPress={() => setSelectedPrize('custom')}
              >
                <Text style={[styles.presetText, { color: selectedPrize === 'custom' ? colors.primary : appColors.text }]}>
                  ✏️ Otro
                </Text>
              </TouchableOpacity>
            </View>
            {selectedPrize === 'custom' && (
              <TextInput
                style={[styles.modalInput, { color: appColors.text, borderColor: appColors.border }]}
                placeholder="Describí el premio..."
                placeholderTextColor={appColors.textSecondary}
                value={customPrize}
                onChangeText={setCustomPrize}
                maxLength={80}
              />
            )}

            {/* Per-match prize toggle */}
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={[styles.switchLabel, { color: appColors.text }]}>⚽ Mini-apuesta por partido</Text>
                <Text style={[styles.switchSub, { color: appColors.textSecondary }]}>
                  Cada partido tiene su propia apuesta
                </Text>
              </View>
              <Switch
                value={matchPrizeEnabled}
                onValueChange={setMatchPrizeEnabled}
                trackColor={{ true: colors.primary }}
                thumbColor="white"
              />
            </View>

            {matchPrizeEnabled && (
              <>
                <Text style={[styles.sectionLabel, { color: appColors.text }]}>Premio por defecto (por partido)</Text>
                <View style={styles.presetGrid}>
                  {PRESET_PRIZES.map((p) => (
                    <TouchableOpacity
                      key={p.value}
                      style={[
                        styles.presetChip,
                        { borderColor: appColors.border, backgroundColor: appColors.surfaceSecondary },
                        selectedMatchPrize === p.value && { borderColor: colors.accent, backgroundColor: colors.accent + '22' },
                      ]}
                      onPress={() => { setSelectedMatchPrize(p.value); setCustomMatchPrize(''); }}
                    >
                      <Text style={[styles.presetText, { color: selectedMatchPrize === p.value ? colors.accent : appColors.text }]}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={[
                      styles.presetChip,
                      { borderColor: appColors.border, backgroundColor: appColors.surfaceSecondary },
                      selectedMatchPrize === 'custom' && { borderColor: colors.accent, backgroundColor: colors.accent + '22' },
                    ]}
                    onPress={() => setSelectedMatchPrize('custom')}
                  >
                    <Text style={[styles.presetText, { color: selectedMatchPrize === 'custom' ? colors.accent : appColors.text }]}>
                      ✏️ Otro
                    </Text>
                  </TouchableOpacity>
                </View>
                {selectedMatchPrize === 'custom' && (
                  <TextInput
                    style={[styles.modalInput, { color: appColors.text, borderColor: appColors.border }]}
                    placeholder="Ej: El perdedor paga una birra..."
                    placeholderTextColor={appColors.textSecondary}
                    value={customMatchPrize}
                    onChangeText={setCustomMatchPrize}
                    maxLength={80}
                  />
                )}
              </>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: appColors.surfaceSecondary }]}
                onPress={() => { setShowCreate(false); resetCreateForm(); }}
              >
                <Text style={{ color: appColors.text }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }, !newName.trim() && { opacity: 0.5 }]}
                onPress={() => createMutation.mutate()}
                disabled={!newName.trim() || createMutation.isPending}
              >
                <Text style={{ color: 'white', fontFamily: typography.fontFamily.bold }}>Crear</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── JOIN MODAL ── */}
      <Modal visible={showJoin} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: appColors.surface }]}>
            <Text style={[styles.modalTitle, { color: appColors.text }]}>Unirse a quiniela</Text>
            <TextInput
              style={[styles.modalInput, { color: appColors.text, borderColor: appColors.border }]}
              placeholder="Código de invitación"
              placeholderTextColor={appColors.textSecondary}
              value={joinCode}
              onChangeText={setJoinCode}
              autoCapitalize="characters"
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: appColors.surfaceSecondary }]} onPress={() => { setShowJoin(false); setJoinCode(''); }}>
                <Text style={{ color: appColors.text }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }, !joinCode.trim() && { opacity: 0.5 }]}
                onPress={() => joinMutation.mutate()}
                disabled={!joinCode.trim() || joinMutation.isPending}
              >
                <Text style={{ color: 'white', fontFamily: typography.fontFamily.bold }}>Unirse</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.base, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.bold },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.primary },
  list: { padding: spacing.base, gap: spacing.sm, paddingBottom: 80 },
  skeletonList: { padding: spacing.base, gap: spacing.sm },
  skeletonCard: { borderRadius: borderRadius.lg, padding: spacing.base },
  empty: { alignItems: 'center', paddingTop: 60, gap: spacing.base },
  emptyTitle: { fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.bold },
  emptySub: { fontSize: typography.fontSize.sm },
  emptyBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, borderRadius: borderRadius.full },
  emptyBtnText: { color: 'white', fontFamily: typography.fontFamily.bold },
  card: { borderRadius: borderRadius.lg, padding: spacing.base, gap: spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.bold },
  cardMeta: { fontSize: typography.fontSize.xs },
  rankBadge: { backgroundColor: colors.primary, borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  rankText: { color: 'white', fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.bold },
  prizeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  prizeText: { fontSize: typography.fontSize.xs, flex: 1 },
  pointsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  points: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.medium },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
  codeLabel: { fontSize: typography.fontSize.xs },
  codeValue: { flex: 1, fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.bold },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, padding: spacing.xl, gap: spacing.base, maxHeight: '90%' },
  modalTitle: { fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold },
  modalInput: { borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.base, fontSize: typography.fontSize.base },
  sectionLabel: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.semiBold },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  presetChip: { paddingHorizontal: spacing.base, paddingVertical: spacing.sm, borderRadius: borderRadius.full, borderWidth: 1.5 },
  presetText: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.medium },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.base },
  switchInfo: { flex: 1 },
  switchLabel: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.semiBold },
  switchSub: { fontSize: 11 },
  modalActions: { flexDirection: 'row', gap: spacing.sm },
  modalBtn: { flex: 1, padding: spacing.base, borderRadius: borderRadius.md, alignItems: 'center' },
});
