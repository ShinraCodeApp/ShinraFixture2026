import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { apiService } from '../../services/api';
import { useAppTheme } from '../../hooks/useAppTheme';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { TeamLogo } from '../common/TeamLogo';
import { RootState, AppDispatch } from '../../store';
import { selectTournament } from '../../store/slices/tournamentSlice';

// Tipos sin tabla de posiciones (amistosos)
const NO_STANDINGS_TYPES = new Set(['FRIENDLY']);

// Tipos de torneo que tienen tabla única (sin selector de grupos)
const SINGLE_TABLE_TYPES = new Set([
  'PREMIER_LEAGUE', 'LA_LIGA', 'BUNDESLIGA', 'SERIE_A', 'LIGUE_1', 'LEAGUE',
]);

// Tipos con grupos A-H (Copa Lib, Sudamericana, Copa América, Euro, AFCON, etc.)
const EIGHT_GROUP_TYPES = new Set([
  'LIBERTADORES', 'SUDAMERICANA', 'COPA_AMERICA', 'EURO', 'NATIONS_LEAGUE',
  'CHAMPIONS_LEAGUE',
]);

// Tipos con grupos A-L (Mundial)
const TWELVE_GROUP_TYPES = new Set(['WORLD_CUP']);

// Tipos con grupos A-B (Liga Profesional Argentina)
const TWO_GROUP_TYPES = new Set(['LIGA_ARG']);

// Tipos con grupos A-F (AFCON, Asian Cup, etc.)
const SIX_GROUP_TYPES = new Set(['COPA_AMERICA']);

interface StandingsTabProps {
  tournamentId?: string;
  tournamentType?: string;
  search?: string;
  onGroupPress?: (group: string, tournamentId: string) => void;
}

export function StandingsTab({ tournamentId, tournamentType, search = '', onGroupPress }: StandingsTabProps) {
  const { appColors } = useAppTheme();
  const navigation = useNavigation<any>();
  const dispatch = useDispatch<AppDispatch>();
  const [selectedGroup, setSelectedGroup] = useState('A');
  const { language } = useSelector((state: RootState) => state.settings);

  const { data: tournament, isLoading, refetch } = useQuery({
    queryKey: ['tournament', tournamentId],
    queryFn: async () => {
      if (!tournamentId) return null;
      const res = await apiService.get(`/tournaments/${tournamentId}`);
      return res.data.data;
    },
    enabled: !!tournamentId,
    staleTime: 5 * 60_000,
  });

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => { setRefreshing(true); await refetch(); setRefreshing(false); };

  // Determinar el tipo real (viene del prop o del objeto)
  const tType = tournamentType ?? tournament?.type ?? '';

  // Amistosos: no hay tabla de posiciones — botón directo al tab Partidos
  if (NO_STANDINGS_TYPES.has(tType)) {
    const goToMatches = () => {
      if (tournamentId) dispatch(selectTournament(tournamentId));
      navigation.navigate('MatchesTab');
    };
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>🤝</Text>
        <Text style={{ color: appColors.text, fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold, textAlign: 'center', marginBottom: 8 }}>
          Partidos Amistosos
        </Text>
        <Text style={{ color: appColors.textSecondary, fontSize: typography.fontSize.sm, textAlign: 'center', marginBottom: 24 }}>
          Los amistosos no tienen tabla de posiciones.
        </Text>
        <TouchableOpacity
          onPress={goToMatches}
          style={{ backgroundColor: colors.primary, paddingHorizontal: 28, paddingVertical: 12, borderRadius: borderRadius.full, flexDirection: 'row', alignItems: 'center', gap: 8 }}
          activeOpacity={0.85}
        >
          <Text style={{ color: 'white', fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.bold }}>
            Ver fixture de amistosos →
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isSingleTable = SINGLE_TABLE_TYPES.has(tType);

  // Grupos disponibles según tipo
  const availableGroups = isSingleTable
    ? ['A']
    : TWELVE_GROUP_TYPES.has(tType)
    ? ['A','B','C','D','E','F','G','H','I','J','K','L']
    : TWO_GROUP_TYPES.has(tType)
    ? ['A','B']
    : ['A','B','C','D','E','F','G','H'];

  const displayName = (team: any) =>
    language === 'en' ? (team.shortName || team.name) : team.name;

  // Para tabla única: usar el grupo 'A' que es el único
  const groupLetter = isSingleTable ? 'A' : selectedGroup;
  const currentGroup = tournament?.groups?.find((g: any) => g.letter === groupLetter);
  const rawTeams = currentGroup?.teams ?? [];

  // Ordenar por points → goalDifference → goalsFor
  const q = search.toLowerCase().trim();
  const teams = [...rawTeams]
    .filter((t: any) => !q || (t.team?.name ?? '').toLowerCase().includes(q) || (t.team?.code ?? '').toLowerCase().includes(q))
    .sort((a: any, b: any) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });

  // Estadísticas a mostrar: tabla única muestra más columnas
  const headers = isSingleTable
    ? ['PJ','G','E','P','GF','GC','DG','Pts']
    : ['PJ','G','E','P','GF','GC','DG','Pts'];

  const rowValues = (entry: any) => [
    entry.played ?? 0,
    entry.won ?? 0,
    entry.drawn ?? 0,
    entry.lost ?? 0,
    entry.goalsFor ?? 0,
    entry.goalsAgainst ?? 0,
    entry.goalDifference ?? 0,
    entry.points ?? 0,
  ];

  // Color por posición en tabla única (European spots)
  const positionColor = (i: number) => {
    if (!isSingleTable) return i < 2 ? colors.primary : appColors.textSecondary;
    if (tType === 'PREMIER_LEAGUE' || tType === 'LA_LIGA' || tType === 'BUNDESLIGA') {
      if (i < 4) return '#2196F3';   // Champions League
      if (i === 4 || i === 5) return '#4CAF50';  // Europa League
      if (i === 6) return '#8BC34A'; // Conference League
      if (i >= teams.length - 3) return colors.error; // Descenso
    }
    if (tType === 'SERIE_A') {
      if (i < 4) return '#2196F3';
      if (i === 4 || i === 5) return '#4CAF50';
      if (i === 6) return '#8BC34A';
      if (i >= teams.length - 3) return colors.error;
    }
    if (tType === 'LIGUE_1') {
      if (i === 0) return '#2196F3';
      if (i < 4) return '#2196F3';
      if (i < 6) return '#4CAF50';
      if (i >= teams.length - 2) return colors.error;
    }
    if (tType === 'LIGA_ARG') {
      if (i < 4) return colors.primary; // Clasificados
      if (i >= teams.length - 3) return colors.error;
    }
    return appColors.textSecondary;
  };

  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
      {/* Selector de grupos — oculto en tabla única */}
      {!isSingleTable && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.groups}>
          {/* Botón ranking #WC — solo Mundial */}
          {TWELVE_GROUP_TYPES.has(tType) && (
            <TouchableOpacity
              style={[styles.groupBtn, styles.rankingBtn]}
              onPress={() => navigation.navigate('HomeTab' as any, { screen: 'Stats' } as any)}
            >
              <Text style={[styles.groupBtnText, { color: colors.accent, fontSize: 9 }]}>#WC</Text>
            </TouchableOpacity>
          )}
          {availableGroups.map((g) => (
            <TouchableOpacity
              key={g}
              style={[styles.groupBtn, g === selectedGroup && { backgroundColor: colors.primary }]}
              onPress={() => setSelectedGroup(g)}
            >
              <Text style={[styles.groupBtnText, { color: g === selectedGroup ? '#fff' : 'rgba(255,255,255,0.65)' }]}>
                {g}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Leyenda colores para tabla única */}
      {isSingleTable && (
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#2196F3' }]} />
            <Text style={[styles.legendText, { color: appColors.textSecondary }]}>Champions</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={[styles.legendText, { color: appColors.textSecondary }]}>Europa Lg</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.error }]} />
            <Text style={[styles.legendText, { color: appColors.textSecondary }]}>Descenso</Text>
          </View>
        </View>
      )}

      {/* Tabla */}
      <TouchableOpacity
        activeOpacity={onGroupPress && !isSingleTable ? 0.7 : 1}
        onPress={() => onGroupPress && !isSingleTable && tournamentId && onGroupPress(groupLetter, tournamentId)}
      >
        <View style={[styles.table, { backgroundColor: appColors.surface }]}>
          {/* Encabezado */}
          <View style={[styles.tableHeader, { borderBottomColor: appColors.border }]}>
            <Text style={[styles.th, { flex: 0.4 }]}>#</Text>
            <Text style={[styles.th, { flex: isSingleTable ? 3.5 : 3, textAlign: 'left', paddingLeft: 4 }]}>
              {isSingleTable ? 'Club' : 'Selección'}
            </Text>
            {headers.map((h) => (
              <Text key={h} style={[styles.th, { flex: 0.75 }]}>{h}</Text>
            ))}
          </View>

          {/* Filas */}
          {teams.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={[styles.emptyText, { color: appColors.textSecondary }]}>
                {isLoading ? 'Cargando...' : `Sin equipos${!isSingleTable ? ` grupo ${groupLetter}` : ''}`}
              </Text>
            </View>
          ) : (
            teams.map((entry: any, i: number) => {
              const team = entry.team ?? entry;
              const posColor = positionColor(i);
              const isLast = i === teams.length - 1;
              return (
                <TouchableOpacity
                  key={entry.id ?? team.id}
                  style={[
                    styles.row,
                    !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: appColors.border },
                    i < 2 && !isSingleTable && { backgroundColor: `${colors.primary}08` },
                  ]}
                  onPress={() => navigation.navigate('TeamDetail', { teamId: team.id })}
                >
                  {/* Barra de color a la izquierda */}
                  <View style={[styles.posBar, { backgroundColor: posColor }]} />
                  {/* Número */}
                  <Text style={[styles.td, { flex: 0.4, color: posColor, fontFamily: typography.fontFamily.bold }]}>
                    {i + 1}
                  </Text>
                  {/* Equipo */}
                  <View style={[styles.td, { flex: isSingleTable ? 3.5 : 3, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                    <TeamLogo uri={team.flagUrl} size={isSingleTable ? 20 : 18} code={team.code} />
                    <Text
                      style={{ color: appColors.text, fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.medium }}
                      numberOfLines={1}
                    >
                      {displayName(team)}
                    </Text>
                  </View>
                  {/* Stats */}
                  {rowValues(entry).map((v, j) => (
                    <Text
                      key={j}
                      style={[
                        styles.td,
                        { flex: 0.75, color: j === 7 ? appColors.text : appColors.textSecondary,
                          fontFamily: j === 7 ? typography.fontFamily.bold : typography.fontFamily.regular },
                      ]}
                    >
                      {v}
                    </Text>
                  ))}
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </TouchableOpacity>

      {/* Botón "ver detalle del grupo" — solo para torneos con grupos */}
      {onGroupPress && !isSingleTable && tournamentId && (
        <TouchableOpacity
          style={[styles.detailBtn, { borderColor: colors.primary }]}
          onPress={() => onGroupPress(groupLetter, tournamentId)}
        >
          <Text style={[styles.detailBtnText, { color: colors.primary }]}>
            Ver detalle del Grupo {groupLetter} →
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  groups: { paddingHorizontal: spacing.base, paddingVertical: spacing.sm, gap: spacing.xs },
  groupBtn: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  rankingBtn: {
    borderColor: 'rgba(255,209,0,0.5)', backgroundColor: 'rgba(255,209,0,0.08)',
  },
  groupBtnText: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.bold },
  legend: {
    flexDirection: 'row', gap: spacing.base,
    paddingHorizontal: spacing.base, paddingBottom: spacing.xs,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 9, fontFamily: typography.fontFamily.regular },
  table: { marginHorizontal: spacing.base, borderRadius: borderRadius.lg, overflow: 'hidden' },
  tableHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  th: { fontSize: 9, fontFamily: typography.fontFamily.bold, textAlign: 'center', color: '#9CA3AF' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingRight: spacing.sm },
  posBar: { width: 3, height: '100%', position: 'absolute', left: 0, borderRadius: 2 },
  td: { fontSize: typography.fontSize.xs, textAlign: 'center', paddingLeft: spacing.xs },
  emptyRow: { padding: spacing.base, alignItems: 'center' },
  emptyText: { fontSize: typography.fontSize.xs },
  detailBtn: {
    marginHorizontal: spacing.base, marginTop: spacing.sm,
    borderWidth: 1, borderRadius: borderRadius.md,
    padding: spacing.sm, alignItems: 'center',
  },
  detailBtnText: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.semiBold },
});
