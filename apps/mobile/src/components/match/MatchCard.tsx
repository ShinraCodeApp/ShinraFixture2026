import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MotiView } from 'moti';
import dayjs from 'dayjs';
import 'dayjs/locale/es';

import { useAppTheme } from '../../hooks/useAppTheme';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { TeamLogo } from '../common/TeamLogo';
import { MatchStatusBadge } from './MatchStatusBadge';

dayjs.locale('es');

interface Team {
  id: string;
  name: string;
  shortName?: string;
  code: string;
  flagUrl?: string;
}

interface UserPrediction {
  homeScore: number;
  awayScore: number;
  status: string;
  pointsEarned: number;
}

interface Match {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  homeScore?: number | null;
  awayScore?: number | null;
  matchDate: string;
  status: string;
  minute?: number | null;
  stage: string;
  group?: string | null;
  homeWinProb?: number | null;
  drawProb?: number | null;
  awayWinProb?: number | null;
  userPrediction?: UserPrediction | null;
  venue?: string;
}

interface MatchCardProps {
  match: Match;
  onPress: () => void;
  showPrediction?: boolean;
  compact?: boolean;
}

export function MatchCard({ match, onPress, showPrediction = false, compact = false }: MatchCardProps) {
  const { appColors } = useAppTheme();
  const isLive = match.status === 'LIVE' || match.status === 'HALF_TIME';
  const isFinished = match.status === 'FINISHED';
  const isScheduled = match.status === 'SCHEDULED';

  const predictionStatus = match.userPrediction?.status;
  const hasPrediction = !!match.userPrediction;

  const borderColor = predictionStatus === 'WON'
    ? colors.success
    : predictionStatus === 'LOST'
    ? colors.error
    : isLive
    ? colors.live
    : appColors.border;

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      <MotiView
        from={{ opacity: 0, translateY: 4 }}
        animate={{ opacity: 1, translateY: 0 }}
        style={[
          styles.card,
          {
            backgroundColor: appColors.surface,
            borderColor,
            borderWidth: (isLive || hasPrediction) ? 1.5 : StyleSheet.hairlineWidth,
          },
          shadows.sm,
        ]}
      >
        {/* Stage / Group header */}
        <View style={[styles.header, { borderBottomColor: appColors.border }]}>
          <Text style={[styles.stageText, { color: appColors.textSecondary }]}>
            {match.stage === 'GROUP' ? `Grupo ${match.group}` : match.stage.replace(/_/g, ' ')}
          </Text>
          <MatchStatusBadge status={match.status} minute={match.minute} compact />
        </View>

        {/* Main Score Row */}
        <View style={styles.body}>
          {/* Home Team */}
          <View style={styles.team}>
            <TeamLogo uri={match.homeTeam.flagUrl} size={compact ? 32 : 40} />
            <Text style={[styles.teamName, { color: appColors.text }]} numberOfLines={1}>
              {match.homeTeam.code}
            </Text>
          </View>

          {/* Center: score or time */}
          <View style={styles.center}>
            {isScheduled ? (
              <View style={styles.timeContainer}>
                <Text style={[styles.time, { color: appColors.text }]}>
                  {dayjs(match.matchDate).format('HH:mm')}
                </Text>
                <Text style={[styles.date, { color: appColors.textSecondary }]}>
                  {dayjs(match.matchDate).format('D MMM')}
                </Text>
              </View>
            ) : (
              <View style={styles.scoreContainer}>
                <Text style={[styles.score, { color: isLive ? colors.live : appColors.text }]}>
                  {match.homeScore ?? 0}
                </Text>
                <Text style={[styles.scoreDash, { color: appColors.textSecondary }]}>-</Text>
                <Text style={[styles.score, { color: isLive ? colors.live : appColors.text }]}>
                  {match.awayScore ?? 0}
                </Text>
              </View>
            )}

            {/* AI Probabilities for scheduled */}
            {isScheduled && match.homeWinProb !== null && match.homeWinProb !== undefined && (
              <View style={styles.probRow}>
                <Text style={[styles.prob, { color: colors.primary }]}>
                  {Math.round((match.homeWinProb ?? 0) * 100)}%
                </Text>
                <Text style={[styles.prob, { color: appColors.textSecondary }]}>
                  {Math.round((match.drawProb ?? 0) * 100)}%
                </Text>
                <Text style={[styles.prob, { color: colors.secondary ?? '#1565C0' }]}>
                  {Math.round((match.awayWinProb ?? 0) * 100)}%
                </Text>
              </View>
            )}
          </View>

          {/* Away Team */}
          <View style={[styles.team, styles.teamRight]}>
            <TeamLogo uri={match.awayTeam.flagUrl} size={compact ? 32 : 40} />
            <Text style={[styles.teamName, { color: appColors.text }]} numberOfLines={1}>
              {match.awayTeam.code}
            </Text>
          </View>
        </View>

        {/* Prediction Row */}
        {showPrediction && hasPrediction && (
          <View style={[styles.predictionRow, { borderTopColor: appColors.border }]}>
            <Text style={[styles.predLabel, { color: appColors.textSecondary }]}>Tu pronóstico:</Text>
            <Text style={[styles.predScore, { color: appColors.text }]}>
              {match.userPrediction!.homeScore} - {match.userPrediction!.awayScore}
            </Text>
            {predictionStatus !== 'PENDING' && (
              <View style={[styles.pointsBadge, { backgroundColor: predictionStatus === 'WON' ? colors.success : colors.error }]}>
                <Text style={styles.pointsText}>
                  {predictionStatus === 'WON' ? `+${match.userPrediction!.pointsEarned} pts` : '0 pts'}
                </Text>
              </View>
            )}
          </View>
        )}
      </MotiView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xs,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stageText: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.medium, textTransform: 'uppercase', letterSpacing: 0.5 },
  body: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.base, paddingVertical: spacing.md },
  team: { flex: 1, alignItems: 'center', gap: spacing.xs },
  teamRight: {},
  teamName: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.bold, textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', gap: 4 },
  timeContainer: { alignItems: 'center' },
  time: { fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.bold },
  date: { fontSize: typography.fontSize.xs },
  scoreContainer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  score: { fontSize: typography.fontSize.xxl, fontFamily: typography.fontFamily.black },
  scoreDash: { fontSize: typography.fontSize.lg },
  probRow: { flexDirection: 'row', gap: spacing.md },
  prob: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.medium },
  predictionRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.base, paddingVertical: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  predLabel: { fontSize: typography.fontSize.xs },
  predScore: { flex: 1, fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.bold },
  pointsBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full },
  pointsText: { color: 'white', fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.bold },
});
