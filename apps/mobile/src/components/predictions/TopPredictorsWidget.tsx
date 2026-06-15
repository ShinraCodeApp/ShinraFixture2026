import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { apiService } from '../../services/api';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { colors, spacing, typography, borderRadius } from '../../theme';

const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];
const MEDAL_SIZE = [56, 48, 44];

interface Props {
  onSeeAll?: () => void;
}

function Avatar({ uri, name, size }: { uri?: string; name: string; size: number }) {
  const initial = name?.[0]?.toUpperCase() ?? '?';
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View style={[{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: colors.primary,
      alignItems: 'center', justifyContent: 'center',
    }]}>
      <Text style={{ color: 'white', fontSize: size * 0.38, fontFamily: typography.fontFamily.bold }}>
        {initial}
      </Text>
    </View>
  );
}

export function TopPredictorsWidget({ onSeeAll }: Props) {
  const { appColors } = useAppTheme();
  const { user } = useSelector((state: RootState) => state.auth);

  const { data: ranking = [] } = useQuery({
    queryKey: ['global-ranking-home'],
    queryFn: async () => {
      const res = await apiService.get('/predictions/ranking?limit=5');
      // endpoint returns { items: [...], pagination: {...} } or plain array
      const d = res.data.data;
      return Array.isArray(d) ? d : (d?.items ?? []);
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const top3: any[] = ranking.slice(0, 3);
  if (top3.length === 0) return null;

  // Reorder for podium display: 2nd, 1st, 3rd
  const podium = [top3[1], top3[0], top3[2]].filter(Boolean);
  const podiumPositions = [2, 1, 3];

  return (
    <View style={[styles.container, { backgroundColor: appColors.surface }]}>
      {/* Podium */}
      <View style={styles.podium}>
        {podium.map((entry, i) => {
          const pos = podiumPositions[i];
          const isMe = entry.id === user?.id;
          const avatarSize = MEDAL_SIZE[pos - 1];
          const medalColor = MEDAL_COLORS[pos - 1];

          return (
            <View key={entry.id} style={[styles.podiumSlot, pos === 1 && styles.firstSlot]}>
              {/* Medal */}
              <MaterialCommunityIcons
                name="medal"
                size={pos === 1 ? 22 : 18}
                color={medalColor}
                style={{ marginBottom: 2 }}
              />

              {/* Avatar */}
              <View style={[
                styles.avatarWrap,
                { borderColor: isMe ? colors.primary : medalColor, borderWidth: pos === 1 ? 2.5 : 2 },
              ]}>
                <Avatar uri={entry.avatar} name={entry.displayName} size={avatarSize} />
              </View>

              {/* Name */}
              <Text style={[styles.name, { color: appColors.text }]} numberOfLines={1}>
                {isMe ? 'Vos' : entry.displayName.split(' ')[0]}
              </Text>

              {/* Points */}
              <View style={[styles.ptsBadge, { backgroundColor: medalColor + '25' }]}>
                <Text style={[styles.ptsText, { color: medalColor }]}>
                  {entry.predictionPoints}
                </Text>
                <Text style={[styles.ptsLabel, { color: medalColor }]}>pts</Text>
              </View>

              {/* Podium block */}
              <View style={[
                styles.block,
                {
                  height: pos === 1 ? 40 : pos === 2 ? 28 : 20,
                  backgroundColor: medalColor + '30',
                  borderTopColor: medalColor,
                },
              ]} />
            </View>
          );
        })}
      </View>

      {/* Remaining positions (4th, 5th) */}
      {ranking.slice(3, 5).map((entry: any, i: number) => {
        const isMe = entry.id === user?.id;
        return (
          <View key={entry.id} style={[styles.row, { borderTopColor: appColors.border }]}>
            <Text style={[styles.rowRank, { color: appColors.textSecondary }]}>#{i + 4}</Text>
            <Avatar uri={entry.avatar} name={entry.displayName} size={28} />
            <Text style={[styles.rowName, { color: isMe ? colors.primary : appColors.text }]} numberOfLines={1}>
              {isMe ? `${entry.displayName} (vos)` : entry.displayName}
            </Text>
            <Text style={[styles.rowPts, { color: appColors.text }]}>{entry.predictionPoints} pts</Text>
          </View>
        );
      })}

      {/* Footer CTA */}
      {onSeeAll && (
        <TouchableOpacity style={[styles.cta, { borderTopColor: appColors.border }]} onPress={onSeeAll}>
          <MaterialCommunityIcons name="trophy-outline" size={14} color={colors.primary} />
          <Text style={[styles.ctaText, { color: colors.primary }]}>Ver ranking completo</Text>
          <MaterialCommunityIcons name="chevron-right" size={14} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: borderRadius.xl, overflow: 'hidden' },

  podium: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingTop: spacing.base,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
  },
  podiumSlot: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  firstSlot: {
    marginBottom: 0,
  },

  avatarWrap: {
    borderRadius: 999,
    padding: 2,
  },

  name: {
    fontSize: 11,
    fontFamily: typography.fontFamily.semiBold,
    textAlign: 'center',
    maxWidth: 72,
  },
  ptsBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  ptsText: { fontSize: 13, fontFamily: typography.fontFamily.black },
  ptsLabel: { fontSize: 9, fontFamily: typography.fontFamily.medium },

  block: {
    width: '100%',
    borderTopWidth: 2,
    borderRadius: 2,
    marginTop: 4,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowRank: { width: 28, fontSize: 11, fontFamily: typography.fontFamily.bold },
  rowName: { flex: 1, fontSize: 12, fontFamily: typography.fontFamily.medium },
  rowPts: { fontSize: 12, fontFamily: typography.fontFamily.bold },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  ctaText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
  },
});
