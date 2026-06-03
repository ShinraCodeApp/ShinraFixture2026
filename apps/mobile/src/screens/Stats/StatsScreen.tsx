import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import { useAppTheme } from '../../hooks/useAppTheme';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { TeamLogo } from '../../components/common/TeamLogo';

type Tab = 'scorers' | 'assists' | 'cards' | 'teams';

export function StatsScreen() {
  const { appColors } = useAppTheme();
  const [tab, setTab] = useState<Tab>('scorers');

  const { data: scorers } = useQuery({ queryKey: ['top-scorers'], queryFn: async () => (await apiService.get('/stats/top-scorers?limit=20')).data.data ?? [], enabled: tab === 'scorers' });
  const { data: assists } = useQuery({ queryKey: ['top-assists'], queryFn: async () => (await apiService.get('/stats/top-assists?limit=20')).data.data ?? [], enabled: tab === 'assists' });
  const { data: cards } = useQuery({ queryKey: ['top-cards'], queryFn: async () => (await apiService.get('/stats/top-cards?limit=20')).data.data ?? [], enabled: tab === 'cards' });
  const { data: teamStats } = useQuery({ queryKey: ['team-stats'], queryFn: async () => (await apiService.get('/stats/team-stats')).data.data ?? [], enabled: tab === 'teams' });

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: 'scorers', label: 'Goleadores' },
    { key: 'assists', label: 'Asistencias' },
    { key: 'cards', label: 'Tarjetas' },
    { key: 'teams', label: 'Equipos' },
  ];

  const currentData = tab === 'scorers' ? scorers : tab === 'assists' ? assists : tab === 'cards' ? cards : teamStats;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appColors.background }]} edges={['top']}>
      <Text style={[styles.title, { color: appColors.text }]}>Estadísticas</Text>

      <View style={[styles.tabs, { borderBottomColor: appColors.border }]}>
        {tabs.map((t) => (
          <TouchableOpacity key={t.key} style={[styles.tab, tab === t.key && styles.tabActive]} onPress={() => setTab(t.key)}>
            <Text style={[styles.tabLabel, { color: tab === t.key ? colors.primary : appColors.textSecondary }]}>{t.label}</Text>
            {tab === t.key && <View style={styles.tabBar} />}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {(currentData ?? []).map((item: any, index: number) => (
          <View key={item.player?.id ?? item.team?.id ?? index} style={[styles.row, { backgroundColor: appColors.surface }]}>
            <Text style={[styles.rank, { color: appColors.textSecondary }]}>#{index + 1}</Text>
            {item.player ? (
              <>
                <Image source={{ uri: item.player.photoUrl }} style={styles.photo} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: appColors.text }]}>{item.player.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <TeamLogo uri={item.player.team?.flagUrl} size={14} />
                    <Text style={[styles.sub, { color: appColors.textSecondary }]}>{item.player.team?.name}</Text>
                  </View>
                </View>
                <View style={styles.statBadge}>
                  <Text style={styles.statBadgeText}>
                    {tab === 'scorers' ? item.goals : tab === 'assists' ? item.assists : item.yellowCards}
                  </Text>
                  <Text style={[styles.statBadgeLabel, { color: appColors.textSecondary }]}>
                    {tab === 'scorers' ? 'goles' : tab === 'assists' ? 'asist.' : 'AM'}
                  </Text>
                </View>
              </>
            ) : (
              <>
                <TeamLogo uri={item.team?.flagUrl} size={36} />
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text style={[styles.name, { color: appColors.text }]}>{item.team?.name}</Text>
                  <Text style={[styles.sub, { color: appColors.textSecondary }]}>{item.matchesPlayed} partidos</Text>
                </View>
                <Text style={[styles.statBadge, { backgroundColor: `${colors.primary}20` }]}>
                  <Text style={{ color: colors.primary, fontFamily: typography.fontFamily.bold }}>{item.goalsScored}</Text>
                  <Text style={{ color: appColors.textSecondary, fontSize: 10 }}> goles</Text>
                </Text>
              </>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.bold, padding: spacing.base },
  tabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, position: 'relative' },
  tabActive: {},
  tabLabel: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.medium },
  tabBar: { position: 'absolute', bottom: 0, left: 8, right: 8, height: 2, backgroundColor: colors.primary, borderRadius: 1 },
  list: { padding: spacing.base, gap: spacing.xs, paddingBottom: 80 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: borderRadius.md },
  rank: { width: 24, fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.bold, textAlign: 'center' },
  photo: { width: 40, height: 40, borderRadius: 20 },
  name: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.medium },
  sub: { fontSize: typography.fontSize.xs },
  statBadge: {
    minWidth: 48, alignItems: 'center', justifyContent: 'center',
    backgroundColor: `${colors.primary}20`, borderRadius: borderRadius.md, padding: spacing.xs,
  },
  statBadgeText: { color: colors.primary, fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.black },
  statBadgeLabel: { fontSize: 9 },
});
