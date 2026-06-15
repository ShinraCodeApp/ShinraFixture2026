import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { apiService } from '../../services/api';
import { useAppTheme } from '../../hooks/useAppTheme';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { TeamLogo } from '../common/TeamLogo';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/es';

dayjs.extend(relativeTime);
dayjs.locale('es');

const ALL_GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L'];

interface Props {
  initialGroup?: string;
}

export function GroupStandingsWidget({ initialGroup = 'A' }: Props) {
  const { appColors } = useAppTheme();
  const navigation = useNavigation<any>();
  const [selectedGroup, setSelectedGroup] = useState(initialGroup);

  const { data: wcStandings, dataUpdatedAt } = useQuery({
    queryKey: ['wc-standings'],
    queryFn: async () => (await apiService.get('/stats/wc-standings')).data.data ?? [],
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const groupData = (wcStandings ?? []).find((g: any) => g.group === selectedGroup);
  const entries = groupData?.entries?.slice(0, 4) ?? [];
  const updatedAgo = dataUpdatedAt ? dayjs(dataUpdatedAt).fromNow() : null;

  return (
    <View style={[styles.container, { backgroundColor: appColors.surface }]}>
      {/* Group selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.groupTabs}
      >
        {ALL_GROUPS.map(g => (
          <TouchableOpacity
            key={g}
            onPress={() => setSelectedGroup(g)}
            style={[
              styles.groupTab,
              selectedGroup === g && { backgroundColor: colors.primary },
            ]}
          >
            <Text style={[
              styles.groupTabText,
              { color: selectedGroup === g ? 'white' : appColors.textSecondary },
            ]}>
              {g}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Header row */}
      <View style={[styles.tableHeader, { borderBottomColor: appColors.border }]}>
        <Text style={[styles.headerCell, styles.posCell, { color: appColors.textSecondary }]}>#</Text>
        <Text style={[styles.headerCell, styles.teamCell, { color: appColors.textSecondary }]}>Equipo</Text>
        <Text style={[styles.headerCell, styles.statCell, { color: appColors.textSecondary }]}>J</Text>
        <Text style={[styles.headerCell, styles.statCell, { color: appColors.textSecondary }]}>G</Text>
        <Text style={[styles.headerCell, styles.statCell, { color: appColors.textSecondary }]}>GD</Text>
        <Text style={[styles.headerCell, styles.ptsCell, { color: appColors.textSecondary }]}>Pts</Text>
      </View>

      {entries.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: appColors.textSecondary }]}>Sin datos</Text>
        </View>
      ) : (
        entries.map((entry: any, i: number) => {
          const qualifies = i < 2;
          const thirdChance = i === 2;
          return (
            <TouchableOpacity
              key={entry.team?.id ?? i}
              style={[
                styles.row,
                { borderBottomColor: appColors.border },
                qualifies && { backgroundColor: colors.primary + '0C' },
              ]}
              onPress={() => navigation.navigate('TeamDetail', { teamId: entry.team?.id })}
            >
              <Text style={[
                styles.posCell,
                styles.posText,
                { color: qualifies ? colors.primary : thirdChance ? colors.warning : appColors.textSecondary },
              ]}>
                {i + 1}
              </Text>
              <View style={styles.teamCell}>
                <TeamLogo uri={entry.team?.logo} size={20} code={entry.team?.code} />
                <Text style={[styles.teamName, { color: appColors.text }]} numberOfLines={1}>
                  {entry.team?.shortName ?? entry.team?.name}
                </Text>
              </View>
              <Text style={[styles.statCell, styles.statText, { color: appColors.textSecondary }]}>
                {entry.pj ?? 0}
              </Text>
              <Text style={[styles.statCell, styles.statText, { color: appColors.textSecondary }]}>
                {entry.pg ?? 0}
              </Text>
              <Text style={[styles.statCell, styles.statText, { color: appColors.textSecondary }]}>
                {(entry.gf ?? 0) - (entry.gc ?? 0) >= 0 ? '+' : ''}{(entry.gf ?? 0) - (entry.gc ?? 0)}
              </Text>
              <Text style={[styles.ptsCell, styles.ptsText, { color: qualifies ? colors.primary : appColors.text }]}>
                {entry.pts ?? 0}
              </Text>
            </TouchableOpacity>
          );
        })
      )}

      {/* Footer */}
      <View style={[styles.footer, { borderTopColor: appColors.border }]}>
        <View style={styles.legend}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary + '50' }]} />
          <Text style={[styles.legendText, { color: appColors.textSecondary }]}>Clasifica</Text>
          <View style={[styles.legendDot, { backgroundColor: colors.warning + '50', marginLeft: 8 }]} />
          <Text style={[styles.legendText, { color: appColors.textSecondary }]}>3° pot.</Text>
        </View>
        {updatedAgo && (
          <Text style={[styles.updatedText, { color: appColors.textSecondary }]}>
            ↻ {updatedAgo}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: borderRadius.lg, overflow: 'hidden' },
  groupTabs: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  groupTab: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  groupTabText: {
    fontSize: 12,
    fontFamily: typography.fontFamily.bold,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerCell: {
    fontSize: 10,
    fontFamily: typography.fontFamily.medium,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  posCell: { width: 20 },
  posText: { fontSize: 12, fontFamily: typography.fontFamily.bold, textAlign: 'center' },
  teamCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  teamName: { fontSize: 12, fontFamily: typography.fontFamily.medium },
  statCell: { width: 24, textAlign: 'center' },
  statText: { fontSize: 11 },
  ptsCell: { width: 28, textAlign: 'right' },
  ptsText: { fontSize: 12, fontFamily: typography.fontFamily.bold },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 9 },
  updatedText: { fontSize: 9 },
  empty: { padding: spacing.base, alignItems: 'center' },
  emptyText: { fontSize: 12 },
});
