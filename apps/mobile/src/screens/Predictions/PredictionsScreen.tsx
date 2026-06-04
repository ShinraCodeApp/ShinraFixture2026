import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  FlatList, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';

import { useAppTheme } from '../../hooks/useAppTheme';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { MatchCard } from '../../components/match/MatchCard';
import { PredictionHistoryCard } from '../../components/predictions/PredictionHistoryCard';
import { RankingCard } from '../../components/predictions/RankingCard';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';

type Tab = 'predict' | 'history' | 'ranking';

export function PredictionsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { appColors } = useAppTheme();
  const { user } = useSelector((state: RootState) => state.auth);
  const [activeTab, setActiveTab] = useState<Tab>('predict');

  const tournamentId: string | undefined = route.params?.tournamentId;
  const tournamentName: string | undefined = route.params?.tournamentName;

  const { data: upcomingData, isLoading: loadingUpcoming, refetch } = useQuery({
    queryKey: ['upcoming-matches', tournamentId],
    queryFn: async () => {
      const qs = tournamentId ? `&tournamentId=${tournamentId}` : '';
      const r = await apiService.get(`/matches/upcoming?days=30${qs}`);
      return r.data.data;
    },
  });

  const { data: historyData, isLoading: loadingHistory } = useQuery({
    queryKey: ['my-predictions'],
    queryFn: async () => {
      const r = await apiService.get('/predictions?limit=20');
      return r.data.data;
    },
    enabled: activeTab === 'history',
  });

  const { data: rankingData, isLoading: loadingRanking } = useQuery({
    queryKey: ['global-ranking'],
    queryFn: async () => {
      const r = await apiService.get('/predictions/ranking?limit=20');
      return r.data.data;
    },
    enabled: activeTab === 'ranking',
  });

  const { data: myRanking } = useQuery({
    queryKey: ['my-ranking'],
    queryFn: async () => {
      const r = await apiService.get('/predictions/my-ranking');
      return r.data.data;
    },
  });

  const tabs: Array<{ key: Tab; label: string; icon: string }> = [
    { key: 'predict', label: 'Pronosticar', icon: 'lightning-bolt' },
    { key: 'history', label: 'Historial', icon: 'history' },
    { key: 'ranking', label: 'Ranking', icon: 'trophy' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appColors.background }]} edges={['top']}>
      {/* ── Header ─────────────────────────────────── */}
      <LinearGradient colors={['#1565C0', '#0D47A1']} style={styles.header}>
        <View style={styles.headerTop}>
          {tournamentId ? (
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="chevron-back" size={24} color="white" />
            </TouchableOpacity>
          ) : <View style={{ width: 24 }} />}
          <View style={{ flex: 1, marginLeft: tournamentId ? spacing.sm : 0 }}>
            <Text style={styles.headerTitle}>Predicciones</Text>
            <Text style={styles.headerSubtitle}>{tournamentName ?? 'FIFA World Cup 2026™'}</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          {[
            { label: 'Puntos', value: user?.predictionPoints ?? 0, icon: 'star' },
            { label: 'Acertadas', value: user?.correctPredictions ?? 0, icon: 'check-circle' },
            { label: 'Mi Rank', value: myRanking?.rank ? `#${myRanking.rank}` : '-', icon: 'podium' },
          ].map((s) => (
            <View key={s.label} style={styles.statBox}>
              <MaterialCommunityIcons name={s.icon as any} size={18} color={colors.accent} />
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Quiniela CTA */}
        <TouchableOpacity
          style={styles.quinielaCTA}
          onPress={() => navigation.navigate('Quiniela')}
        >
          <MaterialCommunityIcons name="account-group" size={18} color={colors.accent} />
          <Text style={styles.quinielaCTAText}>Jugar Quiniela con amigos</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.accent} />
        </TouchableOpacity>
      </LinearGradient>

      {/* ── Tabs ─────────────────────────────────────── */}
      <View style={[styles.tabs, { backgroundColor: appColors.surface, borderBottomColor: appColors.border }]}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
          >
            <MaterialCommunityIcons
              name={tab.icon as any}
              size={16}
              color={activeTab === tab.key ? colors.primary : appColors.textSecondary}
            />
            <Text style={[styles.tabLabel, { color: activeTab === tab.key ? colors.primary : appColors.textSecondary }]}>
              {tab.label}
            </Text>
            {activeTab === tab.key && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Content ──────────────────────────────────── */}
      {activeTab === 'predict' && (
        <FlatList
          data={upcomingData ?? []}
          keyExtractor={(item: any) => item.id}
          refreshControl={<RefreshControl refreshing={loadingUpcoming} onRefresh={refetch} tintColor={colors.primary} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            loadingUpcoming
              ? <View style={{ padding: spacing.base }}>{Array.from({ length: 4 }).map((_, i) => <LoadingSkeleton key={i} style={styles.skeleton} />)}</View>
              : <View style={styles.empty}><Text style={{ color: appColors.textSecondary }}>No hay partidos próximos</Text></View>
          }
          renderItem={({ item }) => (
            <MatchCard
              match={item}
              onPress={() => navigation.navigate('MatchDetail', { matchId: item.id })}
              showPrediction
            />
          )}
        />
      )}

      {activeTab === 'history' && (
        <FlatList
          data={historyData?.items ?? []}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            loadingHistory
              ? <View style={{ padding: spacing.base }}>{Array.from({ length: 4 }).map((_, i) => <LoadingSkeleton key={i} style={styles.skeleton} />)}</View>
              : <View style={styles.empty}><Text style={{ color: appColors.textSecondary }}>Sin predicciones aún</Text></View>
          }
          renderItem={({ item }) => <PredictionHistoryCard prediction={item} />}
        />
      )}

      {activeTab === 'ranking' && (
        <FlatList
          data={rankingData?.items ?? []}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            myRanking ? (
              <MotiView from={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={[styles.myRankCard, { backgroundColor: appColors.surface }]}>
                <Text style={[styles.myRankTitle, { color: appColors.text }]}>Tu posición</Text>
                <View style={styles.myRankRow}>
                  <Text style={[styles.myRankNum, { color: colors.primary }]}>#{myRanking.rank}</Text>
                  <View>
                    <Text style={[styles.myRankPoints, { color: appColors.text }]}>{myRanking.points} pts</Text>
                    <Text style={[styles.myRankSub, { color: appColors.textSecondary }]}>en el ranking global</Text>
                  </View>
                </View>
              </MotiView>
            ) : null
          }
          ListEmptyComponent={
            loadingRanking
              ? <View style={{ padding: spacing.base }}>{Array.from({ length: 5 }).map((_, i) => <LoadingSkeleton key={i} style={styles.skeleton} />)}</View>
              : null
          }
          renderItem={({ item, index }) => <RankingCard entry={item} position={index + 1} currentUserId={user?.id} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: spacing.screen, paddingBottom: spacing.xl },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  headerTitle: { color: 'white', fontSize: typography.fontSize.xxl, fontFamily: typography.fontFamily.bold },
  headerSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: typography.fontSize.sm, marginBottom: spacing.base },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.base },
  statBox: {
    flex: 1, alignItems: 'center', gap: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: borderRadius.md, padding: spacing.sm,
  },
  statValue: { color: 'white', fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.bold },
  statLabel: { color: 'rgba(255,255,255,0.7)', fontSize: typography.fontSize.xs },
  quinielaCTA: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: borderRadius.lg, padding: spacing.sm,
  },
  quinielaCTAText: { flex: 1, color: 'white', fontFamily: typography.fontFamily.medium, fontSize: typography.fontSize.sm },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: spacing.sm, position: 'relative' },
  activeTab: {},
  tabLabel: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.medium },
  tabIndicator: {
    position: 'absolute', bottom: 0, left: 12, right: 12, height: 2,
    backgroundColor: colors.primary, borderRadius: 1,
  },
  listContent: { padding: spacing.screen, paddingBottom: 100, gap: spacing.sm },
  skeleton: { height: 80, borderRadius: borderRadius.md, marginBottom: spacing.sm },
  empty: { alignItems: 'center', paddingTop: 60 },
  myRankCard: {
    borderRadius: borderRadius.lg, padding: spacing.base, marginBottom: spacing.base,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, elevation: 3,
  },
  myRankTitle: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.medium, marginBottom: spacing.xs },
  myRankRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.base },
  myRankNum: { fontSize: typography.fontSize.hero, fontFamily: typography.fontFamily.black },
  myRankPoints: { fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.bold },
  myRankSub: { fontSize: typography.fontSize.xs },
});
