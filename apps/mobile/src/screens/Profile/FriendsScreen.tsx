import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Image, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppTheme } from '../../hooks/useAppTheme';
import { apiService } from '../../services/api';
import { colors, spacing, typography, borderRadius } from '../../theme';

type Tab = 'amigos' | 'solicitudes' | 'buscar';

interface FriendUser {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  level: number;
  predictionPoints: number;
  country?: string;
  friendshipId?: string | null;
  friendshipStatus?: string | null;
}

function Avatar({ uri, name, size = 44 }: { uri?: string | null; name: string; size?: number }) {
  if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: colors.primary + '33', alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ color: colors.primary, fontFamily: typography.fontFamily.bold, fontSize: size * 0.38 }}>
        {name?.[0]?.toUpperCase() ?? '?'}
      </Text>
    </View>
  );
}

function FriendCard({
  user, action, actionLabel, actionColor, onAction, loading,
}: {
  user: FriendUser;
  action?: () => void;
  actionLabel?: string;
  actionColor?: string;
  onAction?: () => void;
  loading?: boolean;
}) {
  const { appColors } = useAppTheme();
  return (
    <View style={[styles.card, { backgroundColor: appColors.surface }]}>
      <Avatar uri={user.avatar} name={user.displayName} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.displayName, { color: appColors.text }]}>{user.displayName}</Text>
        <Text style={[styles.username, { color: appColors.textSecondary }]}>@{user.username}</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: 2 }}>
          <Text style={[styles.badge, { color: appColors.textSecondary }]}>Nv. {user.level}</Text>
          <Text style={[styles.badge, { color: appColors.textSecondary }]}>⚡ {user.predictionPoints} pts</Text>
        </View>
      </View>
      {actionLabel && (
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: (actionColor ?? colors.primary) + '22', borderColor: actionColor ?? colors.primary }]}
          onPress={action}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={actionColor ?? colors.primary} />
          ) : (
            <Text style={[styles.actionBtnText, { color: actionColor ?? colors.primary }]}>{actionLabel}</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

export function FriendsScreen() {
  const { appColors } = useAppTheme();
  const navigation = useNavigation();
  const qc = useQueryClient();

  const [tab, setTab] = useState<Tab>('amigos');
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  // Friends list
  const { data: friends = [], isLoading: loadingFriends, refetch: refetchFriends } = useQuery<any[]>({
    queryKey: ['friends'],
    queryFn: async () => (await apiService.get('/friends')).data.data,
  });

  // Pending requests (received)
  const { data: requests = [], isLoading: loadingReqs, refetch: refetchReqs } = useQuery<any[]>({
    queryKey: ['friend-requests'],
    queryFn: async () => (await apiService.get('/friends/requests')).data.data,
  });

  // Search
  const [searchResults, setSearchResults] = useState<FriendUser[]>([]);
  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await apiService.get(`/friends/search?q=${encodeURIComponent(q.trim())}`);
      setSearchResults(res.data.data);
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  }, []);

  const sendReq = useMutation({
    mutationFn: (userId: string) => apiService.post(`/friends/request/${userId}`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['friends'] }); doSearch(query); },
    onError: (e: any) => Alert.alert('Error', e?.response?.data?.message ?? 'No se pudo enviar'),
  });

  const acceptReq = useMutation({
    mutationFn: (id: string) => apiService.post(`/friends/accept/${id}`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['friends'] });
      qc.invalidateQueries({ queryKey: ['friend-requests'] });
    },
  });

  const removeOrReject = useMutation({
    mutationFn: (id: string) => apiService.delete(`/friends/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['friends'] });
      qc.invalidateQueries({ queryKey: ['friend-requests'] });
      doSearch(query);
    },
  });

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: 'amigos',      label: 'Mis amigos',  count: friends.length },
    { key: 'solicitudes', label: 'Solicitudes', count: requests.length },
    { key: 'buscar',      label: 'Buscar' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appColors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: appColors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={appColors.text} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.title, { color: appColors.text }]}>Amigos</Text>
          <Text style={[styles.subtitle, { color: appColors.textSecondary }]}>
            {friends.length} amigo{friends.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* Tab bar */}
      <View style={[styles.tabBar, { borderBottomColor: appColors.border }]}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabBtn, tab === t.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabLabel, { color: tab === t.key ? colors.primary : appColors.textSecondary }]}>
              {t.label}
            </Text>
            {!!t.count && t.count > 0 && (
              <View style={[styles.badge, { backgroundColor: t.key === 'solicitudes' ? colors.error : colors.primary }]}>
                <Text style={styles.badgeText}>{t.count}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {tab === 'amigos' && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={loadingFriends} onRefresh={refetchFriends} tintColor={colors.primary} />}
        >
          {loadingFriends ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
          ) : friends.length === 0 ? (
            <EmptyState icon="account-group" text="Todavía no tenés amigos en la app" sub='Buscá por username en la pestaña "Buscar"' />
          ) : (
            friends.map((f: any) => (
              <FriendCard
                key={f.friendshipId}
                user={f.user}
                actionLabel="Eliminar"
                actionColor={colors.error}
                action={() =>
                  Alert.alert('¿Eliminar amigo?', `¿Querés eliminar a ${f.user.displayName}?`, [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Eliminar', style: 'destructive', onPress: () => removeOrReject.mutate(f.friendshipId) },
                  ])
                }
                loading={removeOrReject.isPending && pendingId === f.friendshipId}
              />
            ))
          )}
        </ScrollView>
      )}

      {tab === 'solicitudes' && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={loadingReqs} onRefresh={refetchReqs} tintColor={colors.primary} />}
        >
          {loadingReqs ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
          ) : requests.length === 0 ? (
            <EmptyState icon="bell-outline" text="No hay solicitudes pendientes" />
          ) : (
            requests.map((r: any) => (
              <View key={r.id} style={[styles.card, { backgroundColor: appColors.surface }]}>
                <Avatar uri={r.fromUser.avatar} name={r.fromUser.displayName} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.displayName, { color: appColors.text }]}>{r.fromUser.displayName}</Text>
                  <Text style={[styles.username, { color: appColors.textSecondary }]}>@{r.fromUser.username}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.primary + '22', borderColor: colors.primary }]}
                    onPress={() => acceptReq.mutate(r.id)}
                  >
                    <Ionicons name="checkmark" size={18} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.error + '22', borderColor: colors.error }]}
                    onPress={() => removeOrReject.mutate(r.id)}
                  >
                    <Ionicons name="close" size={18} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {tab === 'buscar' && (
        <View style={{ flex: 1 }}>
          <View style={[styles.searchBox, { backgroundColor: appColors.surface, borderColor: appColors.border }]}>
            <Ionicons name="search" size={18} color={appColors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: appColors.text }]}
              placeholder="Buscar por nombre o @usuario"
              placeholderTextColor={appColors.textSecondary}
              value={query}
              onChangeText={(q) => { setQuery(q); doSearch(q); }}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => { setQuery(''); setSearchResults([]); }}>
                <Ionicons name="close-circle" size={18} color={appColors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
            {searching ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
            ) : query.length < 2 ? (
              <EmptyState icon="magnify" text="Escribí al menos 2 caracteres para buscar" />
            ) : searchResults.length === 0 ? (
              <EmptyState icon="account-search" text={`No se encontró "${query}"`} />
            ) : (
              searchResults.map((u) => {
                const isFriend  = u.friendshipStatus === 'ACCEPTED';
                const isPending = u.friendshipStatus === 'PENDING';
                return (
                  <FriendCard
                    key={u.id}
                    user={u}
                    actionLabel={isFriend ? '✓ Amigos' : isPending ? 'Pendiente' : '+ Agregar'}
                    actionColor={isFriend ? '#22C55E' : isPending ? '#F59E0B' : colors.primary}
                    action={isFriend || isPending ? undefined : () => {
                      setPendingId(u.id);
                      sendReq.mutate(u.id);
                    }}
                    loading={sendReq.isPending && pendingId === u.id}
                  />
                );
              })
            )}
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

function EmptyState({ icon, text, sub }: { icon: string; text: string; sub?: string }) {
  const { appColors } = useAppTheme();
  return (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name={icon as any} size={48} color={appColors.textSecondary} />
      <Text style={[styles.emptyText, { color: appColors.textSecondary }]}>{text}</Text>
      {sub && <Text style={[styles.emptySub, { color: appColors.textSecondary }]}>{sub}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.base, paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 4 },
  title: { fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold },
  subtitle: { fontSize: typography.fontSize.xs },
  tabBar: {
    flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.sm, gap: spacing.xs,
  },
  tabLabel: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.medium },
  badge: {
    borderRadius: 10, paddingHorizontal: 5, paddingVertical: 1, minWidth: 18, alignItems: 'center',
  },
  badgeText: { color: 'white', fontSize: 10, fontFamily: typography.fontFamily.bold },
  list: { padding: spacing.base, gap: spacing.sm, paddingBottom: 40 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.base,
    padding: spacing.base, borderRadius: borderRadius.lg,
  },
  displayName: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.semiBold },
  username: { fontSize: typography.fontSize.xs },
  actionBtn: {
    borderWidth: 1, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
    minWidth: 36, alignItems: 'center', justifyContent: 'center',
  },
  actionBtnText: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.semiBold },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    margin: spacing.base, padding: spacing.base,
    borderRadius: borderRadius.lg, borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.regular },
  emptyState: { alignItems: 'center', marginTop: 60, gap: spacing.sm, paddingHorizontal: spacing.xl },
  emptyText: { fontSize: typography.fontSize.sm, textAlign: 'center', fontFamily: typography.fontFamily.medium },
  emptySub: { fontSize: typography.fontSize.xs, textAlign: 'center' },
});
