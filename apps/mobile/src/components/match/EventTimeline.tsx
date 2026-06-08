import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../../hooks/useAppTheme';
import { colors, spacing, typography, borderRadius } from '../../theme';

interface MatchEvent {
  id: string;
  minute: number;
  extraTime?: number | null;
  type: string;
  teamId?: string | null;
  scorer?: { id: string; name: string } | null;
  assist?: { id: string; name: string } | null;
  cardReceiver?: { id: string; name: string } | null;
  playerIn?: { id: string; name: string } | null;
  playerOut?: { id: string; name: string } | null;
  description?: string | null;
}

interface EventTimelineProps {
  events: MatchEvent[];
  homeTeamId: string;
}

const EVENT_CONFIG: Record<string, { icon: string; color: string; label: (e: MatchEvent) => string }> = {
  GOAL: { icon: 'soccer', color: colors.primary, label: (e) => e.scorer?.name ?? e.description ?? 'Gol' },
  OWN_GOAL: { icon: 'soccer', color: colors.error, label: (e) => `${e.scorer?.name ?? e.description ?? ''} (en propia)` },
  PENALTY_SCORED: { icon: 'soccer', color: colors.primary, label: (e) => `${e.scorer?.name ?? e.description ?? ''} (pen)` },
  PENALTY_MISSED: { icon: 'close-circle', color: colors.error, label: (e) => `${e.scorer?.name ?? e.description ?? ''} (fallo pen)` },
  YELLOW_CARD: { icon: 'card', color: '#FBBF24', label: (e) => e.cardReceiver?.name ?? e.description ?? '' },
  RED_CARD: { icon: 'card', color: colors.error, label: (e) => e.cardReceiver?.name ?? e.description ?? '' },
  SECOND_YELLOW: { icon: 'card', color: colors.error, label: (e) => `${e.cardReceiver?.name ?? e.description ?? ''} (2ª AM)` },
  SUBSTITUTION_IN: { icon: 'swap-vertical', color: '#10B981', label: (e) => `↑ ${e.playerIn?.name ?? ''} ↓ ${e.playerOut?.name ?? e.description ?? ''}` },
  HALF_TIME: { icon: 'pause-circle', color: '#6B7280', label: () => 'Medio tiempo' },
  FULL_TIME: { icon: 'flag-checkered', color: '#6B7280', label: () => 'Fin del partido' },
  VAR_REVIEW: { icon: 'monitor', color: '#8B5CF6', label: (e) => e.description ?? 'Revisión VAR' },
};

export function EventTimeline({ events, homeTeamId }: EventTimelineProps) {
  const { appColors } = useAppTheme();

  if (!events.length) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: appColors.textSecondary }]}>
          Sin eventos registrados
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: appColors.text }]}>Cronología</Text>
      {events.map((event) => {
        const cfg = EVENT_CONFIG[event.type];
        if (!cfg) return null;
        const isHome = event.teamId === homeTeamId;

        return (
          <View key={event.id} style={[styles.row, isHome ? styles.rowHome : styles.rowAway]}>
            {/* Home side */}
            {isHome ? (
              <View style={[styles.side, styles.sideHome]}>
                <Text style={[styles.playerName, { color: appColors.text }]} numberOfLines={1}>
                  {cfg.label(event)}
                </Text>
              </View>
            ) : <View style={styles.side} />}

            {/* Center: minute + icon */}
            <View style={styles.center}>
              <Text style={[styles.minute, { color: appColors.textSecondary }]}>
                {event.minute}{event.extraTime ? `+${event.extraTime}` : ''}'
              </Text>
              <View style={[styles.iconContainer, { backgroundColor: `${cfg.color}20` }]}>
                <MaterialCommunityIcons name={cfg.icon as any} size={14} color={cfg.color} />
              </View>
            </View>

            {/* Away side */}
            {!isHome ? (
              <View style={[styles.side, styles.sideAway]}>
                <Text style={[styles.playerName, { color: appColors.text }]} numberOfLines={1}>
                  {cfg.label(event)}
                </Text>
              </View>
            ) : <View style={styles.side} />}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.base },
  title: { fontSize: typography.fontSize.base, fontFamily: 'Inter_700Bold', marginBottom: spacing.sm },
  empty: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyText: { fontSize: typography.fontSize.sm },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  rowHome: {},
  rowAway: {},
  side: { flex: 1 },
  sideHome: { paddingRight: spacing.xs, alignItems: 'flex-end' },
  sideAway: { paddingLeft: spacing.xs, alignItems: 'flex-start' },
  center: { alignItems: 'center', gap: 2, minWidth: 50 },
  minute: { fontSize: 10, fontFamily: 'Inter_500Medium' },
  iconContainer: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  playerName: { fontSize: typography.fontSize.xs, fontFamily: 'Inter_500Medium' },
});
