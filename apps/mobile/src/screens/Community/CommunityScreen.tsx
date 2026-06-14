import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { apiService } from '../../services/api';
import { useAppTheme } from '../../hooks/useAppTheme';
import { colors, spacing, typography, borderRadius } from '../../theme';

const CATEGORIES = ['General', 'Grupos', 'Favoritos', 'Predicciones', 'Noticias'];

export function CommunityScreen() {
  const navigation = useNavigation<any>();
  const { appColors } = useAppTheme();
  const [category, setCategory] = useState('General');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['forum', category],
    queryFn: async () => (await apiService.get(`/community/forum?category=${category}&limit=20`)).data.data,
  });

  const posts = data?.items ?? [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appColors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: appColors.border }]}>
        <Text style={[styles.title, { color: appColors.text }]}>Comunidad</Text>
        <TouchableOpacity style={styles.newPostBtn} onPress={() => navigation.navigate('NewPost')}>
          <Ionicons name="add" size={20} color="white" />
        </TouchableOpacity>
      </View>

      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={(c) => c}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categories}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.catPill, category === item && { backgroundColor: colors.primary }]}
            onPress={() => setCategory(item)}
          >
            <Text style={[styles.catText, category === item && { color: 'white' }]}>{item}</Text>
          </TouchableOpacity>
        )}
      />

      <FlatList
        data={posts}
        keyExtractor={(p: any) => p.id}
        contentContainerStyle={styles.list}
        refreshing={isLoading}
        onRefresh={refetch}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons name="forum-outline" size={48} color={appColors.textSecondary} />
            <Text style={[styles.emptyText, { color: appColors.textSecondary }]}>No hay publicaciones aún</Text>
          </View>
        }
        renderItem={({ item }: { item: any }) => (
          <TouchableOpacity
            style={[styles.post, { backgroundColor: appColors.surface }]}
            onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
            activeOpacity={0.75}
          >
            <View style={styles.postHeader}>
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarText}>{item.user?.displayName?.[0] ?? 'U'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.userName, { color: appColors.text }]}>{item.user?.displayName}</Text>
                <Text style={[styles.postTime, { color: appColors.textSecondary }]}>
                  {new Date(item.createdAt).toLocaleDateString('es')}
                </Text>
              </View>
              <View style={[styles.catTag, { backgroundColor: `${colors.primary}20` }]}>
                <Text style={[styles.catTagText, { color: colors.primary }]}>{item.category}</Text>
              </View>
            </View>
            {item.isPinned && (
              <View style={styles.pinnedRow}>
                <Ionicons name="pin" size={11} color={colors.primary} />
                <Text style={[styles.pinnedText, { color: colors.primary }]}>Fijado</Text>
              </View>
            )}
            <Text style={[styles.postTitle, { color: appColors.text }]} numberOfLines={2}>{item.title}</Text>
            <Text style={[styles.postContent, { color: appColors.textSecondary }]} numberOfLines={2}>{item.content}</Text>
            <View style={styles.postFooter}>
              <View style={styles.stat}>
                <Ionicons name="chatbubble-outline" size={14} color={appColors.textSecondary} />
                <Text style={[styles.statText, { color: appColors.textSecondary }]}>{item._count?.replies ?? 0}</Text>
              </View>
              <View style={styles.stat}>
                <Ionicons name="eye-outline" size={14} color={appColors.textSecondary} />
                <Text style={[styles.statText, { color: appColors.textSecondary }]}>{item.viewsCount}</Text>
              </View>
              <View style={[styles.stat, { marginLeft: 'auto' as any }]}>
                <Ionicons name="heart-outline" size={14} color={appColors.textSecondary} />
                <Text style={[styles.statText, { color: appColors.textSecondary }]}>{item.likesCount ?? 0}</Text>
              </View>
            </View>
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
  title: { fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.bold },
  newPostBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  categories: { paddingHorizontal: spacing.base, paddingVertical: spacing.sm, gap: spacing.xs },
  catPill: {
    paddingHorizontal: spacing.base, paddingVertical: 6,
    borderRadius: borderRadius.full, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)',
  },
  catText: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.medium },
  list: { padding: spacing.base, gap: spacing.sm, paddingBottom: 80 },
  empty: { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText: { fontSize: typography.fontSize.base },
  post: { borderRadius: borderRadius.lg, padding: spacing.base, gap: spacing.xs },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: 'white', fontFamily: typography.fontFamily.bold },
  userName: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.medium },
  postTime: { fontSize: typography.fontSize.xs },
  catTag: { paddingHorizontal: spacing.xs, paddingVertical: 2, borderRadius: borderRadius.xs },
  catTagText: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.medium },
  postTitle: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.bold },
  postContent: { fontSize: typography.fontSize.sm, lineHeight: 18 },
  postFooter: { flexDirection: 'row', gap: spacing.base, paddingTop: spacing.xs },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: typography.fontSize.xs },
  pinnedRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  pinnedText: { fontSize: 10, fontFamily: typography.fontFamily.medium },
});
