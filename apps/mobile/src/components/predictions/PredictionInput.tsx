import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL } from '../../services/api';
import { store } from '../../store';
import { useAppTheme } from '../../hooks/useAppTheme';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { TeamLogo } from '../common/TeamLogo';

interface PredictionInputProps {
  matchId: string;
  homeTeam: { id: string; name: string; code: string; flagUrl?: string };
  awayTeam: { id: string; name: string; code: string; flagUrl?: string };
  userPrediction?: { homeScore: number; awayScore: number; status: string } | null;
}

export function PredictionInput({ matchId, homeTeam, awayTeam, userPrediction }: PredictionInputProps) {
  const { appColors } = useAppTheme();
  const queryClient = useQueryClient();
  const [homeScore, setHomeScore] = useState(userPrediction?.homeScore ?? 0);
  const [awayScore, setAwayScore] = useState(userPrediction?.awayScore ?? 0);

  const mutation = useMutation({
    mutationFn: async () => {
      const token = store.getState().auth.accessToken ?? '';
      const qs = new URLSearchParams({ matchId, homeScore: String(homeScore), awayScore: String(awayScore) }).toString();
      const res = await fetch(`${API_URL}/predictions/g-save?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw Object.assign(new Error(), { response: { data: json } });
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['match', matchId] });
      queryClient.invalidateQueries({ queryKey: ['my-predictions'] });
      Alert.alert('✅ Guardado', `Pronóstico: ${homeScore} - ${awayScore}`);
    },
    onError: (e: any) => Alert.alert('Error', e.response?.data?.message ?? 'No se pudo guardar'),
  });

  const Stepper = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
    <View style={styles.stepper}>
      <TouchableOpacity style={[styles.stepBtn, { backgroundColor: appColors.surfaceSecondary }]} onPress={() => onChange(Math.max(0, value - 1))}>
        <Text style={[styles.stepText, { color: appColors.text }]}>−</Text>
      </TouchableOpacity>
      <Text style={[styles.scoreValue, { color: appColors.text }]}>{value}</Text>
      <TouchableOpacity style={[styles.stepBtn, { backgroundColor: appColors.surfaceSecondary }]} onPress={() => onChange(Math.min(20, value + 1))}>
        <Text style={[styles.stepText, { color: appColors.text }]}>+</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: appColors.surface }]}>
      <Text style={[styles.title, { color: appColors.text }]}>Tu pronóstico</Text>
      <Text style={[styles.subtitle, { color: appColors.textSecondary }]}>
        Acertar el marcador exacto vale 5 puntos
      </Text>

      <View style={styles.row}>
        <View style={styles.teamSide}>
          <TeamLogo uri={homeTeam.flagUrl} size={48} code={homeTeam.code} />
          <Text style={[styles.teamName, { color: appColors.text }]}>{homeTeam.code}</Text>
        </View>

        <View style={styles.center}>
          <View style={styles.scores}>
            <Stepper value={homeScore} onChange={setHomeScore} />
            <Text style={[styles.dash, { color: appColors.textSecondary }]}>-</Text>
            <Stepper value={awayScore} onChange={setAwayScore} />
          </View>
        </View>

        <View style={styles.teamSide}>
          <TeamLogo uri={awayTeam.flagUrl} size={48} code={awayTeam.code} />
          <Text style={[styles.teamName, { color: appColors.text }]}>{awayTeam.code}</Text>
        </View>
      </View>

      {/* Points guide */}
      <View style={[styles.guide, { backgroundColor: appColors.surfaceSecondary }]}>
        {[['Marcador exacto', '5 pts'], ['Ganador + diferencia', '4 pts'], ['Ganador correcto', '3 pts']].map(([desc, pts]) => (
          <View key={desc} style={styles.guideRow}>
            <Text style={[styles.guideDesc, { color: appColors.textSecondary }]}>{desc}</Text>
            <Text style={[styles.guidePts, { color: colors.primary }]}>{pts}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, mutation.isPending && { opacity: 0.7 }]}
        onPress={() => mutation.mutate()}
        disabled={mutation.isPending}
      >
        <Text style={styles.saveBtnText}>
          {userPrediction ? 'Actualizar pronóstico' : 'Guardar pronóstico'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: borderRadius.xl, padding: spacing.xl, gap: spacing.base },
  title: { fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold, textAlign: 'center' },
  subtitle: { fontSize: typography.fontSize.xs, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  teamSide: { flex: 1, alignItems: 'center', gap: spacing.xs },
  teamName: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.bold },
  center: { flex: 1, alignItems: 'center' },
  scores: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepper: { alignItems: 'center', gap: spacing.xs },
  stepBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.bold, lineHeight: 24 },
  scoreValue: { fontSize: typography.fontSize.xxxl, fontFamily: typography.fontFamily.black, minWidth: 40, textAlign: 'center' },
  dash: { fontSize: typography.fontSize.xl },
  guide: { borderRadius: borderRadius.md, padding: spacing.sm, gap: spacing.xs },
  guideRow: { flexDirection: 'row', justifyContent: 'space-between' },
  guideDesc: { fontSize: typography.fontSize.xs },
  guidePts: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.bold },
  saveBtn: { backgroundColor: colors.primary, borderRadius: borderRadius.lg, padding: spacing.base, alignItems: 'center' },
  saveBtnText: { color: 'white', fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.base },
});
