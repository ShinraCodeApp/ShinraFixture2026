import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, FlatList,
  TouchableOpacity, ActivityIndicator, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { showMessage } from 'react-native-flash-message';

import { useAppTheme } from '../../hooks/useAppTheme';
import { apiService } from '../../services/api';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { track } from '../../utils/analytics';

export function UserSearchScreen() {
  const navigation = useNavigation<any>();
  const { appColors } = useAppTheme();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');

  const { data: results = [], isFetching } = useQuery({
    queryKey: ['user-search', query],
    queryFn: async () => {
      if (query.trim().length < 2) return [];
      const r = await apiService.get(`/users/search?q=${encodeURIComponent(query)}`);
      return r.data.data ?? [];
    },
    enabled: query.trim().length >= 2,
    staleTime: 30_000,
  });

  const addFriendMutation = useMutation({
    mutationFn: async (userId: string) => apiService.post('/friends/request', { targetUserId: userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends-list'] });
      showMessage({ message: '¡Solicitud de amistad enviada!', type: 'success' });
      track('friend_added');
    },
    onError: (e: any) => showMessage({ message: e?.response?.data?.error ?? 'Error', type: 'danger' }),
  });

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.userRow, { backgroundColor: appColors.surface }, shadows.sm]}>
      <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
        <Text style={styles.avatarText}>{(item.displayName ?? item.username ?? '?')[0].toUpperCase()}</Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={[styles.displayName, { color: appColors.text }]} numberOfLines={1}>
          {item.displayName ?? item.username}
        </Text>
        <Text style={[styles.username, { color: appColors.textSecondary }]}>@{item.username}</Text>
      </View>
      <Text style={[styles.pts, { color: colors.primary }]}>{item.predictionPoints ?? 0} pts</Text>
      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => addFriendMutation.mutate(item.id)}
        disabled={addFriendMutation.isPending}
      >
        <MaterialCommunityIcons name="account-plus" size={20} color={colors.primary} />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.profileBtn}
        onPress={() => navigation.navigate('PublicProfile', { userId: item.id })}
      >
        <Ionicons name="chevron-forward" size={18} color={appColors.textSecondary} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appColors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: appColors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={26} color={appColors.text} />
        </TouchableOpacity>
        <View style={[styles.searchBox, { backgroundColor: appColors.surface, borderColor: appColors.border }]}>
          <Ionicons name="search" size={16} color={appColors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: appColors.text }]}
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar usuario o nombre..."
            placeholderTextColor={appColors.textSecondary}
            autoFocus
            autoCapitalize="none"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={16} color={appColors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isFetching && (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      )}

      {!isFetching && query.trim().length >= 2 && (results as any[]).length === 0 && (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="account-search" size={48} color={appColors.textSecondary} />
          <Text style={[styles.emptyText, { color: appColors.textSecondary }]}>
            Sin resultados para "{query}"
          </Text>
        </View>
      )}

      {query.trim().length < 2 && (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="account-search-outline" size={48} color={appColors.textSecondary} />
          <Text style={[styles.emptyText, { color: appColors.textSecondary }]}>
            Escribí al menos 2 caracteres
          </Text>
        </View>
      )}

      <FlatList
        data={results as any[]}
        keyExtractor={(item: any) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.screen, paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderRadius: borderRadius.full, borderWidth: 1,
    paddingHorizontal: spacing.sm, paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: typography.fontSize.sm, padding: 0 },

  list: { padding: spacing.screen, gap: spacing.sm },
  userRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.sm, borderRadius: borderRadius.lg,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: 'white', fontFamily: typography.fontFamily.bold, fontSize: 16 },
  userInfo: { flex: 1 },
  displayName: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.semiBold },
  username: { fontSize: 11 },
  pts: { fontSize: 11, fontFamily: typography.fontFamily.bold },
  addBtn: { padding: 6 },
  profileBtn: { padding: 6 },

  empty: { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText: { fontSize: 14, textAlign: 'center' },
});
