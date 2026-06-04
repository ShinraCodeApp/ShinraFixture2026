import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAppTheme } from '../../hooks/useAppTheme';
import { spacing, typography, borderRadius, colors } from '../../theme';
import { apiService as apiClient } from '../../services/api';

interface Props {
  matchId: string;
}

export function MatchLineups({ matchId }: Props) {
  const { appColors } = useAppTheme();

  const { data, isLoading } = useQuery({
    queryKey: ['match-lineups', matchId],
    queryFn: async () => {
      const res = await apiClient.get(`/matches/${matchId}/lineups`);
      return res.data?.data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!data?.length) {
    return (
      <View style={styles.center}>
        <Text style={{ color: appColors.textSecondary, fontSize: typography.fontSize.sm }}>
          Alineaciones no disponibles
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: appColors.surface, borderRadius: borderRadius.lg }]}>
      <Text style={[styles.title, { color: appColors.text }]}>Alineaciones</Text>
      {data.map((player: any) => (
        <View key={player.playerId ?? player.id} style={styles.playerRow}>
          <Text style={[styles.playerName, { color: appColors.text }]}>
            {player.player?.name ?? 'Jugador'}
          </Text>
          <Text style={[styles.rating, { color: colors.primary }]}>
            {player.rating ? player.rating.toFixed(1) : '-'}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.base, marginVertical: spacing.sm },
  center: { padding: spacing.xl, alignItems: 'center' },
  title: { fontSize: typography.fontSize.md, fontFamily: 'Inter_700Bold', marginBottom: spacing.md },
  playerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  playerName: { fontSize: typography.fontSize.sm, fontFamily: 'Inter_500Medium' },
  rating: { fontSize: typography.fontSize.sm, fontFamily: 'Inter_700Bold' },
});
