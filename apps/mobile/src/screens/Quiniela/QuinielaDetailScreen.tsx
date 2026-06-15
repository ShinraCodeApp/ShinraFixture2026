import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, Share, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import 'dayjs/locale/es';

import { useAppTheme } from '../../hooks/useAppTheme';
import { apiService } from '../../services/api';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { TeamLogo } from '../../components/common/TeamLogo';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

dayjs.locale('es');

const PRESET_PRIZES = [
  { label: '🥩 Asado', value: 'Asado' },
  { label: '🍾 Fernet+Coca', value: 'Fernet+Coca' },
  { label: '🍺 Ronda de birras', value: 'Ronda de birras' },
  { label: '🥤 Coca', value: 'Coca' },
  { label: '🍕 Pizza', value: 'Pizza' },
];

type Tab = 'standings' | 'matches';

export function QuinielaDetailScreen() {
  const { appColors } = useAppTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const queryClient = useQueryClient();
  const { language } = useSelector((state: RootState) => state.settings);

  const { quinielaId } = route.params as { quinielaId: string };

  const [activeTab, setActiveTab] = useState<Tab>('standings');
  const [showPrizeModal, setShowPrizeModal] = useState(false);
  const [showMatchPrizeModal, setShowMatchPrizeModal] = useState(false);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [customPrize, setCustomPrize] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const { data: group, isLoading } = useQuery({
    queryKey: ['quiniela', quinielaId],
    queryFn: async () => (await apiService.get(`/quiniela/${quinielaId}`)).data.data,
    staleTime: 30_000,
  });

  const { data: standings = [] } = useQuery({
    queryKey: ['quiniela-standings', quinielaId],
    queryFn: async () => (await apiService.get(`/quiniela/${quinielaId}/standings`)).data.data ?? [],
    staleTime: 30_000,
  });

  const { data: matches = [] } = useQuery({
    queryKey: ['matches-all', group?.tournamentId],
    queryFn: async () => {
      if (!group?.tournamentId) return [];
      const res = await apiService.get(`/matches?limit=200&tournamentId=${group.tournamentId}`);
      return res.data.data?.items ?? [];
    },
    enabled: !!group?.tournamentId,
    staleTime: 2 * 60_000,
  });

  const updateMutation = useMutation({
    mutationFn: async (patch: any) => (await apiService.patch(`/quiniela/${quinielaId}`, patch)).data.data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quiniela', quinielaId] }),
    onError: () => Alert.alert('Error', 'No se pudo guardar el cambio'),
  });

  const matchPrizeMap: Record<string, string> = (group?.matchPrizeCustom as any) ?? {};

  const getMatchPrize = (matchId: string) =>
    matchPrizeMap[matchId] || group?.matchPrizeDefault || null;

  const handleSaveTournamentPrize = () => {
    const prize = selectedPreset === 'custom' ? customPrize.trim() : selectedPreset;
    if (!prize) return;
    updateMutation.mutate({ prizeDescription: prize });
    setShowPrizeModal(false);
    setSelectedPreset(null);
    setCustomPrize('');
  };

  const handleSaveMatchPrize = () => {
    if (!editingMatchId) return;
    const prize = selectedPreset === 'custom' ? customPrize.trim() : selectedPreset;
    if (!prize) return;
    const updated = { ...matchPrizeMap, [editingMatchId]: prize };
    updateMutation.mutate({ matchPrizeCustom: updated });
    setShowMatchPrizeModal(false);
    setEditingMatchId(null);
    setSelectedPreset(null);
    setCustomPrize('');
  };

  const handleShare = async () => {
    if (!group) return;
    await Share.share({
      message: `¡Únete a mi quiniela "${group.name}" en ShinraFixture 2026!\nCódigo: ${group.inviteCode}\n${group.prizeDescription ? `Premio: ${group.prizeDescription}` : ''}`,
    });
  };

  const handleShareRanking = async () => {
    if (!group || !standings.length) return;
    const MEDALS = ['🥇', '🥈', '🥉'];
    const top5 = (standings as any[]).slice(0, 5);
    const lines = top5.map((s: any, i: number) => {
      const medal = MEDALS[i] ?? `${i + 1}.`;
      return `${medal} ${s.user?.displayName ?? s.user?.username} — ${s.totalPoints} pts`;
    });
    const msg = [
      `🏆 Quiniela "${group.name}" — Top ${top5.length}`,
      '',
      ...lines,
      '',
      `${group.prizeDescription ? `Premio: ${group.prizeDescription}\n` : ''}¡Sumate! Código: ${group.inviteCode}`,
      '📲 ShinraFixture 2026',
    ].join('\n');
    await Share.share({ message: msg });
  };

  const displayName = (team: any) =>
    language === 'en' ? (team?.shortName || team?.name) : team?.name;

  const isOwner = group?.ownerId && standings.some((m: any) => m.role === 'OWNER' && m.userId === group.ownerId);

  if (isLoading || !group) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: appColors.background }]} edges={['top']}>
        <Text style={[styles.loadingText, { color: appColors.textSecondary }]}>Cargando quiniela…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appColors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: appColors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={appColors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.title, { color: appColors.text }]} numberOfLines={1}>{group.name}</Text>
          <Text style={[styles.subtitle, { color: appColors.textSecondary }]}>
            {group._count?.members ?? group.members?.length ?? 0} participantes · Código: {group.inviteCode}
          </Text>
        </View>
        <View style={styles.headerActions}>
          {activeTab === 'standings' && standings.length > 0 && (
            <TouchableOpacity onPress={handleShareRanking} style={styles.shareBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialCommunityIcons name="trophy-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleShare} style={styles.shareBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="share-social-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Prize banner */}
      <TouchableOpacity
        style={[styles.prizeBanner, { backgroundColor: colors.primary + '22', borderColor: colors.primary + '44' }]}
        onPress={() => setShowPrizeModal(true)}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="trophy" size={22} color={colors.primary} />
        <View style={styles.prizeBannerText}>
          <Text style={[styles.prizeLabel, { color: colors.primary }]}>Premio del torneo</Text>
          <Text style={[styles.prizeValue, { color: appColors.text }]}>
            {group.prizeDescription || 'Tocar para definir el premio…'}
          </Text>
        </View>
        <Ionicons name="pencil" size={14} color={colors.primary} />
      </TouchableOpacity>

      {/* Match prize toggle (if owner) */}
      {group.matchPrizeEnabled ? (
        <View style={[styles.matchPrizeLine, { backgroundColor: appColors.surfaceSecondary }]}>
          <MaterialCommunityIcons name="soccer" size={16} color={colors.accent} />
          <Text style={[styles.matchPrizeLineText, { color: appColors.text }]}>
            Mini-apuesta por partido: <Text style={{ fontFamily: typography.fontFamily.bold }}>{group.matchPrizeDefault ?? '—'}</Text>
          </Text>
        </View>
      ) : null}

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: appColors.surface, borderBottomColor: appColors.border }]}>
        {(['standings', 'matches'] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, { color: activeTab === tab ? colors.primary : appColors.textSecondary }]}>
              {tab === 'standings' ? '🏅 Posiciones' : '⚽ Partidos & Apuestas'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'standings' ? (
        /* ── STANDINGS ── */
        <FlatList
          data={standings as any[]}
          keyExtractor={(m: any) => m.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`;
            return (
              <View style={[styles.standingRow, { backgroundColor: appColors.surface, borderBottomColor: appColors.border }]}>
                <Text style={styles.medal}>{medal}</Text>
                <View style={styles.standingUser}>
                  <Text style={[styles.standingName, { color: appColors.text }]}>
                    {item.user?.displayName ?? item.user?.username}
                  </Text>
                  {item.role === 'OWNER' && (
                    <Text style={[styles.ownerBadge, { color: colors.primary }]}>Admin</Text>
                  )}
                </View>
                <Text style={[styles.standingPts, { color: colors.primary }]}>{item.totalPoints} pts</Text>
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: appColors.textSecondary }]}>Sin posiciones todavía</Text>
          }
        />
      ) : (
        /* ── MATCHES & BETS ── */
        <FlatList
          data={matches as any[]}
          keyExtractor={(m: any) => m.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            group.matchPrizeEnabled ? null : (
              <TouchableOpacity
                style={[styles.enableMatchPrizeBtn, { borderColor: colors.accent }]}
                onPress={() => {
                  Alert.alert(
                    'Mini-apuestas por partido',
                    '¿Activar una apuesta por cada partido?',
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: 'Activar',
                        onPress: () => {
                          setEditingMatchId('__default__');
                          setShowMatchPrizeModal(true);
                        },
                      },
                    ]
                  );
                }}
              >
                <MaterialCommunityIcons name="plus-circle-outline" size={18} color={colors.accent} />
                <Text style={[styles.enableMatchPrizeBtnText, { color: colors.accent }]}>
                  Activar mini-apuestas por partido
                </Text>
              </TouchableOpacity>
            )
          }
          renderItem={({ item: match }) => {
            const prize = getMatchPrize(match.id);
            const isFinished = match.status === 'FINISHED';
            return (
              <View style={[styles.matchCard, { backgroundColor: appColors.surface }]}>
                <View style={styles.matchTop}>
                  <Text style={[styles.matchGroup, { color: appColors.textSecondary }]}>
                    {match.stage === 'GROUP' ? `Grupo ${match.group}` : match.stage?.replace(/_/g, ' ')}
                  </Text>
                  <Text style={[styles.matchDate, { color: appColors.textSecondary }]}>
                    {dayjs(match.matchDate).format('D MMM, HH:mm')}
                  </Text>
                </View>
                <View style={styles.matchTeams}>
                  <View style={styles.teamBlock}>
                    <TeamLogo uri={match.homeTeam?.flagUrl} size={28} code={match.homeTeam?.code} />
                    <Text style={[styles.teamName, { color: appColors.text }]} numberOfLines={1}>
                      {displayName(match.homeTeam)}
                    </Text>
                  </View>
                  <Text style={[styles.matchScore, { color: isFinished ? appColors.text : appColors.textSecondary }]}>
                    {isFinished ? `${match.homeScore} – ${match.awayScore}` : 'vs'}
                  </Text>
                  <View style={[styles.teamBlock, { alignItems: 'flex-end' }]}>
                    <TeamLogo uri={match.awayTeam?.flagUrl} size={28} code={match.awayTeam?.code} />
                    <Text style={[styles.teamName, { color: appColors.text, textAlign: 'right' }]} numberOfLines={1}>
                      {displayName(match.awayTeam)}
                    </Text>
                  </View>
                </View>
                {group.matchPrizeEnabled && (
                  <TouchableOpacity
                    style={[styles.matchPrizeRow, { borderTopColor: appColors.border }]}
                    onPress={() => {
                      if (!group.matchPrizeEnabled) return;
                      setEditingMatchId(match.id);
                      setSelectedPreset(null);
                      setCustomPrize(matchPrizeMap[match.id] ?? '');
                      setShowMatchPrizeModal(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons name="glass-mug-variant" size={14} color={colors.accent} />
                    <Text style={[styles.matchPrizeText, { color: prize ? appColors.text : appColors.textSecondary }]}>
                      {prize || group.matchPrizeDefault || 'Sin apuesta — tocar para definir'}
                    </Text>
                    <Ionicons name="pencil" size={12} color={appColors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
        />
      )}

      {/* ── TOURNAMENT PRIZE MODAL ── */}
      <Modal visible={showPrizeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: appColors.surface }]}>
            <Text style={[styles.modalTitle, { color: appColors.text }]}>🏆 Premio del Torneo</Text>
            <Text style={[styles.modalSub, { color: appColors.textSecondary }]}>
              ¿Qué gana el rey de la quiniela?
            </Text>

            <View style={styles.presetGrid}>
              {PRESET_PRIZES.map((p) => (
                <TouchableOpacity
                  key={p.value}
                  style={[
                    styles.presetChip,
                    { borderColor: appColors.border, backgroundColor: appColors.surfaceSecondary },
                    selectedPreset === p.value && { borderColor: colors.primary, backgroundColor: colors.primary + '22' },
                  ]}
                  onPress={() => { setSelectedPreset(p.value); setCustomPrize(''); }}
                >
                  <Text style={[styles.presetText, { color: selectedPreset === p.value ? colors.primary : appColors.text }]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[
                  styles.presetChip,
                  { borderColor: appColors.border, backgroundColor: appColors.surfaceSecondary },
                  selectedPreset === 'custom' && { borderColor: colors.primary, backgroundColor: colors.primary + '22' },
                ]}
                onPress={() => setSelectedPreset('custom')}
              >
                <Text style={[styles.presetText, { color: selectedPreset === 'custom' ? colors.primary : appColors.text }]}>
                  ✏️ Personalizar
                </Text>
              </TouchableOpacity>
            </View>

            {selectedPreset === 'custom' && (
              <TextInput
                style={[styles.customInput, { color: appColors.text, borderColor: appColors.border }]}
                placeholder="Ej: Cena para dos, entrada al partido..."
                placeholderTextColor={appColors.textSecondary}
                value={customPrize}
                onChangeText={setCustomPrize}
                autoFocus
                maxLength={80}
              />
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: appColors.surfaceSecondary }]}
                onPress={() => { setShowPrizeModal(false); setSelectedPreset(null); setCustomPrize(''); }}
              >
                <Text style={{ color: appColors.text }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }, !selectedPreset && { opacity: 0.4 }]}
                onPress={handleSaveTournamentPrize}
                disabled={!selectedPreset || updateMutation.isPending}
              >
                <Text style={{ color: 'white', fontFamily: typography.fontFamily.bold }}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MATCH PRIZE MODAL ── */}
      <Modal visible={showMatchPrizeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: appColors.surface }]}>
            <Text style={[styles.modalTitle, { color: appColors.text }]}>
              {editingMatchId === '__default__' ? '⚽ Premio por partido' : '⚽ Apuesta este partido'}
            </Text>
            <Text style={[styles.modalSub, { color: appColors.textSecondary }]}>
              {editingMatchId === '__default__'
                ? 'Se aplica a todos los partidos donde no haya un premio específico'
                : 'Tocar para definir qué se juega en este partido'}
            </Text>

            <View style={styles.presetGrid}>
              {PRESET_PRIZES.map((p) => (
                <TouchableOpacity
                  key={p.value}
                  style={[
                    styles.presetChip,
                    { borderColor: appColors.border, backgroundColor: appColors.surfaceSecondary },
                    selectedPreset === p.value && { borderColor: colors.accent, backgroundColor: colors.accent + '22' },
                  ]}
                  onPress={() => { setSelectedPreset(p.value); setCustomPrize(''); }}
                >
                  <Text style={[styles.presetText, { color: selectedPreset === p.value ? colors.accent : appColors.text }]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[
                  styles.presetChip,
                  { borderColor: appColors.border, backgroundColor: appColors.surfaceSecondary },
                  selectedPreset === 'custom' && { borderColor: colors.accent, backgroundColor: colors.accent + '22' },
                ]}
                onPress={() => setSelectedPreset('custom')}
              >
                <Text style={[styles.presetText, { color: selectedPreset === 'custom' ? colors.accent : appColors.text }]}>
                  ✏️ Personalizar
                </Text>
              </TouchableOpacity>
            </View>

            {selectedPreset === 'custom' && (
              <TextInput
                style={[styles.customInput, { color: appColors.text, borderColor: appColors.border }]}
                placeholder="Ej: El perdedor paga la pizza..."
                placeholderTextColor={appColors.textSecondary}
                value={customPrize}
                onChangeText={setCustomPrize}
                autoFocus
                maxLength={80}
              />
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: appColors.surfaceSecondary }]}
                onPress={() => { setShowMatchPrizeModal(false); setEditingMatchId(null); setSelectedPreset(null); setCustomPrize(''); }}
              >
                <Text style={{ color: appColors.text }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.accent }, !selectedPreset && { opacity: 0.4 }]}
                onPress={() => {
                  const prize = selectedPreset === 'custom' ? customPrize.trim() : selectedPreset;
                  if (!prize) return;
                  if (editingMatchId === '__default__') {
                    updateMutation.mutate({ matchPrizeEnabled: true, matchPrizeDefault: prize });
                  } else if (editingMatchId) {
                    const updated = { ...matchPrizeMap, [editingMatchId]: prize };
                    updateMutation.mutate({ matchPrizeCustom: updated });
                  }
                  setShowMatchPrizeModal(false);
                  setEditingMatchId(null);
                  setSelectedPreset(null);
                  setCustomPrize('');
                }}
                disabled={!selectedPreset || updateMutation.isPending}
              >
                <Text style={{ color: 'white', fontFamily: typography.fontFamily.bold }}>Guardar</Text>
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
  loadingText: { padding: spacing.xl, textAlign: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.base, paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth, gap: spacing.sm,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1 },
  title: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.bold },
  subtitle: { fontSize: 11, fontFamily: typography.fontFamily.regular },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  shareBtn: { padding: 4 },
  prizeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginHorizontal: spacing.base, marginTop: spacing.sm,
    padding: spacing.base, borderRadius: borderRadius.lg, borderWidth: 1,
  },
  prizeBannerText: { flex: 1 },
  prizeLabel: { fontSize: 10, fontFamily: typography.fontFamily.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  prizeValue: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.semiBold },
  matchPrizeLine: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginHorizontal: spacing.base, marginTop: spacing.xs,
    paddingHorizontal: spacing.base, paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  matchPrizeLineText: { fontSize: typography.fontSize.xs },
  tabs: {
    flexDirection: 'row', marginTop: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.sm,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabText: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.semiBold },
  listContent: { padding: spacing.base, gap: spacing.sm, paddingBottom: 80 },
  standingRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.base, borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.md,
  },
  medal: { fontSize: 22, width: 32, textAlign: 'center' },
  standingUser: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  standingName: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.medium },
  ownerBadge: { fontSize: 10, fontFamily: typography.fontFamily.bold },
  standingPts: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.bold },
  emptyText: { textAlign: 'center', paddingTop: 40, fontSize: typography.fontSize.sm },
  enableMatchPrizeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    borderWidth: 1, borderStyle: 'dashed', borderRadius: borderRadius.lg,
    padding: spacing.base, marginBottom: spacing.sm,
  },
  enableMatchPrizeBtnText: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.semiBold },
  matchCard: { borderRadius: borderRadius.lg, overflow: 'hidden' },
  matchTop: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.base, paddingTop: spacing.sm },
  matchGroup: { fontSize: 10, textTransform: 'uppercase', fontFamily: typography.fontFamily.medium },
  matchDate: { fontSize: 10 },
  matchTeams: { flexDirection: 'row', alignItems: 'center', padding: spacing.base, paddingTop: spacing.xs },
  teamBlock: { flex: 1, alignItems: 'center', gap: 4 },
  teamName: { fontSize: 11, fontFamily: typography.fontFamily.medium, textAlign: 'center' },
  matchScore: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.bold, paddingHorizontal: spacing.sm, minWidth: 48, textAlign: 'center' },
  matchPrizeRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.base, paddingVertical: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  matchPrizeText: { flex: 1, fontSize: 11, fontFamily: typography.fontFamily.medium },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, padding: spacing.xl, gap: spacing.base },
  modalTitle: { fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold },
  modalSub: { fontSize: typography.fontSize.xs, marginTop: -spacing.sm },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  presetChip: {
    paddingHorizontal: spacing.base, paddingVertical: spacing.sm,
    borderRadius: borderRadius.full, borderWidth: 1.5,
  },
  presetText: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.medium },
  customInput: {
    borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.base,
    fontSize: typography.fontSize.base,
  },
  modalActions: { flexDirection: 'row', gap: spacing.sm },
  modalBtn: { flex: 1, padding: spacing.base, borderRadius: borderRadius.md, alignItems: 'center' },
});
