import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, Modal, TextInput, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { apiService } from '../../services/api';
import { useAppTheme } from '../../hooks/useAppTheme';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { GuestLockScreen } from '../../components/common/GuestLockScreen';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

type LeagueType = 'LIGA' | 'TORNEO' | 'COPA';

const TYPE_LABELS: Record<LeagueType, string> = { LIGA: 'Liga', TORNEO: 'Torneo', COPA: 'Copa' };
const TYPE_ICONS: Record<LeagueType, string> = { LIGA: 'table', TORNEO: 'trophy', COPA: 'star-circle' };
const TYPE_COLORS: Record<LeagueType, string> = { LIGA: colors.primary, TORNEO: '#F59E0B', COPA: '#8B5CF6' };

function CreateLeagueModal({ visible, onClose, onCreate }: {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string, type: LeagueType) => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<LeagueType>('LIGA');
  const { appColors } = useAppTheme();

  const handleCreate = () => {
    if (!name.trim()) { Alert.alert('Error', 'Ingresá un nombre para la liga'); return; }
    onCreate(name.trim(), type);
    setName('');
    setType('LIGA');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.sheet, { backgroundColor: appColors.surface }]}>
          <Text style={[modalStyles.title, { color: appColors.text }]}>Nueva Liga</Text>

          <TextInput
            style={[modalStyles.input, { backgroundColor: appColors.background, color: appColors.text, borderColor: appColors.border }]}
            placeholder="Nombre de la liga o torneo"
            placeholderTextColor={appColors.textSecondary}
            value={name}
            onChangeText={setName}
            maxLength={50}
            autoFocus
          />

          <Text style={[modalStyles.label, { color: appColors.textSecondary }]}>Tipo</Text>
          <View style={modalStyles.typeRow}>
            {(['LIGA', 'TORNEO', 'COPA'] as LeagueType[]).map((t) => (
              <TouchableOpacity
                key={t}
                style={[
                  modalStyles.typeBtn,
                  { backgroundColor: appColors.background, borderColor: appColors.border },
                  type === t && { backgroundColor: TYPE_COLORS[t] + '22', borderColor: TYPE_COLORS[t] },
                ]}
                onPress={() => setType(t)}
              >
                <MaterialCommunityIcons name={TYPE_ICONS[t] as any} size={18} color={type === t ? TYPE_COLORS[t] : appColors.textSecondary} />
                <Text style={[modalStyles.typeBtnText, { color: type === t ? TYPE_COLORS[t] : appColors.textSecondary }]}>
                  {TYPE_LABELS[t]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={modalStyles.actions}>
            <TouchableOpacity style={[modalStyles.cancelBtn, { borderColor: appColors.border }]} onPress={onClose}>
              <Text style={[modalStyles.cancelText, { color: appColors.textSecondary }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[modalStyles.createBtn, { backgroundColor: colors.primary }]} onPress={handleCreate}>
              <Text style={modalStyles.createText}>Crear</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function LocalLeaguesScreen() {
  const navigation = useNavigation<any>();
  const qc = useQueryClient();
  const { appColors } = useAppTheme();
  const { user } = useSelector((state: RootState) => state.auth);
  const [showCreate, setShowCreate] = useState(false);

  const { data: leagues = [], isLoading } = useQuery({
    queryKey: ['local-leagues'],
    queryFn: async () => (await apiService.get('/local-leagues')).data.data,
  });

  const createMutation = useMutation({
    mutationFn: (body: { name: string; type: LeagueType }) =>
      apiService.get('/local-leagues/g-create', { params: body }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['local-leagues'] });
      setShowCreate(false);
      navigation.navigate('LocalLeagueDetail', { leagueId: res.data.data.id });
    },
    onError: () => Alert.alert('Error', 'No se pudo crear la liga'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiService.get(`/local-leagues/${id}/g-delete`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['local-leagues'] }),
  });

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Eliminar liga', `¿Eliminás "${name}"? Esta acción no se puede deshacer.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
    ]);
  };

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: appColors.background }]} edges={['top']}>
        <GuestLockScreen
          title="Ligas locales"
          message="Organizá tu propia liga con amigos. Necesitás una cuenta para crear o unirte."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appColors.background }]} edges={['top']}>
      {/* Header */}
      <LinearGradient colors={['#001489', '#0D47A1']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <MaterialCommunityIcons name="trophy-outline" size={22} color={colors.accent} />
          <Text style={styles.headerTitle}>Liga de mi ciudad</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </LinearGradient>

      {isLoading ? (
        <ActivityIndicator style={{ flex: 1 }} color={colors.primary} />
      ) : leagues.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="soccer-field" size={64} color={appColors.border} />
          <Text style={[styles.emptyTitle, { color: appColors.text }]}>Sin ligas todavía</Text>
          <Text style={[styles.emptyHint, { color: appColors.textSecondary }]}>
            Creá tu primera liga barrial, de amigos o de tu ciudad
          </Text>
          <TouchableOpacity
            style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
            onPress={() => setShowCreate(true)}
          >
            <Ionicons name="add" size={18} color="white" />
            <Text style={styles.emptyBtnText}>Crear liga</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={leagues}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const t = item.type as LeagueType;
            return (
              <TouchableOpacity
                style={[styles.card, { backgroundColor: appColors.surface }, shadows.sm]}
                onPress={() => navigation.navigate('LocalLeagueDetail', { leagueId: item.id })}
                activeOpacity={0.8}
              >
                <View style={[styles.cardIcon, { backgroundColor: TYPE_COLORS[t] + '22' }]}>
                  <MaterialCommunityIcons name={TYPE_ICONS[t] as any} size={26} color={TYPE_COLORS[t]} />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={[styles.cardName, { color: appColors.text }]} numberOfLines={1}>{item.name}</Text>
                  <Text style={[styles.cardMeta, { color: appColors.textSecondary }]}>
                    {TYPE_LABELS[t]} · {item.teams?.length ?? 0} equipos
                    {item.isFinished ? ' · Finalizada' : ''}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(item.id, item.name)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="trash-outline" size={18} color={appColors.textSecondary} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <CreateLeagueModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={(name, type) => createMutation.mutate({ name, type })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.base, paddingVertical: spacing.md, gap: spacing.sm,
  },
  back: { width: 32 },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  headerTitle: { color: 'white', fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold },
  addBtn: { width: 32, alignItems: 'flex-end' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  emptyTitle: { fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.bold },
  emptyHint: { fontSize: typography.fontSize.sm, textAlign: 'center', lineHeight: 20 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.full, marginTop: spacing.sm,
  },
  emptyBtnText: { color: 'white', fontFamily: typography.fontFamily.semiBold },

  list: { padding: spacing.base, gap: spacing.sm },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md, borderRadius: borderRadius.lg,
  },
  cardIcon: { width: 52, height: 52, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.semiBold },
  cardMeta: { fontSize: typography.fontSize.xs, marginTop: 2 },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.lg, paddingBottom: 40 },
  title: { fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.bold, marginBottom: spacing.lg },
  input: {
    borderWidth: 1, borderRadius: borderRadius.md, paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm, fontSize: typography.fontSize.base, marginBottom: spacing.md,
  },
  label: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.semiBold, letterSpacing: 0.8, marginBottom: spacing.sm },
  typeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  typeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    paddingVertical: spacing.sm, borderRadius: borderRadius.md, borderWidth: 1.5,
  },
  typeBtnText: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.semiBold },
  actions: { flexDirection: 'row', gap: spacing.sm },
  cancelBtn: {
    flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.md,
    borderWidth: 1, alignItems: 'center',
  },
  cancelText: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.medium },
  createBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.md, alignItems: 'center' },
  createText: { color: 'white', fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.semiBold },
});
