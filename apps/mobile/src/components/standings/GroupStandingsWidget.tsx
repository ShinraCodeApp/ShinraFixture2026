import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { apiService } from '../../services/api';
import { useAppTheme } from '../../hooks/useAppTheme';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { TeamLogo } from '../common/TeamLogo';

export function GroupStandingsWidget({ group }: { group: string }) {
  const { appColors } = useAppTheme();
  const navigation = useNavigation<any>();

  const { data: allTeams } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => (await apiService.get('/teams')).data.data ?? [],
    staleTime: 10 * 60_000,
  });

  const teams = (allTeams ?? []).filter((t: any) => t.group === group).slice(0, 4);

  return (
    <View style={[styles.container, { backgroundColor: appColors.surface }]}>
      <Text style={[styles.groupTitle, { color: appColors.text }]}>Grupo {group}</Text>
      {teams.map((team: any, i: number) => (
        <TouchableOpacity
          key={team.id}
          style={[styles.row, { borderBottomColor: appColors.border }]}
          onPress={() => navigation.navigate('TeamDetail', { teamId: team.id })}
        >
          <Text style={[styles.pos, { color: i < 2 ? colors.primary : appColors.textSecondary }]}>{i + 1}</Text>
          <TeamLogo uri={team.flagUrl} size={20} code={team.code} />
          <Text style={[styles.teamName, { color: appColors.text }]} numberOfLines={1}>{team.name}</Text>
          <Text style={[styles.pts, { color: appColors.text }]}>0 pts</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: borderRadius.lg, overflow: 'hidden' },
  groupTitle: {
    fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.bold,
    padding: spacing.sm, paddingHorizontal: spacing.base,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.base, paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pos: { width: 16, fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.bold, textAlign: 'center' },
  teamName: { flex: 1, fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.medium },
  pts: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.bold },
});
