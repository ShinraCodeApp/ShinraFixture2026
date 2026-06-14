import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import { useAppTheme } from '../../hooks/useAppTheme';
import { colors, spacing, typography, borderRadius } from '../../theme';

const NOTIF_ICONS: Record<string, { name: any; color: string }> = {
  MATCH_START: { name: 'soccer', color: '#1565C0' },
  GOAL: { name: 'soccer', color: '#2E7D32' },
  MATCH_END: { name: 'flag-checkered', color: '#6A1B9A' },
  PREDICTION_RESULT: { name: 'lightning-bolt', color: '#E65100' },
  ACHIEVEMENT: { name: 'trophy', color: '#F9A825' },
  FRIEND_REQUEST: { name: 'account-plus', color: '#00838F' },
  SYSTEM: { name: 'bell', color: '#455A64' },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const { appColors } = useAppTheme();
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await apiService.get('/notifications')).data.data,
    staleTime: 60_000,
  });

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => { setRefreshing(true); await refetch(); setRefreshing(false); };

  const markAllMutation = useMutation({
    mutationFn: () => apiService.patch('/notifications/read-all', {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiService.patch(`/notifications/${id}/read`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const notifications: any[] = data?.items ?? [];
  const unread: number = data?.unread ?? 0;

  const renderItem = useCallback(({ item }: { item: any }) => {
    const iconData = NOTIF_ICONS[item.type] ?? NOTIF_ICONS.SYSTEM;
    return (
      <TouchableOpacity
        style={[
          styles.item,
          { backgroundColor: item.isRead ? appColors.surface : appColors.surface + 'FF' },
          !item.isRead && styles.itemUnread,
        ]}
        onPress={() => !item.isRead && markReadMutation.mutate(item.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconWrap, { backgroundColor: iconData.color + '20' }]}>
          <MaterialCommunityIcons name={iconData.name} size={20} color={iconData.color} />
        </View>
        <View style={styles.itemContent}>
          <Text style={[styles.itemTitle, { color: appColors.text }]}>{item.title}</Text>
          <Text style={[styles.itemBody, { color: appColors.textSecondary }]} numberOfLines={2}>
            {item.body}
          </Text>
          <Text style={[styles.itemTime, { color: appColors.textSecondary }]}>
            {timeAgo(item.createdAt)}
          </Text>
        </View>
        {!item.isRead && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
      </TouchableOpacity>
    );
  }, [appColors, markReadMutation]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appColors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: appColors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={appColors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.title, { color: appColors.text }]}>Notificaciones</Text>
          {unread > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeText}>{unread}</Text>
            </View>
          )}
        </View>
        {unread > 0 ? (
          <TouchableOpacity onPress={() => markAllMutation.mutate()} disabled={markAllMutation.isPending}>
            <Text style={[styles.readAll, { color: colors.primary }]}>Leer todo</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : notifications.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="notifications-off-outline" size={56} color={appColors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: appColors.text }]}>Sin notificaciones</Text>
          <Text style={[styles.emptyBody, { color: appColors.textSecondary }]}>
            Acá verás alertas de partidos, goles y predicciones.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(n) => n.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.base, paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  title: { fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold },
  badge: {
    minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5,
    justifyContent: 'center', alignItems: 'center',
  },
  badgeText: { color: 'white', fontSize: 11, fontFamily: typography.fontFamily.bold },
  readAll: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.medium },
  loader: { flex: 1, justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  emptyTitle: { fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.semiBold },
  emptyBody: { fontSize: typography.fontSize.sm, textAlign: 'center' },
  list: { padding: spacing.sm, gap: spacing.xs },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.sm, borderRadius: borderRadius.lg,
  },
  itemUnread: { borderLeftWidth: 3, borderLeftColor: colors.primary },
  iconWrap: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  itemContent: { flex: 1, gap: 2 },
  itemTitle: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.semiBold },
  itemBody: { fontSize: typography.fontSize.xs, lineHeight: 16 },
  itemTime: { fontSize: 10 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
});
