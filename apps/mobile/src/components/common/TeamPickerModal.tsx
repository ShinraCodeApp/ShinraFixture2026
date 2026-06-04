import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  FlatList, Image, TextInput, ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../../services/api';
import { useAppTheme } from '../../hooks/useAppTheme';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { FavoriteTeam } from '../../store/slices/settingsSlice';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (team: FavoriteTeam) => void;
  currentTeamId?: string | null;
}

export function TeamPickerModal({ visible, onClose, onSelect, currentTeamId }: Props) {
  const { appColors } = useAppTheme();
  const [search, setSearch] = useState('');

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['all-teams'],
    queryFn: async () => {
      const r = await apiService.get('/teams?limit=200');
      return r.data.data ?? [];
    },
    enabled: visible,
    staleTime: 60_000 * 5,
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return teams;
    const q = search.toLowerCase();
    return teams.filter((t: any) =>
      t.name.toLowerCase().includes(q) ||
      t.shortName?.toLowerCase().includes(q) ||
      t.code?.toLowerCase().includes(q)
    );
  }, [teams, search]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: appColors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: appColors.border }]}>
          <Text style={[styles.title, { color: appColors.text }]}>Elegir equipo favorito</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={24} color={appColors.text} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={[styles.searchBox, { backgroundColor: appColors.surfaceSecondary }]}>
          <Ionicons name="search" size={18} color={appColors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: appColors.text }]}
            placeholder="Buscar equipo..."
            placeholderTextColor={appColors.textSecondary}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={appColors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxxl }} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item: any) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }: { item: any }) => {
              const isSelected = item.id === currentTeamId;
              return (
                <TouchableOpacity
                  style={[
                    styles.teamRow,
                    { backgroundColor: isSelected ? colors.primary + '18' : appColors.surface },
                    isSelected && { borderColor: colors.primary, borderWidth: 1 },
                  ]}
                  onPress={() => {
                    onSelect({
                      id: item.id,
                      name: item.name,
                      code: item.code,
                      flagUrl: item.flagUrl,
                      shieldUrl: item.shieldUrl,
                    });
                    onClose();
                  }}
                  activeOpacity={0.75}
                >
                  {item.flagUrl ? (
                    <Image source={{ uri: item.flagUrl }} style={styles.flag} />
                  ) : (
                    <View style={[styles.flagPlaceholder, { backgroundColor: appColors.surfaceSecondary }]}>
                      <Text style={[styles.flagText, { color: appColors.textSecondary }]}>
                        {item.code?.slice(0, 2)}
                      </Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.teamName, { color: appColors.text }]}>{item.name}</Text>
                    <Text style={[styles.teamMeta, { color: appColors.textSecondary }]}>
                      {item.code} · {item.region}
                    </Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  )}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={[styles.emptyText, { color: appColors.textSecondary }]}>
                  Sin resultados para "{search}"
                </Text>
              </View>
            }
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.base, paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginHorizontal: spacing.base, marginVertical: spacing.sm,
    paddingHorizontal: spacing.base, paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  searchInput: { flex: 1, fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.regular },
  list: { paddingHorizontal: spacing.base, paddingBottom: spacing.xxxl, gap: spacing.xs },
  teamRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.base,
    padding: spacing.sm, borderRadius: borderRadius.md,
  },
  flag: { width: 40, height: 28, borderRadius: 4 },
  flagPlaceholder: {
    width: 40, height: 28, borderRadius: 4, alignItems: 'center', justifyContent: 'center',
  },
  flagText: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.bold },
  teamName: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.medium },
  teamMeta: { fontSize: typography.fontSize.xs, marginTop: 1 },
  empty: { alignItems: 'center', paddingVertical: spacing.xxxl },
  emptyText: { fontSize: typography.fontSize.base },
});
