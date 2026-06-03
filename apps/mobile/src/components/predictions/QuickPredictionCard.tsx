import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import { useAppTheme } from '../../hooks/useAppTheme';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { TeamLogo } from '../common/TeamLogo';
import dayjs from 'dayjs';

interface QuickPredictionCardProps {
  match: any;
  onPress?: () => void;
}

export function QuickPredictionCard({ match, onPress }: QuickPredictionCardProps) {
  const { appColors } = useAppTheme();
  const queryClient = useQueryClient();
  const [home, setHome] = useState(match.userPrediction?.homeScore ?? 1);
  const [away, setAway] = useState(match.userPrediction?.awayScore ?? 0);
  const [saved, setSaved] = useState(!!match.userPrediction);

  const mutation = useMutation({
    mutationFn: async () => (await apiService.post('/predictions', { matchId: match.id, homeScore: home, awayScore: away })).data,
    onSuccess: () => { setSaved(true); queryClient.invalidateQueries({ queryKey: ['upcoming-matches'] }); },
  });

  return (
    <View style={[styles.card, { backgroundColor: appColors.surface }, saved && styles.savedCard]}>
      <Text style={[styles.date, { color: appColors.textSecondary }]}>
        {dayjs(match.matchDate).format('D MMM · HH:mm')}
      </Text>

      <View style={styles.teams}>
        <View style={styles.team}>
          <TeamLogo uri={match.homeTeam.flagUrl} size={36} code={match.homeTeam.code} />
          <Text style={[styles.code, { color: appColors.text }]}>{match.homeTeam.code}</Text>
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
          <TeamLogo uri={match.awayTeam.flagUrl} size={36} code={match.awayTeam.code} />
          <Text style={[styles.code, { color: appColors.text }]}>{match.awayTeam.code}</Text>
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
  date: { fontSize: 10, textAlign: 'center' },
  teams: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  team: { flex: 1, alignItems: 'center', gap: 4 },
  code: { fontSize: 10, fontFamily: typography.fontFamily.bold },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  btn: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 14, fontFamily: typography.fontFamily.bold },
  score: { fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.black, minWidth: 20, textAlign: 'center' },
  dash: { fontSize: 12, marginHorizontal: 2 },
  saveBtn: {
    backgroundColor: appColors => appColors as any, padding: 6,
    borderRadius: borderRadius.full, alignItems: 'center',
    backgroundColor: '#E5E7EB',
  } as any,
  savedBtn: { backgroundColor: colors.primary },
  saveBtnText: { fontSize: 10, fontFamily: typography.fontFamily.bold, color: '#374151' },
  savedBtnText: { color: 'white' },
});
