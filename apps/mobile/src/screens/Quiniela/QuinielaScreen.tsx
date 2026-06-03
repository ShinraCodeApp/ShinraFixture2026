import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  Alert, Modal, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import { useAppTheme } from '../../hooks/useAppTheme';
import { colors, spacing, typography, borderRadius } from '../../theme';

export function QuinielaScreen() {
  const { appColors } = useAppTheme();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [newName, setNewName] = useState('');
  const [joinCode, setJoinCode] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['quinielas'],
    queryFn: async () => (await apiService.get('/quiniela')).data.data ?? [],
  });

  const createMutation = useMutation({
    mutationFn: async () => (await apiService.post('/quiniela', { name: newName })).data.data,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['quinielas'] }); setShowCreate(false); setNewName(''); },
    onError: (e: any) => Alert.alert('Error', e.response?.data?.message ?? 'No se pudo crear'),
  });

  const joinMutation = useMutation({
    mutationFn: async () => (await apiService.post('/quiniela/join', { inviteCode: joinCode.trim().toUpperCase() })).data.data,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['quinielas'] }); setShowJoin(false); setJoinCode(''); },
    onError: (e: any) => Alert.alert('Error', e.response?.data?.message ?? 'Código inválido'),
  });

  const handleShare = async (code: string, name: string) => {
    await Share.share({ message: `¡Únete a mi quiniela "${name}" en ShinraFixture 2026!\nCódigo: ${code}\nDescarga la app: shinrafixture.com` });
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

      <FlatList
        data={data ?? []}
        keyExtractor={(g: any) => g.id}
        refreshing={isLoading}
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
            <View style={[styles.card, { backgroundColor: appColors.surface }]}>
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

              <View style={styles.pointsRow}>
                <MaterialCommunityIcons name="star" size={14} color={colors.accent} />
                <Text style={[styles.points, { color: appColors.text }]}>{myMember?.totalPoints ?? 0} pts</Text>
              </View>

              <View style={[styles.codeRow, { borderTopColor: appColors.border }]}>
                <Text style={[styles.codeLabel, { color: appColors.textSecondary }]}>Código:</Text>
                <Text style={[styles.codeValue, { color: colors.primary }]}>{item.inviteCode}</Text>
                <TouchableOpacity onPress={() => handleShare(item.inviteCode, item.name)}>
                  <Ionicons name="share-social-outline" size={18} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* Create Modal */}
      <Modal visible={showCreate} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: appColors.surface }]}>
            <Text style={[styles.modalTitle, { color: appColors.text }]}>Nueva quiniela</Text>
            <TextInput
              style={[styles.modalInput, { color: appColors.text, borderColor: appColors.border }]}
              placeholder="Nombre de la quiniela"
              placeholderTextColor={appColors.textSecondary}
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: appColors.surfaceSecondary }]} onPress={() => { setShowCreate(false); setNewName(''); }}>
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

      {/* Join Modal */}
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
  pointsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  points: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.medium },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
  codeLabel: { fontSize: typography.fontSize.xs },
  codeValue: { flex: 1, fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.bold },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, padding: spacing.xl, gap: spacing.base },
  modalTitle: { fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold },
  modalInput: { borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.base, fontSize: typography.fontSize.base },
  modalActions: { flexDirection: 'row', gap: spacing.sm },
  modalBtn: { flex: 1, padding: spacing.base, borderRadius: borderRadius.md, alignItems: 'center' },
});
