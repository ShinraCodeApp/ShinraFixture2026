import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, Dimensions, ActivityIndicator, Modal, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';

import { useAppTheme } from '../../hooks/useAppTheme';
import { useMatchDetail } from '../../hooks/useMatchDetail';
import { apiService, API_URL } from '../../services/api';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { TeamLogo } from '../../components/common/TeamLogo';
import { MatchStatusBadge } from '../../components/match/MatchStatusBadge';
import { EventTimeline } from '../../components/match/EventTimeline';
import { MatchStatsView } from '../../components/match/MatchStatsView';
import { MatchLineups } from '../../components/match/MatchLineups';
import { ProbabilityBars } from '../../components/match/ProbabilityBars';
import { PredictionInput } from '../../components/predictions/PredictionInput';
import { CommentSection } from '../../components/community/CommentSection';
import { AIAnalysisCard } from '../../components/ai/AIAnalysisCard';
import { LiveStreamTab } from '../../components/match/LiveStreamTab';
import { WatchPartyBar } from '../../components/match/WatchPartyBar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const Tab = createMaterialTopTabNavigator();

export function MatchDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { matchId } = route.params;
  const { appColors, isDark } = useAppTheme();
  const { match, isLoading, refetch } = useMatchDetail(matchId);
  const [activeTab, setActiveTab] = useState('info');
  const [localAiAnalysis, setLocalAiAnalysis] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showScoreEdit, setShowScoreEdit] = useState(false);
  const [editHome, setEditHome] = useState(0);
  const [editAway, setEditAway] = useState(0);
  const [editStatus, setEditStatus] = useState<'SCHEDULED' | 'LIVE' | 'FINISHED'>('LIVE');
  const [savingScore, setSavingScore] = useState(false);

  const openScoreEdit = () => {
    setEditHome(match?.homeScore ?? 0);
    setEditAway(match?.awayScore ?? 0);
    setEditStatus((match?.status as any) ?? 'LIVE');
    setShowScoreEdit(true);
  };

  const saveScore = async () => {
    setSavingScore(true);
    try {
      const res = await fetch(`${API_URL}/matches/${matchId}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ homeScore: editHome, awayScore: editAway, status: editStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      await refetch();
      setShowScoreEdit(false);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Error desconocido');
    } finally {
      setSavingScore(false);
    }
  };

  const handleGetAI = async () => {
    setAiLoading(true);
    try {
      const r = await apiService.post(`/matches/${matchId}/ai-predict`, {});
      setLocalAiAnalysis(r.data.data?.aiAnalysis ?? null);
    } catch {
      setLocalAiAnalysis('No se pudo obtener el análisis. Intentá de nuevo más tarde.');
    } finally {
      setAiLoading(false);
    }
  };

  const headerGradient = isDark
    ? ['#1E293B', '#0F172A']
    : ['#001489', '#1565C0'];

  if (isLoading || !match) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: appColors.background }]}>
        <ActivityIndicator style={{ flex: 1 }} color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  const isLive = match.status === 'LIVE' || match.status === 'HALF_TIME';
  const isFinished = match.status === 'FINISHED';
  const isScheduled = match.status === 'SCHEDULED';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appColors.background }]} edges={['top']}>
      {/* ── Header ─────────────────────────────── */}
      <LinearGradient colors={headerGradient as any} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="white" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.radarButton}
          onPress={() => (navigation as any).navigate('LiveRadar', { matchId: match.id })}
        >
          <MaterialCommunityIcons name="radar" size={18} color="white" />
          <Text style={styles.radarButtonText}>Radar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.editScoreBtn} onPress={openScoreEdit}>
          <MaterialCommunityIcons name="pencil" size={16} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        <View style={styles.stageInfo}>
          <Text style={styles.stageText}>
            {match.stage === 'GROUP' ? `Grupo ${match.group}` : match.stage.replace('_', ' ')}
          </Text>
          <MatchStatusBadge status={match.status} minute={match.minute} />
        </View>

        <View style={styles.scoreBoard}>
          {/* Home Team */}
          <TouchableOpacity
            style={styles.teamContainer}
            onPress={() => navigation.navigate('TeamDetail', { teamId: match.homeTeam.id })}
          >
            <TeamLogo uri={match.homeTeam.flagUrl} size={56} />
            <Text style={styles.teamName}>{match.homeTeam.shortName}</Text>
            {match.homeTeam.fifaRanking && (
              <Text style={styles.ranking}>#{match.homeTeam.fifaRanking}</Text>
            )}
          </TouchableOpacity>

          {/* Score */}
          <View style={styles.scoreContainer}>
            {isScheduled ? (
              <View>
                <Text style={styles.matchTime}>
                  {new Date(match.matchDate).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <Text style={styles.matchDate}>
                  {new Date(match.matchDate).toLocaleDateString('es', { day: '2-digit', month: 'short' })}
                </Text>
              </View>
            ) : (
              <View style={styles.scoreDisplay}>
                <Text style={[styles.score, isLive && styles.liveScore]}>
                  {match.homeScore ?? 0}
                </Text>
                <Text style={styles.scoreDivider}>-</Text>
                <Text style={[styles.score, isLive && styles.liveScore]}>
                  {match.awayScore ?? 0}
                </Text>
              </View>
            )}
            {match.homePenalties !== null && match.awayPenalties !== null && (
              <Text style={styles.penaltiesText}>
                ({match.homePenalties} - {match.awayPenalties}) pen.
              </Text>
            )}
          </View>

          {/* Away Team */}
          <TouchableOpacity
            style={styles.teamContainer}
            onPress={() => navigation.navigate('TeamDetail', { teamId: match.awayTeam.id })}
          >
            <TeamLogo uri={match.awayTeam.flagUrl} size={56} />
            <Text style={styles.teamName}>{match.awayTeam.shortName}</Text>
            {match.awayTeam.fifaRanking && (
              <Text style={styles.ranking}>#{match.awayTeam.fifaRanking}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Venue */}
        <Text style={styles.venue}>
          <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.7)" />
          {' '}{match.venue}, {match.city}
        </Text>

        {/* Win Probabilities */}
        {(match.homeWinProb !== null || isScheduled) && (
          <ProbabilityBars
            homeProb={match.homeWinProb ?? 0.4}
            drawProb={match.drawProb ?? 0.25}
            awayProb={match.awayWinProb ?? 0.35}
            homeName={match.homeTeam.shortName}
            awayName={match.awayTeam.shortName}
          />
        )}
      </LinearGradient>

      {/* ── Tab Content ─────────────────────────── */}
      <View style={styles.tabs}>
        {[
          { key: 'info', label: 'Info' },
          { key: 'stats', label: 'Stats' },
          { key: 'lineups', label: 'Alineación' },
          { key: 'live', label: '📺 En Vivo' },
          { key: 'predict', label: 'Pronosticar' },
          { key: 'comments', label: 'Comentarios' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, { color: activeTab === tab.key ? colors.primary : appColors.textSecondary }]}>
              {tab.label}
            </Text>
            {activeTab === tab.key && <View style={[styles.tabIndicator, { backgroundColor: colors.primary }]} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* En Vivo tab takes full height — outside ScrollView */}
      {activeTab === 'live' ? (
        <View style={{ flex: 1, marginBottom: 56 }}>
          <LiveStreamTab />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: 80 }]}
        >
          {activeTab === 'info' && (
            <View>
              <EventTimeline events={match.events ?? []} homeTeamId={match.homeTeamId} />
              {(localAiAnalysis ?? match.aiAnalysis) ? (
                <AIAnalysisCard analysis={localAiAnalysis ?? match.aiAnalysis!} matchId={matchId} />
              ) : (
                <TouchableOpacity
                  style={[styles.aiButton, aiLoading && styles.aiButtonLoading]}
                  onPress={handleGetAI}
                  disabled={aiLoading}
                >
                  {aiLoading ? (
                    <ActivityIndicator size={16} color="white" />
                  ) : (
                    <MaterialCommunityIcons name="robot" size={18} color="white" />
                  )}
                  <Text style={styles.aiButtonText}>
                    {aiLoading ? 'Analizando...' : 'Análisis IA Gemini'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          {activeTab === 'stats' && match.stats && (
            <MatchStatsView stats={match.stats} homeTeam={match.homeTeam} awayTeam={match.awayTeam} />
          )}
          {activeTab === 'lineups' && <MatchLineups matchId={matchId} />}
          {activeTab === 'predict' && (isScheduled || isLive) && (
            <PredictionInput
              matchId={matchId}
              homeTeam={match.homeTeam}
              awayTeam={match.awayTeam}
              userPrediction={match.userPrediction}
            />
          )}
          {activeTab === 'predict' && isFinished && (
            <View style={{ alignItems: 'center', padding: 32 }}>
              <Text style={{ color: '#6B7280', fontSize: 14 }}>Partido finalizado</Text>
              {match.userPrediction && (
                <Text style={{ color: '#10B981', fontSize: 13, marginTop: 8 }}>
                  Tu pronóstico: {match.userPrediction.homeScore} - {match.userPrediction.awayScore}
                </Text>
              )}
            </View>
          )}
          {activeTab === 'comments' && <CommentSection matchId={matchId} />}
        </ScrollView>
      )}

      {/* Watch Party bar — always visible at the bottom */}
      <WatchPartyBar matchId={matchId} />

      {/* Manual score editor */}
      <Modal visible={showScoreEdit} transparent animationType="slide" onRequestClose={() => setShowScoreEdit(false)}>
        <TouchableOpacity style={scoreEditStyles.backdrop} activeOpacity={1} onPress={() => setShowScoreEdit(false)} />
        <View style={scoreEditStyles.sheet}>
          <Text style={scoreEditStyles.title}>Actualizar marcador</Text>

          <View style={scoreEditStyles.row}>
            <Text style={scoreEditStyles.teamLabel}>{match.homeTeam.shortName}</Text>
            <View style={scoreEditStyles.stepper}>
              <TouchableOpacity style={scoreEditStyles.stepBtn} onPress={() => setEditHome(Math.max(0, editHome - 1))}>
                <Text style={scoreEditStyles.stepTxt}>−</Text>
              </TouchableOpacity>
              <Text style={scoreEditStyles.stepVal}>{editHome}</Text>
              <TouchableOpacity style={scoreEditStyles.stepBtn} onPress={() => setEditHome(editHome + 1)}>
                <Text style={scoreEditStyles.stepTxt}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={scoreEditStyles.row}>
            <Text style={scoreEditStyles.teamLabel}>{match.awayTeam.shortName}</Text>
            <View style={scoreEditStyles.stepper}>
              <TouchableOpacity style={scoreEditStyles.stepBtn} onPress={() => setEditAway(Math.max(0, editAway - 1))}>
                <Text style={scoreEditStyles.stepTxt}>−</Text>
              </TouchableOpacity>
              <Text style={scoreEditStyles.stepVal}>{editAway}</Text>
              <TouchableOpacity style={scoreEditStyles.stepBtn} onPress={() => setEditAway(editAway + 1)}>
                <Text style={scoreEditStyles.stepTxt}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={scoreEditStyles.statusRow}>
            {(['SCHEDULED', 'LIVE', 'FINISHED'] as const).map(s => (
              <TouchableOpacity
                key={s}
                style={[scoreEditStyles.statusBtn, editStatus === s && scoreEditStyles.statusBtnActive]}
                onPress={() => setEditStatus(s)}
              >
                <Text style={[scoreEditStyles.statusTxt, editStatus === s && { color: 'white' }]}>
                  {s === 'SCHEDULED' ? 'Por jugar' : s === 'LIVE' ? 'En vivo' : 'Finalizado'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[scoreEditStyles.saveBtn, savingScore && { opacity: 0.6 }]}
            onPress={saveScore}
            disabled={savingScore}
          >
            <Text style={scoreEditStyles.saveTxt}>{savingScore ? 'Guardando...' : 'Guardar'}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xl },
  backButton: { marginTop: spacing.sm, marginBottom: spacing.md },
  radarButton: {
    position: 'absolute', top: spacing.sm, right: spacing.screen,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 4,
  },
  radarButtonText: { color: 'white', fontSize: 11, fontFamily: typography.fontFamily.semiBold },
  stageInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.base },
  stageText: { color: 'rgba(255,255,255,0.8)', fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.medium, textTransform: 'uppercase' },
  scoreBoard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  teamContainer: { flex: 1, alignItems: 'center', gap: spacing.xs },
  teamName: { color: 'white', fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.bold, textAlign: 'center' },
  ranking: { color: 'rgba(255,255,255,0.6)', fontSize: typography.fontSize.xs },
  scoreContainer: { alignItems: 'center', gap: 4 },
  scoreDisplay: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  score: { color: 'white', fontSize: 48, fontFamily: typography.fontFamily.black },
  liveScore: { color: colors.accent },
  scoreDivider: { color: 'rgba(255,255,255,0.5)', fontSize: 32 },
  matchTime: { color: 'white', fontSize: typography.fontSize.xxxl, fontFamily: typography.fontFamily.bold, textAlign: 'center' },
  matchDate: { color: 'rgba(255,255,255,0.7)', fontSize: typography.fontSize.sm, textAlign: 'center' },
  penaltiesText: { color: 'rgba(255,255,255,0.8)', fontSize: typography.fontSize.sm },
  venue: { color: 'rgba(255,255,255,0.7)', fontSize: typography.fontSize.xs, textAlign: 'center', marginBottom: spacing.base },
  tabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.1)' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, position: 'relative' },
  activeTab: {},
  tabText: { fontSize: 11, fontFamily: typography.fontFamily.medium },
  tabIndicator: { position: 'absolute', bottom: 0, left: 8, right: 8, height: 2, borderRadius: 1 },
  content: { padding: spacing.screen, paddingBottom: spacing.xxxl },
  aiButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.primary, borderRadius: borderRadius.lg,
    paddingVertical: spacing.md, marginBottom: spacing.sm,
  },
  aiButtonLoading: { opacity: 0.7 },
  aiButtonText: { color: 'white', fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.bold },
  editScoreBtn: {
    position: 'absolute', top: spacing.sm, left: spacing.screen,
    padding: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: borderRadius.full,
  },
});

const scoreEditStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: spacing.xl, gap: spacing.base,
  },
  title: { fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold, textAlign: 'center', marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  teamLabel: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.semiBold, flex: 1 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.base },
  stepBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  stepTxt: { color: 'white', fontSize: 20, fontFamily: typography.fontFamily.bold, lineHeight: 24 },
  stepVal: { fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.bold, minWidth: 32, textAlign: 'center' },
  statusRow: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', marginTop: 4 },
  statusBtn: {
    paddingHorizontal: spacing.base, paddingVertical: spacing.xs,
    borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.primary,
  },
  statusBtnActive: { backgroundColor: colors.primary },
  statusTxt: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.semiBold, color: colors.primary },
  saveBtn: {
    backgroundColor: colors.primary, borderRadius: borderRadius.lg,
    paddingVertical: spacing.md, alignItems: 'center', marginTop: 4,
  },
  saveTxt: { color: 'white', fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.bold },
});
