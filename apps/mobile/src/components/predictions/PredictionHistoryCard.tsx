import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../../hooks/useAppTheme';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { TeamLogo } from '../common/TeamLogo';
import dayjs from 'dayjs';

export function PredictionHistoryCard({ prediction }: { prediction: any }) {
  const { appColors } = useAppTheme();
  const { match, homeScore, awayScore, status, pointsEarned } = prediction;
  if (!match) return null;

  const statusColor = status === 'WON' ? colors.success : status === 'LOST' ? colors.error : colors.warning;
  const statusIcon = status === 'WON' ? 'check-circle' : status === 'LOST' ? 'close-circle' : 'clock-outline';

  return (
    <View style={[styles.card, { backgroundColor: appColors.surface }]}>
      <View style={styles.header}>
        <Text style={[styles.date, { color: appColors.textSecondary }]}>
          {dayjs(match.matchDate).format('D MMM YYYY')}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
          <MaterialCommunityIcons name={statusIcon as any} size={12} color={statusColor} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {status === 'WON' ? `+${pointsEarned} pts` : status === 'LOST' ? '0 pts' : 'Pendiente'}
          </Text>
        </View>
      </View>

      <View style={styles.matchRow}>
        <View style={styles.team}>
          <TeamLogo uri={match.homeTeam.flagUrl} size={28} code={match.homeTeam.code} />
          <Text style={[styles.teamCode, { color: appColors.text }]}>{match.homeTeam.code}</Text>
        </View>

        <View style={styles.center}>
          <View style={styles.scores}>
            <Text style={[styles.actualScore, { color: appColors.text }]}>
              {match.homeScore ?? '-'} - {match.awayScore ?? '-'}
            </Text>
          </View>
          <Text style={[styles.myScore, { color: colors.primary }]}>
            Mi pronóstico: {homeScore} - {awayScore}
          </Text>
        </View>

        <View style={styles.team}>
          <TeamLogo uri={match.awayTeam.flagUrl} size={28} code={match.awayTeam.code} />
          <Text style={[styles.teamCode, { color: appColors.text }]}>{match.awayTeam.code}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: borderRadius.lg, padding: spacing.base, gap: spacing.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { fontSize: typography.fontSize.xs },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: borderRadius.full },
  statusText: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.bold },
  matchRow: { flexDirection: 'row', alignItems: 'center' },
  team: { flex: 1, alignItems: 'center', gap: 4 },
  teamCode: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.bold },
  center: { flex: 1.5, alignItems: 'center', gap: 2 },
  scores: {},
  actualScore: { fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.black },
  myScore: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.medium },
});
