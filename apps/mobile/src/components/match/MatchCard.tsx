import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
  homeTeam?: Team | null;
  awayTeam?: Team | null;
  homeLabel?: string | null;
  awayLabel?: string | null;
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
  const predictionClosed = !isScheduled || new Date(match.matchDate) <= new Date();

  const borderColor = predictionStatus === 'WON'
    ? colors.success
    : predictionStatus === 'LOST'
    ? colors.error
    : isLive
    ? colors.live
    : appColors.border;

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      <View
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
            {match.stage === 'GROUP' ? (match.group ? `Grupo ${match.group}` : 'Fase de Grupos') : match.stage.replace(/_/g, ' ')}
          </Text>
          <MatchStatusBadge status={match.status} minute={match.minute} compact />
        </View>

        {/* Main Score Row */}
        <View style={styles.body}>
          {/* Home Team */}
          <View style={styles.team}>
            {match.homeTeam ? (
              <>
                <TeamLogo uri={match.homeTeam.flagUrl} size={compact ? 32 : 40} code={match.homeTeam.code} />
                <Text style={[styles.teamName, { color: appColors.text }]} numberOfLines={1}>
                  {match.homeTeam.code}
                </Text>
              </>
            ) : (
              <>
                <View style={[styles.tbdBadge, { width: compact ? 32 : 40, height: compact ? 32 : 40 }]}>
                  <Text style={styles.tbdText}>{match.homeLabel ?? '?'}</Text>
                </View>
                <Text style={[styles.teamName, { color: appColors.textSecondary }]} numberOfLines={1}>
                  {match.homeLabel ?? 'TBD'}
                </Text>
              </>
            )}
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
            {match.awayTeam ? (
              <>
                <TeamLogo uri={match.awayTeam.flagUrl} size={compact ? 32 : 40} code={match.awayTeam.code} />
                <Text style={[styles.teamName, { color: appColors.text }]} numberOfLines={1}>
                  {match.awayTeam.code}
                </Text>
              </>
            ) : (
              <>
                <View style={[styles.tbdBadge, { width: compact ? 32 : 40, height: compact ? 32 : 40 }]}>
                  <Text style={styles.tbdText}>{match.awayLabel ?? '?'}</Text>
                </View>
                <Text style={[styles.teamName, { color: appColors.textSecondary }]} numberOfLines={1}>
                  {match.awayLabel ?? 'TBD'}
                </Text>
              </>
            )}
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

        {/* Closed — no prediction made */}
        {showPrediction && !hasPrediction && predictionClosed && (
          <View style={[styles.predictionRow, styles.closedRow, { borderTopColor: appColors.border }]}>
            <MaterialCommunityIcons name="lock-outline" size={12} color={appColors.textSecondary} />
            <Text style={[styles.predLabel, { color: appColors.textSecondary }]}>Sin pronóstico · cerrado</Text>
          </View>
        )}

        {/* Open — no prediction yet */}
        {showPrediction && !hasPrediction && !predictionClosed && (
          <View style={[styles.predictionRow, { borderTopColor: appColors.border }]}>
            <MaterialCommunityIcons name="lightning-bolt-outline" size={12} color={colors.primary} />
            <Text style={[styles.predLabel, { color: colors.primary }]}>Pronosticá este partido</Text>
          </View>
        )}
      </View>
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
  tbdBadge: {
    borderRadius: 100,
    backgroundColor: 'rgba(156,163,175,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(156,163,175,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tbdText: { fontSize: 9, fontFamily: typography.fontFamily.bold, color: '#9CA3AF', textAlign: 'center' },
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
  closedRow: { opacity: 0.6 },
  predLabel: { fontSize: typography.fontSize.xs },
  predScore: { flex: 1, fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.bold },
  pointsBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full },
  pointsText: { color: 'white', fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.bold },
});
