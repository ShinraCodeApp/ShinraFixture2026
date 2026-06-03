import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import { useAppTheme } from '../../hooks/useAppTheme';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { MatchCard } from '../../components/match/MatchCard';

type Tab = 'squad' | 'matches' | 'stats';

export function TeamDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { teamId } = route.params;
  const { appColors } = useAppTheme();
  const [tab, setTab] = useState<Tab>('squad');

  const { data: team, isLoading } = useQuery({
    queryKey: ['team', teamId],
    queryFn: async () => (await apiService.get(`/teams/${teamId}`)).data.data,
  });

  const { data: matches } = useQuery({
    queryKey: ['team-matches', teamId],
    queryFn: async () => (await apiService.get(`/teams/${teamId}/matches`)).data.data ?? [],
    enabled: tab === 'matches',
  });

  if (isLoading || !team) return null;

  const POSITIONS = ['GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD'];
  const posLabel: Record<string, string> = {
    GOALKEEPER: 'Porteros', DEFENDER: 'Defensas', MIDFIELDER: 'Centrocampistas', FORWARD: 'Delanteros'
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appColors.background }]} edges={['top']}>
      <LinearGradient colors={['#0D47A1', '#001489']} style={styles.hero}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color="white" />
        </TouchableOpacity>
        <Image source={{ uri: team.flagUrl ?? team.shieldUrl }} style={styles.flag} />
        <Text style={styles.teamName}>{team.name}</Text>
        <Text style={styles.teamCode}>{team.code}</Text>
        <View style={styles.metaRow}>
          {team.group && <View style={styles.tag}><Text style={styles.tagText}>Grupo {team.group}</Text></View>}
          {team.fifaRanking && <View style={styles.tag}><Text style={styles.tagText}>FIFA #{team.fifaRanking}</Text></View>}
          <View style={styles.tag}><Text style={styles.tagText}>{team.region}</Text></View>
        </View>
      </LinearGradient>

      <View style={[styles.tabs, { borderBottomColor: appColors.border }]}>
        {(['squad', 'matches', 'stats'] as Tab[]).map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabLabel, { color: tab === t ? colors.primary : appColors.textSecondary }]}>
              {t === 'squad' ? 'Plantel' : t === 'matches' ? 'Partidos' : 'Stats'}
            </Text>
            {tab === t && <View style={styles.tabBar} />}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {tab === 'squad' && POSITIONS.map((pos) => {
          const players = team.players?.filter((p: any) => p.position === pos) ?? [];
          if (!players.length) return null;
          return (
            <View key={pos} style={styles.posGroup}>
              <Text style={[styles.posLabel, { color: appColors.textSecondary }]}>{posLabel[pos]}</Text>
              {players.map((p: any) => (
                <View key={p.id} style={[styles.playerRow, { backgroundColor: appColors.surface }]}>
                  <Text style={[styles.playerNum, { color: appColors.textSecondary }]}>{p.number ?? '-'}</Text>
                  <Text style={[styles.playerName, { color: appColors.text }]}>{p.name}</Text>
                  <Text style={[styles.playerClub, { color: appColors.textSecondary }]}>{p.club}</Text>
                </View>
              ))}
            </View>
          );
        })}

        {tab === 'matches' && (matches ?? []).map((m: any) => (
          <MatchCard key={m.id} match={m} onPress={() => navigation.navigate('MatchDetail', { matchId: m.id })} />
        ))}

        {tab === 'stats' && team.stats && (
          <View style={[styles.statsCard, { backgroundColor: appColors.surface }]}>
            {[
              ['Partidos', team.stats.matchesPlayed],
              ['Victorias', team.stats.wins],
              ['Empates', team.stats.draws],
              ['Derrotas', team.stats.losses],
              ['Goles a favor', team.stats.goalsScored],
              ['Goles en contra', team.stats.goalsConceded],
              ['Tarjetas amarillas', team.stats.yellowCards],
              ['Tarjetas rojas', team.stats.redCards],
            ].map(([label, value]) => (
              <View key={label as string} style={[styles.statRow, { borderBottomColor: appColors.border }]}>
                <Text style={[styles.statLabel, { color: appColors.textSecondary }]}>{label}</Text>
                <Text style={[styles.statValue, { color: appColors.text }]}>{value ?? 0}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { padding: spacing.screen, alignItems: 'center', paddingBottom: spacing.xl },
  back: { alignSelf: 'flex-start', marginBottom: spacing.sm },
  flag: { width: 72, height: 72, borderRadius: 36, marginBottom: spacing.sm },
  teamName: { color: 'white', fontSize: typography.fontSize.xxl, fontFamily: typography.fontFamily.bold },
  teamCode: { color: 'rgba(255,255,255,0.7)', fontSize: typography.fontSize.sm, marginBottom: spacing.sm },
  metaRow: { flexDirection: 'row', gap: spacing.xs },
  tag: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  tagText: { color: 'white', fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.medium },
  tabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, position: 'relative' },
  tabActive: {},
  tabLabel: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.medium },
  tabBar: { position: 'absolute', bottom: 0, left: 16, right: 16, height: 2, backgroundColor: colors.primary, borderRadius: 1 },
  content: { padding: spacing.base, gap: spacing.sm, paddingBottom: 80 },
  posGroup: { gap: spacing.xs },
  posLabel: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.bold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: borderRadius.md },
  playerNum: { width: 24, fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.bold, textAlign: 'center' },
  playerName: { flex: 1, fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.medium },
  playerClub: { fontSize: typography.fontSize.xs },
  statsCard: { borderRadius: borderRadius.lg, overflow: 'hidden' },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', padding: spacing.base, borderBottomWidth: StyleSheet.hairlineWidth },
  statLabel: { fontSize: typography.fontSize.sm },
  statValue: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.bold },
});
