import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../../services/api';
import { useAppTheme } from '../../hooks/useAppTheme';
import { RootState } from '../../store';
import { colors, spacing, typography, borderRadius } from '../../theme';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export function CommentSection({ matchId }: { matchId: string }) {
  const { appColors } = useAppTheme();
  const queryClient = useQueryClient();
  const { user } = useSelector((s: RootState) => s.auth);
  const [text, setText] = useState('');

  const { data } = useQuery({
    queryKey: ['comments', matchId],
    queryFn: async () => (await apiService.get(`/matches/${matchId}/comments?limit=30`)).data.data,
    refetchInterval: 30_000,
  });

  const submittingRef = React.useRef(false);

  const mutation = useMutation({
    mutationFn: async () => {
      if (submittingRef.current) throw new Error('duplicate');
      submittingRef.current = true;
      try {
        return (await apiService.post(`/matches/${matchId}/comments`, { content: text })).data;
      } finally {
        submittingRef.current = false;
      }
    },
    onSuccess: () => { setText(''); queryClient.invalidateQueries({ queryKey: ['comments', matchId] }); },
    onError: (e: any) => { if (e.message !== 'duplicate') submittingRef.current = false; },
  });

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <FlatList
        data={data?.items ?? []}
        keyExtractor={(c: any) => c.id}
        scrollEnabled={false}
        contentContainerStyle={{ gap: spacing.sm }}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: appColors.textSecondary }]}>Sin comentarios aún. ¡Sé el primero!</Text>
        }
        renderItem={({ item }: { item: any }) => (
          <View style={[styles.comment, { backgroundColor: appColors.surface }]}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>{item.user?.displayName?.[0] ?? 'U'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.commentHeader}>
                <Text style={[styles.commentUser, { color: appColors.text }]}>{item.user?.displayName}</Text>
                <Text style={[styles.commentTime, { color: appColors.textSecondary }]}>{dayjs(item.createdAt).fromNow()}</Text>
              </View>
              <Text style={[styles.commentText, { color: appColors.textSecondary }]}>{item.content}</Text>
            </View>
          </View>
        )}
      />

      {user && (
        <View style={[styles.inputRow, { borderTopColor: appColors.border }]}>
          <TextInput
            style={[styles.input, { backgroundColor: appColors.surfaceSecondary, color: appColors.text }]}
            placeholder="Escribe un comentario..."
            placeholderTextColor={appColors.textSecondary}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || mutation.isPending) && { opacity: 0.5 }]}
            onPress={() => mutation.mutate()}
            disabled={!text.trim() || mutation.isPending}
          >
            <Ionicons name="send" size={18} color="white" />
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  empty: { textAlign: 'center', paddingVertical: spacing.xl, fontSize: typography.fontSize.sm },
  comment: { flexDirection: 'row', gap: spacing.sm, padding: spacing.sm, borderRadius: borderRadius.md },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { color: 'white', fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.sm },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  commentUser: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.medium },
  commentTime: { fontSize: 10 },
  commentText: { fontSize: typography.fontSize.sm, lineHeight: 18 },
  inputRow: { flexDirection: 'row', gap: spacing.sm, paddingTop: spacing.base, marginTop: spacing.base, borderTopWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, borderRadius: borderRadius.md, paddingHorizontal: spacing.base, paddingVertical: spacing.sm, fontSize: typography.fontSize.sm, maxHeight: 80 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end' },
});
