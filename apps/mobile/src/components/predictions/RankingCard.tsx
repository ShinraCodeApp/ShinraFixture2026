import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../../hooks/useAppTheme';
import { colors, spacing, typography, borderRadius } from '../../theme';

interface RankingEntry {
  id: string; username: string; displayName: string; avatar?: string;
  predictionPoints: number; correctPredictions: number; totalPredictions: number;
  level: number; country?: string; rank: number;
}

export function RankingCard({ entry, position, currentUserId, onPress }: { entry: RankingEntry; position: number; currentUserId?: string; onPress?: () => void }) {
  const { appColors } = useAppTheme();
  const isMe = entry.id === currentUserId;
  const medalColor = position === 1 ? '#FFD700' : position === 2 ? '#C0C0C0' : position === 3 ? '#CD7F32' : null;

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.75 : 1}
      onPress={onPress}
      style={[styles.card, { backgroundColor: appColors.surface }, isMe && { borderWidth: 1.5, borderColor: colors.primary }]}
    >
      <View style={styles.rankBox}>
        {medalColor ? (
          <MaterialCommunityIcons name="medal" size={20} color={medalColor} />
        ) : (
          <Text style={[styles.rankNum, { color: appColors.textSecondary }]}>#{position}</Text>
        )}
      </View>

      <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
        {entry.avatar ? (
          <Image source={{ uri: entry.avatar }} style={{ width: 40, height: 40, borderRadius: 20 }} />
        ) : (
          <Text style={styles.avatarText}>{entry.displayName[0]?.toUpperCase()}</Text>
        )}
      </View>

      <View style={{ flex: 1 }}>
        <Text style={[styles.name, { color: appColors.text }]}>
          {entry.displayName} {isMe && <Text style={{ color: colors.primary }}>(tú)</Text>}
        </Text>
        <Text style={[styles.username, { color: appColors.textSecondary }]}>@{entry.username} · Nivel {entry.level}</Text>
      </View>

      <View style={styles.points}>
        <Text style={[styles.pts, { color: isMe ? colors.primary : appColors.text }]}>{entry.predictionPoints}</Text>
        <Text style={[styles.ptsLabel, { color: appColors.textSecondary }]}>pts</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: borderRadius.lg },
  rankBox: { width: 28, alignItems: 'center' },
  rankNum: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.bold },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: 'white', fontFamily: typography.fontFamily.bold },
  name: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.medium },
  username: { fontSize: typography.fontSize.xs },
  points: { alignItems: 'flex-end' },
  pts: { fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.black },
  ptsLabel: { fontSize: 10 },
});
