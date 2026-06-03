import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { MotiView } from 'moti';

import { useAppTheme } from '../../hooks/useAppTheme';
import { apiService } from '../../services/api';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { TeamLogo } from '../../components/common/TeamLogo';

interface SimulatedMatch {
  id: string;
  stage: string;
  group?: string;
  homeTeam: { name: string; code: string; flagUrl?: string };
  awayTeam: { name: string; code: string; flagUrl?: string };
  result?: { homeScore: number; awayScore: number };
}

export function SimulatorScreen() {
  const { appColors, isDark } = useAppTheme();
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<SimulatedMatch[] | null>(null);
  const [champion, setChampion] = useState<string | null>(null);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [mode, setMode] = useState<'manual' | 'ai'>('ai');
  const TOURNAMENT_ID = 'wc-2026'; // Would come from store/API

  const runSimulation = async () => {
    setIsRunning(true);
    try {
      const endpoint = mode === 'ai' ? '/simulator/run-ai' : '/simulator/run';
      const response = await apiService.post(endpoint, { tournamentId: TOURNAMENT_ID });
      const data = response.data.data;
      setResults(data.matchResults);
      setChampion(data.champion);
      setShareCode(data.shareCode);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message ?? 'No se pudo simular el torneo');
    } finally {
      setIsRunning(false);
    }
  };

  const handleShare = async () => {
    if (!shareCode) return;
    await Share.share({
      message: `¡Simulé el Mundial 2026 con ShinraFixture! 🏆 Campeón: ${champion}\nVe mi simulación: shinrafixture.com/sim/${shareCode}`,
    });
  };

  const groupMatches = results?.filter((m) => m.stage === 'GROUP') ?? [];
  const knockoutMatches = results?.filter((m) => m.stage !== 'GROUP') ?? [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appColors.background }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient colors={isDark ? ['#0F172A', '#1E293B'] : ['#001489', '#1565C0']} style={styles.hero}>
          <Text style={styles.heroTitle}>Simulador del Mundial</Text>
          <Text style={styles.heroSub}>FIFA World Cup 2026™</Text>

          {/* Mode Selector */}
          <View style={styles.modeContainer}>
            {(['ai', 'manual'] as const).map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.modeButton, mode === m && styles.modeButtonActive]}
                onPress={() => setMode(m)}
              >
                <MaterialCommunityIcons
                  name={m === 'ai' ? 'robot' : 'pencil'}
                  size={16}
                  color={mode === m ? colors.primary : 'rgba(255,255,255,0.7)'}
                />
                <Text style={[styles.modeLabel, { color: mode === m ? colors.primary : 'rgba(255,255,255,0.7)' }]}>
                  {m === 'ai' ? 'Automático (IA)' : 'Manual'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.runButton, isRunning && styles.runButtonDisabled]}
            onPress={runSimulation}
            disabled={isRunning}
          >
            {isRunning ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <MaterialCommunityIcons name="play-circle" size={20} color="white" />
                <Text style={styles.runButtonText}>
                  {results ? 'Simular de nuevo' : 'Iniciar simulación'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </LinearGradient>

        {/* ── Champion Card ─────────────────────────── */}
        {champion && (
          <MotiView
            from={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring' }}
            style={[styles.championCard, { backgroundColor: appColors.surface }]}
          >
            <LinearGradient
              colors={['#C9A84C', '#FFD700', '#C9A84C']}
              style={styles.championGradient}
            >
              <MaterialCommunityIcons name="trophy" size={32} color="white" />
              <Text style={styles.championLabel}>CAMPEÓN SIMULADO</Text>
              <Text style={styles.championName}>{champion}</Text>
            </LinearGradient>

            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <Ionicons name="share-social" size={18} color={colors.primary} />
              <Text style={[styles.shareText, { color: colors.primary }]}>Compartir simulación</Text>
            </TouchableOpacity>
          </MotiView>
        )}

        {/* ── Knockout Results ─────────────────────── */}
        {knockoutMatches.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: appColors.text }]}>Fase Eliminatoria</Text>
            {knockoutMatches.map((match, i) => (
              <MotiView
                key={match.id}
                from={{ opacity: 0, translateX: -20 }}
                animate={{ opacity: 1, translateX: 0 }}
                transition={{ delay: i * 50 }}
              >
                <SimMatchRow match={match} appColors={appColors} />
              </MotiView>
            ))}
          </View>
        )}

        {/* ── Group Stage Summary ───────────────────── */}
        {groupMatches.length > 0 && (
          <View style={[styles.section, styles.lastSection]}>
            <Text style={[styles.sectionTitle, { color: appColors.text }]}>
              Fase de Grupos ({groupMatches.length} partidos)
            </Text>
            <Text style={[styles.sectionSub, { color: appColors.textSecondary }]}>
              Toca cada partido para ver los detalles
            </Text>
            {groupMatches.slice(0, 12).map((match, i) => (
              <SimMatchRow key={match.id} match={match} appColors={appColors} compact />
            ))}
            {groupMatches.length > 12 && (
              <Text style={[styles.moreText, { color: appColors.textSecondary }]}>
                +{groupMatches.length - 12} partidos más...
              </Text>
            )}
          </View>
        )}

        {!results && !isRunning && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="soccer-field" size={64} color={appColors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: appColors.text }]}>Simula el Mundial</Text>
            <Text style={[styles.emptySub, { color: appColors.textSecondary }]}>
              La IA calculará probabilidades y generará resultados para todo el torneo
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SimMatchRow({ match, appColors, compact = false }: { match: SimulatedMatch; appColors: any; compact?: boolean }) {
  return (
    <View style={[styles.matchRow, { backgroundColor: appColors.surface }]}>
      {match.group && <Text style={[styles.groupTag, { color: appColors.textSecondary }]}>G{match.group}</Text>}
      <View style={styles.matchTeams}>
        <View style={styles.teamSide}>
          <TeamLogo uri={match.homeTeam.flagUrl} size={compact ? 20 : 28} />
          <Text style={[styles.teamCode, { color: appColors.text }]}>{match.homeTeam.code}</Text>
        </View>
        <View style={styles.scoreBox}>
          {match.result ? (
            <Text style={[styles.score, { color: appColors.text }]}>
              {match.result.homeScore} - {match.result.awayScore}
            </Text>
          ) : (
            <Text style={[styles.score, { color: appColors.textSecondary }]}>vs</Text>
          )}
        </View>
        <View style={[styles.teamSide, styles.teamSideRight]}>
          <Text style={[styles.teamCode, { color: appColors.text }]}>{match.awayTeam.code}</Text>
          <TeamLogo uri={match.awayTeam.flagUrl} size={compact ? 20 : 28} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { padding: spacing.screen, paddingBottom: spacing.xl, alignItems: 'center' },
  heroTitle: { color: 'white', fontSize: typography.fontSize.xxl, fontFamily: typography.fontFamily.bold, textAlign: 'center' },
  heroSub: { color: 'rgba(255,255,255,0.7)', fontSize: typography.fontSize.sm, marginBottom: spacing.xl },
  modeContainer: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.base },
  modeButton: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.base, paddingVertical: spacing.sm,
    borderRadius: borderRadius.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  modeButtonActive: { backgroundColor: 'white', borderColor: 'white' },
  modeLabel: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.medium },
  runButton: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
  },
  runButtonDisabled: { opacity: 0.7 },
  runButtonText: { color: 'white', fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.base },
  championCard: { margin: spacing.base, borderRadius: borderRadius.xl, overflow: 'hidden', ...{ shadowColor: '#000', shadowOpacity: 0.1, elevation: 4 } },
  championGradient: { padding: spacing.xl, alignItems: 'center', gap: spacing.xs },
  championLabel: { color: 'white', fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.bold, letterSpacing: 2, opacity: 0.9 },
  championName: { color: 'white', fontSize: typography.fontSize.xxxl, fontFamily: typography.fontFamily.black },
  shareButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.base },
  shareText: { fontFamily: typography.fontFamily.medium },
  section: { padding: spacing.base, gap: spacing.xs },
  lastSection: { paddingBottom: spacing.xxxl },
  sectionTitle: { fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold, marginBottom: spacing.xs },
  sectionSub: { fontSize: typography.fontSize.xs, marginBottom: spacing.sm },
  matchRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.sm, borderRadius: borderRadius.md, marginBottom: spacing.xs,
  },
  groupTag: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.bold, width: 20 },
  matchTeams: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  teamSide: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  teamSideRight: { justifyContent: 'flex-end' },
  teamCode: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.bold },
  scoreBox: { paddingHorizontal: spacing.sm },
  score: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.bold, textAlign: 'center' },
  emptyState: { alignItems: 'center', padding: spacing.xxxl, gap: spacing.base },
  emptyTitle: { fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.bold, textAlign: 'center' },
  emptySub: { fontSize: typography.fontSize.sm, textAlign: 'center', lineHeight: 20 },
  moreText: { fontSize: typography.fontSize.xs, textAlign: 'center', paddingTop: spacing.sm },
});
