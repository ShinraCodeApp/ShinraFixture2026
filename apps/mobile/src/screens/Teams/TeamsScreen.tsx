import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import { useAppTheme } from '../../hooks/useAppTheme';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { TeamLogo } from '../../components/common/TeamLogo';

const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L'];

export function TeamsScreen() {
  const navigation = useNavigation<any>();
  const { appColors } = useAppTheme();
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  const { data: tournaments = [], refetch: refetchTournaments } = useQuery({
    queryKey: ['tournaments'],
    queryFn: async () => (await apiService.get('/tournaments')).data.data ?? [],
    staleTime: 10 * 60_000,
  });

  const wcTournament: any = (tournaments as any[]).find((t: any) => t.type === 'WORLD_CUP') ?? (tournaments as any[])[0];

  const { data: tournamentDetail, refetch: refetchDetail } = useQuery({
    queryKey: ['tournament-detail', wcTournament?.id],
    queryFn: async () => (await apiService.get(`/tournaments/${wcTournament!.id}`)).data.data,
    enabled: !!wcTournament?.id,
    staleTime: 10 * 60_000,
  });

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await refetchTournaments();
    if (wcTournament?.id) await refetchDetail();
    setRefreshing(false);
  };

  const teams = useMemo(() => {
    if (!tournamentDetail?.groups) return [];
    return (tournamentDetail.groups as any[]).flatMap((g: any) =>
      (g.teams as any[]).map((t: any) => ({ ...t.team, group: g.letter }))
    );
  }, [tournamentDetail]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return teams.filter((t: any) =>
      (!search || t.name.toLowerCase().includes(s) || t.code.toLowerCase().includes(s)) &&
      (!selectedGroup || t.group === selectedGroup)
    );
  }, [teams, search, selectedGroup]);

  const isLoading = !wcTournament || !tournamentDetail;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appColors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: appColors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={appColors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: appColors.text }]}>Selecciones</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color={appColors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: appColors.text }]}
          placeholder="Buscar selección..."
          placeholderTextColor={appColors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        horizontal
        data={['Todos', ...GROUPS]}
        keyExtractor={(i) => i}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.groups}
        renderItem={({ item }) => {
          const isSelected = item === 'Todos' ? !selectedGroup : selectedGroup === item;
          return (
            <TouchableOpacity
              style={[styles.groupPill, isSelected && { backgroundColor: colors.primary }]}
              onPress={() => setSelectedGroup(item === 'Todos' ? null : item)}
            >
              <Text style={[styles.groupText, isSelected && { color: 'white' }]}>
                {item === 'Todos' ? item : `G${item}`}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      <FlatList
        data={filtered}
        keyExtractor={(t: any) => t.id}
        numColumns={3}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          isLoading ? null : (
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: appColors.textSecondary }]}>
                No se encontraron selecciones
              </Text>
            </View>
          )
        }
        renderItem={({ item }: { item: any }) => (
          <TouchableOpacity
            style={[styles.teamCard, { backgroundColor: appColors.surface }]}
            onPress={() => navigation.navigate('TeamDetail', { teamId: item.id })}
          >
            <TeamLogo uri={item.flagUrl} size={48} code={item.code} />
            <Text style={[styles.teamName, { color: appColors.text }]} numberOfLines={2}>{item.name}</Text>
            <Text style={[styles.teamCode, { color: appColors.textSecondary }]}>{item.code}</Text>
            {item.group && (
              <View style={styles.groupBadge}>
                <Text style={styles.groupBadgeText}>G{item.group}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.base, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    margin: spacing.base, padding: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: borderRadius.md,
  },
  searchInput: { flex: 1, fontSize: typography.fontSize.base },
  groups: { paddingHorizontal: spacing.base, gap: spacing.xs, marginBottom: spacing.xs },
  groupPill: {
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)',
  },
  groupText: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.medium },
  list: { padding: spacing.sm, gap: spacing.xs },
  empty: { padding: spacing.xl, alignItems: 'center' },
  emptyText: { fontSize: typography.fontSize.sm },
  teamCard: {
    flex: 1, margin: spacing.xs, borderRadius: borderRadius.lg,
    padding: spacing.sm, alignItems: 'center', gap: 4,
    position: 'relative',
  },
  teamName: { fontSize: 10, fontFamily: typography.fontFamily.medium, textAlign: 'center' },
  teamCode: { fontSize: 9 },
  groupBadge: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: colors.primary, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1,
  },
  groupBadgeText: { color: 'white', fontSize: 8, fontFamily: typography.fontFamily.bold },
});
