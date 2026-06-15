import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { apiService } from '../../services/api';
import { useAppTheme } from '../../hooks/useAppTheme';
import { colors, spacing, typography, borderRadius } from '../../theme';

interface Props {
  matchId: string;
}

function Avatar({ uri, name }: { uri?: string | null; name: string }) {
  if (uri) {
    return <Image source={{ uri }} style={styles.avatar} />;
  }
  return (
    <View style={[styles.avatar, { backgroundColor: colors.primary + '33', alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ color: colors.primary, fontFamily: typography.fontFamily.bold, fontSize: 14 }}>
        {name?.[0]?.toUpperCase() ?? '?'}
      </Text>
    </View>
  );
}

export function FriendPredictions({ matchId }: Props) {
  const { appColors } = useAppTheme();

  const { data: predictions = [] } = useQuery<any[]>({
    queryKey: ['friend-predictions', matchId],
    queryFn: async () => {
      const r = await apiService.get(`/matches/${matchId}/friend-predictions`);
      return r.data.data ?? [];
    },
    staleTime: 60_000,
  });

  if (predictions.length === 0) return null;

  return (
    <View style={[styles.card, { backgroundColor: appColors.surface }]}>
      <View style={styles.titleRow}>
        <MaterialCommunityIcons name="account-group" size={14} color={colors.primary} />
        <Text style={[styles.title, { color: appColors.textSecondary }]}>
          PRONÓSTICOS DE AMIGOS · {predictions.length}
        </Text>
      </View>

      {predictions.map((p: any) => {
        const statusColor = p.status === 'WON' ? '#4CAF50' : p.status === 'LOST' ? '#EF4444' : appColors.textSecondary;
        return (
          <View key={p.userId} style={[styles.row, { borderTopColor: appColors.border }]}>
            <Avatar uri={p.avatar} name={p.displayName} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: appColors.text }]}>{p.displayName}</Text>
              <Text style={[styles.username, { color: appColors.textSecondary }]}>@{p.username}</Text>
            </View>
            <View style={styles.predCol}>
              <Text style={[styles.score, { color: appColors.text }]}>
                {p.homeScore} - {p.awayScore}
              </Text>
              {p.status !== 'PENDING' && (
                <View style={[styles.badge, { backgroundColor: statusColor + '20' }]}>
                  <Text style={[styles.badgeText, { color: statusColor }]}>
                    {p.status === 'WON' ? `+${p.pointsEarned} pts` : '0 pts'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: borderRadius.xl, padding: spacing.base, marginTop: spacing.base },
  titleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 10, fontFamily: typography.fontFamily.bold,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth,
  },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  name: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.semiBold },
  username: { fontSize: 11 },
  predCol: { alignItems: 'flex-end', gap: 4 },
  score: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.black },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: borderRadius.full },
  badgeText: { fontSize: 10, fontFamily: typography.fontFamily.bold },
});
