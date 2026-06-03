import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { apiService } from '../../services/api';
import { useAppTheme } from '../../hooks/useAppTheme';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { TeamLogo } from '../common/TeamLogo';

const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L'];

export function StandingsTab() {
  const { appColors } = useAppTheme();
  const navigation = useNavigation<any>();
  const [selectedGroup, setSelectedGroup] = useState('A');

  const { data: allTeams } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => (await apiService.get('/teams')).data.data ?? [],
    staleTime: 5 * 60_000,
  });

  const teams = (allTeams ?? []).filter((t: any) => t.group === selectedGroup);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.groups}>
        {GROUPS.map((g) => (
          <TouchableOpacity
            key={g}
            style={[styles.groupBtn, g === selectedGroup && { backgroundColor: colors.primary }]}
            onPress={() => setSelectedGroup(g)}
          >
            <Text style={[styles.groupBtnText, g === selectedGroup && { color: 'white' }]}>{g}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={[styles.table, { backgroundColor: appColors.surface }]}>
        <View style={[styles.tableHeader, { borderBottomColor: appColors.border }]}>
          <Text style={[styles.th, { flex: 0.4 }]}>#</Text>
          <Text style={[styles.th, { flex: 3 }]}>Selección</Text>
          {['PJ','G','E','P','GF','GC','DG','Pts'].map((h) => (
            <Text key={h} style={[styles.th, { flex: 0.8 }]}>{h}</Text>
          ))}
        </View>
        {teams.map((team: any, i: number) => (
          <TouchableOpacity
            key={team.id}
            style={[styles.row, i < teams.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: appColors.border }]}
            onPress={() => navigation.navigate('TeamDetail', { teamId: team.id })}
          >
            <Text style={[styles.td, { flex: 0.4, color: i < 2 ? colors.primary : appColors.textSecondary, fontFamily: typography.fontFamily.bold }]}>{i + 1}</Text>
            <View style={[styles.td, { flex: 3, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
              <TeamLogo uri={team.flagUrl} size={18} code={team.code} />
              <Text style={{ color: appColors.text, fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.medium }} numberOfLines={1}>{team.name}</Text>
            </View>
            {[0,0,0,0,0,0,0,0].map((v, j) => (
              <Text key={j} style={[styles.td, { flex: 0.8, color: appColors.textSecondary }]}>{v}</Text>
            ))}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  groups: { paddingHorizontal: spacing.base, paddingVertical: spacing.sm, gap: spacing.xs },
  groupBtn: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)',
  },
  groupBtnText: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.bold },
  table: { marginHorizontal: spacing.base, borderRadius: borderRadius.lg, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderBottomWidth: StyleSheet.hairlineWidth },
  th: { fontSize: 9, fontFamily: typography.fontFamily.bold, textAlign: 'center', color: '#9CA3AF' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  td: { fontSize: typography.fontSize.xs, textAlign: 'center' },
});
