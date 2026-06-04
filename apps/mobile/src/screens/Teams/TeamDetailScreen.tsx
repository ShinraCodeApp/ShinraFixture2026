import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import { useAppTheme } from '../../hooks/useAppTheme';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { MatchCard } from '../../components/match/MatchCard';

type Tab = 'squad' | 'standings' | 'matches' | 'stats';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'squad', label: 'Plantel', icon: 'account-group' },
  { key: 'standings', label: 'Posiciones', icon: 'table' },
  { key: 'matches', label: 'Partidos', icon: 'soccer' },
  { key: 'stats', label: 'Stats', icon: 'chart-bar' },
];

const POSITION_LABELS: Record<string, string> = {
  GOALKEEPER: 'Porteros',
  DEFENDER: 'Defensas',
  MIDFIELDER: 'Centrocampistas',
  FORWARD: 'Delanteros',
};

const POSITION_COLORS: Record<string, string> = {
  GOALKEEPER: '#F59E0B',
  DEFENDER: '#3B82F6',
  MIDFIELDER: '#10B981',
  FORWARD: '#EF4444',
};

function playerAvatarUrl(name: string, position: string): string {
  const bg = (POSITION_COLORS[position] ?? '#6B7280').replace('#', '');
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bg}&color=fff&size=128&bold=true&font-size=0.4`;
}

function PlayerCard({ player, flagUrl }: { player: any; flagUrl?: string }) {
  const [imgError, setImgError] = useState(false);
  const photoUri = (!player.photoUrl || imgError)
    ? playerAvatarUrl(player.name, player.position)
    : player.photoUrl;

  return (
    <View style={playerStyles.card}>
      <Image
        source={{ uri: photoUri }}
        style={playerStyles.photo}
        onError={() => setImgError(true)}
      />
      <View style={playerStyles.info}>
        <Text style={playerStyles.name} numberOfLines={1}>{player.name}</Text>
        <Text style={playerStyles.meta}>{player.club ?? '—'}</Text>
        {player.nationality && (
          <Text style={playerStyles.meta}>{player.nationality}</Text>
        )}
      </View>
      <View style={[playerStyles.numBadge, { backgroundColor: POSITION_COLORS[player.position] + '22' }]}>
        <Text style={[playerStyles.num, { color: POSITION_COLORS[player.position] ?? '#6B7280' }]}>
          {player.number ?? '?'}
        </Text>
      </View>
    </View>
  );
}

const playerStyles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: 'transparent', paddingVertical: spacing.xs,
  },
  photo: { width: 48, height: 48, borderRadius: 24 },
  info: { flex: 1 },
  name: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.semiBold, color: 'white' },
  meta: { fontSize: typography.fontSize.xs, color: 'rgba(255,255,255,0.6)', marginTop: 1 },
  numBadge: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  num: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.bold },
});

function StandingsTable({ group, standings }: { group: string; standings: any[] }) {
  const sorted = [...standings].sort((a, b) =>
    b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor
  );

  return (
    <View style={standStyles.container}>
      <Text style={standStyles.groupTitle}>Grupo {group}</Text>
      <View style={standStyles.header}>
        {['', 'Equipo', 'PJ', 'G', 'E', 'P', 'GF', 'GC', 'DG', 'Pts'].map((h) => (
          <Text key={h} style={[standStyles.hCell, h === 'Equipo' && standStyles.teamCell]}>{h}</Text>
        ))}
      </View>
      {sorted.map((s, i) => (
        <View key={s.teamId ?? i} style={[standStyles.row, i % 2 === 0 && standStyles.rowAlt]}>
          <Text style={standStyles.cell}>{i + 1}</Text>
          <View style={standStyles.teamNameCell}>
            {s.team?.flagUrl && (
              <Image source={{ uri: s.team.flagUrl }} style={standStyles.rowFlag} />
            )}
            <Text style={standStyles.teamName} numberOfLines={1}>
              {s.team?.shortName ?? s.team?.code ?? '—'}
            </Text>
            {i < 2 && <View style={standStyles.qualDot} />}
          </View>
          {[s.played ?? 0, s.won ?? 0, s.drawn ?? 0, s.lost ?? 0,
            s.goalsFor ?? 0, s.goalsAgainst ?? 0, s.goalDifference ?? 0, s.points ?? 0
          ].map((v, vi) => (
            <Text key={vi} style={[standStyles.cell, vi === 7 && standStyles.pts]}>{v}</Text>
          ))}
        </View>
      ))}
      <Text style={standStyles.hint}>🟢 Top 2 clasifican a octavos</Text>
    </View>
  );
}

const standStyles = StyleSheet.create({
  container: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: borderRadius.lg, padding: spacing.sm, marginBottom: spacing.base },
  groupTitle: { color: colors.accent, fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.sm, marginBottom: spacing.xs, letterSpacing: 0.5 },
  header: { flexDirection: 'row', paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.15)', marginBottom: 2 },
  hCell: { width: 28, textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 10, fontFamily: typography.fontFamily.bold },
  teamCell: { flex: 1, textAlign: 'left' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  rowAlt: { backgroundColor: 'rgba(255,255,255,0.04)' },
  cell: { width: 28, textAlign: 'center', color: 'rgba(255,255,255,0.85)', fontSize: 11, fontFamily: typography.fontFamily.medium },
  teamNameCell: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 },
  rowFlag: { width: 20, height: 14, borderRadius: 2 },
  teamName: { color: 'white', fontSize: 11, fontFamily: typography.fontFamily.medium, flex: 1 },
  qualDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  pts: { color: colors.accent, fontFamily: typography.fontFamily.bold },
  hint: { color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: spacing.xs },
});

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

  const { data: standingsData } = useQuery({
    queryKey: ['standings', team?.group],
    queryFn: async () => (await apiService.get(`/teams?group=${team.group}`)).data.data ?? [],
    enabled: tab === 'standings' && !!team?.group,
  });

  if (isLoading || !team) return (
    <View style={{ flex: 1, backgroundColor: '#001489', alignItems: 'center', justifyContent: 'center' }}>
      <MaterialCommunityIcons name="soccer" size={40} color="rgba(255,255,255,0.3)" />
    </View>
  );

  const POSITIONS = ['GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD'];

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#001489', '#0D47A1', '#1565C0']} style={StyleSheet.absoluteFill} />

      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        {/* ── Header ── */}
        <View style={styles.hero}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>

          <View style={styles.heroCenter}>
            <Image
              source={{ uri: team.flagUrl }}
              style={styles.flag}
              defaultSource={{ uri: `https://ui-avatars.com/api/?name=${team.code}&background=0D47A1&color=fff&size=128` }}
            />
            <Text style={styles.teamName}>{team.name}</Text>
            <Text style={styles.teamCode}>{team.code}</Text>
            <View style={styles.metaRow}>
              {team.group && (
                <View style={styles.tag}>
                  <Text style={styles.tagText}>Grupo {team.group}</Text>
                </View>
              )}
              {team.fifaRanking && (
                <View style={styles.tag}>
                  <MaterialCommunityIcons name="crown" size={10} color={colors.accent} />
                  <Text style={styles.tagText}>FIFA #{team.fifaRanking}</Text>
                </View>
              )}
              <View style={styles.tag}>
                <Text style={styles.tagText}>{team.region}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Tabs ── */}
        <View style={styles.tabs}>
          {TABS.map((t) => (
            <TouchableOpacity key={t.key} style={styles.tab} onPress={() => setTab(t.key)}>
              <MaterialCommunityIcons
                name={t.icon as any}
                size={16}
                color={tab === t.key ? colors.accent : 'rgba(255,255,255,0.5)'}
              />
              <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>
                {t.label}
              </Text>
              {tab === t.key && <View style={styles.tabBar} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Content ── */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

          {/* PLANTEL */}
          {tab === 'squad' && (
            team.players?.length > 0 ? (
              POSITIONS.map((pos) => {
                const players = team.players.filter((p: any) => p.position === pos);
                if (!players.length) return null;
                return (
                  <View key={pos} style={styles.posGroup}>
                    <View style={styles.posHeader}>
                      <View style={[styles.posColorBar, { backgroundColor: POSITION_COLORS[pos] }]} />
                      <Text style={styles.posLabel}>{POSITION_LABELS[pos]}</Text>
                      <Text style={styles.posCount}>{players.length}</Text>
                    </View>
                    {players.map((p: any) => (
                      <PlayerCard key={p.id} player={p} flagUrl={team.flagUrl} />
                    ))}
                  </View>
                );
              })
            ) : (
              <View style={styles.empty}>
                <MaterialCommunityIcons name="account-group-outline" size={48} color="rgba(255,255,255,0.3)" />
                <Text style={styles.emptyText}>Plantel no disponible</Text>
                <Text style={styles.emptyHint}>Los datos del plantel se actualizarán próximamente</Text>
              </View>
            )
          )}

          {/* POSICIONES */}
          {tab === 'standings' && (
            standingsData?.length > 0 ? (
              <StandingsTable
                group={team.group ?? '?'}
                standings={standingsData.map((t: any) => ({
                  teamId: t.id,
                  team: { shortName: t.shortName, code: t.code, flagUrl: t.flagUrl },
                  played: t.stats?.matchesPlayed ?? 0,
                  won: t.stats?.wins ?? 0,
                  drawn: t.stats?.draws ?? 0,
                  lost: t.stats?.losses ?? 0,
                  goalsFor: t.stats?.goalsScored ?? 0,
                  goalsAgainst: t.stats?.goalsConceded ?? 0,
                  goalDifference: (t.stats?.goalsScored ?? 0) - (t.stats?.goalsConceded ?? 0),
                  points: (t.stats?.wins ?? 0) * 3 + (t.stats?.draws ?? 0),
                }))}
              />
            ) : (
              <View style={styles.empty}>
                <MaterialCommunityIcons name="table" size={48} color="rgba(255,255,255,0.3)" />
                <Text style={styles.emptyText}>Grupo {team.group ?? '—'}</Text>
                <Text style={styles.emptyHint}>Las posiciones se actualizarán cuando comiencen los partidos</Text>
              </View>
            )
          )}

          {/* PARTIDOS */}
          {tab === 'matches' && (
            (matches ?? []).length > 0 ? (
              (matches ?? []).map((m: any) => (
                <MatchCard key={m.id} match={m} onPress={() => navigation.navigate('MatchDetail', { matchId: m.id })} />
              ))
            ) : (
              <View style={styles.empty}>
                <MaterialCommunityIcons name="soccer" size={48} color="rgba(255,255,255,0.3)" />
                <Text style={styles.emptyText}>Sin partidos aún</Text>
              </View>
            )
          )}

          {/* STATS */}
          {tab === 'stats' && (
            <View style={styles.statsGrid}>
              {[
                { icon: 'soccer', label: 'Partidos', value: team.stats?.matchesPlayed ?? 0, color: colors.primary },
                { icon: 'trophy', label: 'Victorias', value: team.stats?.wins ?? 0, color: '#10B981' },
                { icon: 'handshake', label: 'Empates', value: team.stats?.draws ?? 0, color: '#F59E0B' },
                { icon: 'close-circle', label: 'Derrotas', value: team.stats?.losses ?? 0, color: '#EF4444' },
                { icon: 'soccer', label: 'Goles favor', value: team.stats?.goalsScored ?? 0, color: colors.accent },
                { icon: 'shield-off', label: 'Goles contra', value: team.stats?.goalsConceded ?? 0, color: '#6B7280' },
                { icon: 'card', label: 'T. Amarillas', value: team.stats?.yellowCards ?? 0, color: '#F59E0B' },
                { icon: 'card', label: 'T. Rojas', value: team.stats?.redCards ?? 0, color: '#EF4444' },
              ].map((s) => (
                <View key={s.label} style={styles.statCard}>
                  <MaterialCommunityIcons name={s.icon as any} size={24} color={s.color} />
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
          )}

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { paddingHorizontal: spacing.base, paddingTop: spacing.sm, paddingBottom: spacing.xl },
  back: { marginBottom: spacing.sm },
  heroCenter: { alignItems: 'center' },
  flag: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)', marginBottom: spacing.sm },
  teamName: { color: 'white', fontSize: typography.fontSize.xxl, fontFamily: typography.fontFamily.bold, textAlign: 'center' },
  teamCode: { color: 'rgba(255,255,255,0.6)', fontSize: typography.fontSize.sm, marginBottom: spacing.sm },
  metaRow: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap', justifyContent: 'center' },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  tagText: { color: 'white', fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.medium },

  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.15)' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, gap: 3, position: 'relative' },
  tabLabel: { fontSize: 10, fontFamily: typography.fontFamily.medium, color: 'rgba(255,255,255,0.5)' },
  tabLabelActive: { color: colors.accent },
  tabBar: { position: 'absolute', bottom: 0, left: 8, right: 8, height: 2, backgroundColor: colors.accent, borderRadius: 1 },

  content: { padding: spacing.base, paddingBottom: 80, gap: spacing.sm },

  posGroup: { gap: spacing.xs, marginBottom: spacing.sm },
  posHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  posColorBar: { width: 3, height: 14, borderRadius: 2 },
  posLabel: { flex: 1, color: 'rgba(255,255,255,0.7)', fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  posCount: { color: 'rgba(255,255,255,0.4)', fontSize: typography.fontSize.xs },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statCard: {
    width: '47%', backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: borderRadius.lg, padding: spacing.base,
    alignItems: 'center', gap: 4,
  },
  statValue: { color: 'white', fontSize: typography.fontSize.xxl, fontFamily: typography.fontFamily.bold },
  statLabel: { color: 'rgba(255,255,255,0.6)', fontSize: typography.fontSize.xs, textAlign: 'center' },

  empty: { alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm },
  emptyText: { color: 'rgba(255,255,255,0.6)', fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.medium },
  emptyHint: { color: 'rgba(255,255,255,0.4)', fontSize: typography.fontSize.xs, textAlign: 'center' },
});
