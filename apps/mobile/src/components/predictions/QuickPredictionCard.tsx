import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { apiService } from '../../services/api';
import { useAppTheme } from '../../hooks/useAppTheme';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { TeamLogo } from '../common/TeamLogo';
import dayjs from 'dayjs';

interface QuickPredictionCardProps {
  match: any;
  onPress?: () => void;
}

function useCountdown(matchDate: string) {
  const [secondsLeft, setSecondsLeft] = useState(
    Math.floor((new Date(matchDate).getTime() - Date.now()) / 1000)
  );

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { clearInterval(id); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return secondsLeft;
}

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function QuickPredictionCard({ match, onPress }: QuickPredictionCardProps) {
  const { appColors } = useAppTheme();
  const queryClient = useQueryClient();
  const [home, setHome] = useState(match.userPrediction?.homeScore ?? 1);
  const [away, setAway] = useState(match.userPrediction?.awayScore ?? 0);
  const [saved, setSaved] = useState(!!match.userPrediction);

  const secondsLeft = useCountdown(match.matchDate);
  const matchStarted = match.status !== 'SCHEDULED' || secondsLeft <= 0;
  const isFinished = match.status === 'FINISHED';
  const showUrgent = !matchStarted && secondsLeft > 0 && secondsLeft <= 3600; // < 1h

  const mutation = useMutation({
    mutationFn: async () =>
      (await apiService.post('/predictions', { matchId: match.id, homeScore: home, awayScore: away })).data,
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ['upcoming-matches'] });
    },
  });

  if (matchStarted) {
    // Locked card — show prediction if one exists
    return (
      <View style={[styles.card, { backgroundColor: appColors.surface }, styles.lockedCard, { borderColor: appColors.border }]}>
        <View style={styles.lockedBadge}>
          <MaterialCommunityIcons name="lock" size={10} color={appColors.textSecondary} />
          <Text style={[styles.lockedBadgeText, { color: appColors.textSecondary }]}>
            {isFinished ? 'Finalizado' : 'En curso'}
          </Text>
        </View>

        <Text style={[styles.date, { color: appColors.textSecondary }]}>
          {dayjs(match.matchDate).format('D MMM · HH:mm')}
        </Text>

        <View style={styles.teams}>
          <View style={styles.team}>
            <TeamLogo uri={match.homeTeam?.flagUrl} size={32} code={match.homeTeam?.code ?? '?'} />
            <Text style={[styles.code, { color: appColors.text }]}>{match.homeTeam?.code ?? match.homeLabel ?? 'TBD'}</Text>
          </View>

          <View style={styles.lockedScore}>
            {match.userPrediction ? (
              <>
                <Text style={[styles.lockedScoreText, { color: colors.primary }]}>
                  {match.userPrediction.homeScore}-{match.userPrediction.awayScore}
                </Text>
                <Text style={[styles.lockedLabel, { color: appColors.textSecondary }]}>mi pronóstico</Text>
              </>
            ) : (
              <Text style={[styles.lockedLabel, { color: appColors.textSecondary }]}>sin pronóstico</Text>
            )}
          </View>

          <View style={styles.team}>
            <TeamLogo uri={match.awayTeam?.flagUrl} size={32} code={match.awayTeam?.code ?? '?'} />
            <Text style={[styles.code, { color: appColors.text }]}>{match.awayTeam?.code ?? match.awayLabel ?? 'TBD'}</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[
      styles.card,
      { backgroundColor: appColors.surface },
      saved && styles.savedCard,
      showUrgent && styles.urgentCard,
    ]}>
      {showUrgent && (
        <View style={styles.urgentBadge}>
          <MaterialCommunityIcons name="clock-alert" size={10} color={colors.error} />
          <Text style={styles.urgentText}>Cierra en {formatCountdown(secondsLeft)}</Text>
        </View>
      )}

      <Text style={[styles.date, { color: appColors.textSecondary }]}>
        {dayjs(match.matchDate).format('D MMM · HH:mm')}
      </Text>

      <View style={styles.teams}>
        <View style={styles.team}>
          <TeamLogo uri={match.homeTeam?.flagUrl} size={36} code={match.homeTeam?.code ?? '?'} />
          <Text style={[styles.code, { color: appColors.text }]}>{match.homeTeam?.code ?? match.homeLabel ?? 'TBD'}</Text>
        </View>

        <View style={styles.scoreRow}>
          <TouchableOpacity onPress={() => setHome(Math.max(0, home - 1))} style={styles.btn}>
            <Text style={[styles.btnText, { color: appColors.text }]}>−</Text>
          </TouchableOpacity>
          <Text style={[styles.score, { color: appColors.text }]}>{home}</Text>
          <TouchableOpacity onPress={() => setHome(Math.min(15, home + 1))} style={styles.btn}>
            <Text style={[styles.btnText, { color: appColors.text }]}>+</Text>
          </TouchableOpacity>

          <Text style={[styles.dash, { color: appColors.textSecondary }]}>-</Text>

          <TouchableOpacity onPress={() => setAway(Math.max(0, away - 1))} style={styles.btn}>
            <Text style={[styles.btnText, { color: appColors.text }]}>−</Text>
          </TouchableOpacity>
          <Text style={[styles.score, { color: appColors.text }]}>{away}</Text>
          <TouchableOpacity onPress={() => setAway(Math.min(15, away + 1))} style={styles.btn}>
            <Text style={[styles.btnText, { color: appColors.text }]}>+</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.team}>
          <TeamLogo uri={match.awayTeam?.flagUrl} size={36} code={match.awayTeam?.code ?? '?'} />
          <Text style={[styles.code, { color: appColors.text }]}>{match.awayTeam?.code ?? match.awayLabel ?? 'TBD'}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, saved && styles.savedBtn, mutation.isPending && { opacity: 0.7 }]}
        onPress={() => mutation.mutate()}
        disabled={mutation.isPending}
      >
        <Text style={[styles.saveBtnText, saved && styles.savedBtnText]}>
          {saved ? '✓ Guardado' : 'Guardar'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: 180, borderRadius: borderRadius.lg, padding: spacing.sm, gap: spacing.xs },
  savedCard: { borderWidth: 1.5, borderColor: colors.primary },
  lockedCard: { borderWidth: 1, opacity: 0.8 },
  urgentCard: { borderWidth: 1.5, borderColor: colors.error + '80' },

  lockedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    alignSelf: 'center',
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: borderRadius.full,
    backgroundColor: '#00000015',
  },
  lockedBadgeText: { fontSize: 9, fontFamily: typography.fontFamily.medium },

  urgentBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    alignSelf: 'center',
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.error + '15',
  },
  urgentText: {
    fontSize: 9, fontFamily: typography.fontFamily.bold, color: colors.error,
  },

  date: { fontSize: 10, textAlign: 'center' },
  teams: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  team: { flex: 1, alignItems: 'center', gap: 4 },
  code: { fontSize: 10, fontFamily: typography.fontFamily.bold },

  lockedScore: { flex: 1.5, alignItems: 'center', gap: 2 },
  lockedScoreText: { fontSize: 20, fontFamily: typography.fontFamily.black },
  lockedLabel: { fontSize: 9, textAlign: 'center' },

  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  btn: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 14, fontFamily: typography.fontFamily.bold },
  score: { fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.black, minWidth: 20, textAlign: 'center' },
  dash: { fontSize: 12, marginHorizontal: 2 },

  saveBtn: {
    backgroundColor: '#E5E7EB', padding: 6,
    borderRadius: borderRadius.full, alignItems: 'center',
  },
  savedBtn: { backgroundColor: colors.primary },
  saveBtnText: { fontSize: 10, fontFamily: typography.fontFamily.bold, color: '#374151' },
  savedBtnText: { color: 'white' },
});
