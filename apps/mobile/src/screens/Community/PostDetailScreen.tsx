import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import { useAppTheme } from '../../hooks/useAppTheme';
import { colors, spacing, typography, borderRadius } from '../../theme';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primary + '33', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.primary, fontFamily: typography.fontFamily.bold, fontSize: size * 0.38 }}>
        {name?.[0]?.toUpperCase() ?? '?'}
      </Text>
    </View>
  );
}

export function PostDetailScreen() {
  const { appColors } = useAppTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { postId } = route.params;
  const qc = useQueryClient();
  const inputRef = useRef<TextInput>(null);
  const [reply, setReply] = useState('');

  const { data: post, isLoading } = useQuery({
    queryKey: ['forum-post', postId],
    queryFn: async () => (await apiService.get(`/community/forum/${postId}`)).data.data,
    staleTime: 30_000,
  });

  const { data: replies = [], refetch: refetchReplies } = useQuery({
    queryKey: ['forum-replies', postId],
    queryFn: async () => (await apiService.get(`/community/forum/${postId}/replies`)).data.data ?? [],
    staleTime: 30_000,
  });

  const replyMutation = useMutation({
    mutationFn: (content: string) => apiService.post(`/community/forum/${postId}/replies`, { content }),
    onSuccess: () => {
      setReply('');
      qc.invalidateQueries({ queryKey: ['forum-replies', postId] });
      qc.invalidateQueries({ queryKey: ['forum', ] });
    },
    onError: (e: any) => Alert.alert('Error', e?.response?.data?.message ?? 'No se pudo responder'),
  });

  const canSend = reply.trim().length >= 2 && !replyMutation.isPending;

  if (isLoading || !post) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: appColors.background }]} edges={['top']}>
        <View style={[styles.header, { borderBottomColor: appColors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={appColors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: appColors.text }]}>Publicación</Text>
          <View style={{ width: 24 }} />
        </View>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appColors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: appColors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={appColors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: appColors.text }]}>Comunidad</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          data={replies as any[]}
          keyExtractor={(r: any) => r.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          onRefresh={refetchReplies}
          refreshing={false}
          ListHeaderComponent={
            <View style={[styles.postCard, { backgroundColor: appColors.surface }]}>
              <View style={styles.postHeader}>
                <Avatar name={post.user?.displayName ?? 'U'} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.userName, { color: appColors.text }]}>{post.user?.displayName}</Text>
                  <Text style={[styles.postTime, { color: appColors.textSecondary }]}>{timeAgo(post.createdAt)}</Text>
                </View>
                <View style={[styles.catTag, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.catTagText, { color: colors.primary }]}>{post.category}</Text>
                </View>
              </View>
              <Text style={[styles.postTitle, { color: appColors.text }]}>{post.title}</Text>
              <Text style={[styles.postContent, { color: appColors.textSecondary }]}>{post.content}</Text>
              <View style={styles.postFooter}>
                <Ionicons name="chatbubble-outline" size={14} color={appColors.textSecondary} />
                <Text style={[styles.footerText, { color: appColors.textSecondary }]}>{(replies as any[]).length} respuestas</Text>
                <Ionicons name="eye-outline" size={14} color={appColors.textSecondary} style={{ marginLeft: 8 }} />
                <Text style={[styles.footerText, { color: appColors.textSecondary }]}>{post.viewsCount}</Text>
              </View>
              {(replies as any[]).length > 0 && (
                <Text style={[styles.repliesLabel, { color: appColors.textSecondary }]}>RESPUESTAS</Text>
              )}
            </View>
          }
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: appColors.textSecondary }]}>Sé el primero en responder</Text>
          }
          renderItem={({ item }: { item: any }) => (
            <View style={[styles.replyCard, { backgroundColor: appColors.surface }]}>
              <Avatar name={item.user?.displayName ?? 'U'} size={30} />
              <View style={{ flex: 1 }}>
                <View style={styles.replyHeader}>
                  <Text style={[styles.replyUser, { color: appColors.text }]}>{item.user?.displayName}</Text>
                  <Text style={[styles.replyTime, { color: appColors.textSecondary }]}>{timeAgo(item.createdAt)}</Text>
                </View>
                <Text style={[styles.replyContent, { color: appColors.textSecondary }]}>{item.content}</Text>
              </View>
            </View>
          )}
        />

        {/* Reply input */}
        <View style={[styles.replyBar, { backgroundColor: appColors.surface, borderTopColor: appColors.border }]}>
          <TextInput
            ref={inputRef}
            style={[styles.replyInput, { color: appColors.text }]}
            placeholder="Escribe una respuesta..."
            placeholderTextColor={appColors.textSecondary}
            value={reply}
            onChangeText={setReply}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: canSend ? colors.primary : appColors.border }]}
            onPress={() => canSend && replyMutation.mutate(reply.trim())}
            disabled={!canSend}
          >
            {replyMutation.isPending
              ? <ActivityIndicator color="white" size="small" />
              : <Ionicons name="send" size={16} color="white" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  title: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.bold },
  list: { padding: spacing.base, gap: spacing.sm, paddingBottom: 24 },
  postCard: { borderRadius: borderRadius.xl, padding: spacing.base, marginBottom: spacing.sm, gap: spacing.sm },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  userName: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.semiBold },
  postTime: { fontSize: typography.fontSize.xs },
  catTag: { paddingHorizontal: spacing.xs, paddingVertical: 2, borderRadius: borderRadius.xs },
  catTagText: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.medium },
  postTitle: { fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold },
  postContent: { fontSize: typography.fontSize.base, lineHeight: 22 },
  postFooter: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText: { fontSize: typography.fontSize.xs },
  repliesLabel: {
    fontSize: 10, fontFamily: typography.fontFamily.bold, letterSpacing: 0.8,
    marginTop: spacing.xs,
  },
  emptyText: { fontSize: typography.fontSize.sm, textAlign: 'center', paddingVertical: spacing.xl },
  replyCard: {
    flexDirection: 'row', gap: spacing.sm, padding: spacing.base,
    borderRadius: borderRadius.lg,
  },
  replyHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  replyUser: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.semiBold },
  replyTime: { fontSize: typography.fontSize.xs },
  replyContent: { fontSize: typography.fontSize.sm, lineHeight: 18 },
  replyBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm,
    paddingHorizontal: spacing.base, paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  replyInput: { flex: 1, fontSize: typography.fontSize.base, maxHeight: 80, paddingVertical: 6 },
  sendBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
});
