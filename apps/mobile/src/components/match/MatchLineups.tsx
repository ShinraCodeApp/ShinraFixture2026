import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Dimensions, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAppTheme } from '../../hooks/useAppTheme';
import { spacing, typography, borderRadius, colors } from '../../theme';
import { apiService as apiClient } from '../../services/api';

const { width: W } = Dimensions.get('window');
const PITCH_W = W - spacing.screen * 2 - spacing.base * 2;
const PITCH_H = PITCH_W * 1.4;

// Formation positions [x%, y%] — x: left=0.05(GK) right=0.95(GK away), y: top=0 bottom=1
const FORMATIONS: Record<string, [number, number][]> = {
  '4-3-3': [
    [0.08, 0.5],                                              // GK
    [0.22, 0.15],[0.22, 0.38],[0.22, 0.62],[0.22, 0.85],    // DEF
    [0.45, 0.2],[0.45, 0.5],[0.45, 0.8],                    // MID
    [0.7, 0.15],[0.7, 0.5],[0.7, 0.85],                     // FWD
  ],
  '4-4-2': [
    [0.08, 0.5],
    [0.22, 0.15],[0.22, 0.38],[0.22, 0.62],[0.22, 0.85],
    [0.45, 0.15],[0.45, 0.38],[0.45, 0.62],[0.45, 0.85],
    [0.68, 0.35],[0.68, 0.65],
  ],
  '4-2-3-1': [
    [0.08, 0.5],
    [0.22, 0.15],[0.22, 0.38],[0.22, 0.62],[0.22, 0.85],
    [0.38, 0.35],[0.38, 0.65],
    [0.58, 0.15],[0.58, 0.5],[0.58, 0.85],
    [0.75, 0.5],
  ],
};

const POS_ORDER = { GK: 0, DF: 1, MF: 2, FW: 3 };
const POS_LABEL: Record<string, string> = { GK: 'POR', DF: 'DEF', MF: 'MED', FW: 'DEL' };

interface Props { matchId: string }

function PlayerDot({ x, y, name, color, number }: {
  x: number; y: number; name: string; color: string; number?: number
}) {
  const shortName = name.split(' ').pop() ?? name;
  return (
    <View style={[styles.dot, { left: x - 18, top: y - 18 }]}>
      <View style={[styles.dotCircle, { backgroundColor: color }]}>
        <Text style={styles.dotNum}>{number ?? ''}</Text>
      </View>
      <Text style={styles.dotName} numberOfLines={1}>{shortName}</Text>
    </View>
  );
}

export function MatchLineups({ matchId }: Props) {
  const { appColors } = useAppTheme();
  const [activeTeam, setActiveTeam] = useState<'home' | 'away'>('home');

  // Get match details (team IDs)
  const { data: match } = useQuery({
    queryKey: ['match', matchId],
    queryFn: async () => (await apiClient.get(`/matches/${matchId}`)).data.data,
    staleTime: 5 * 60_000,
  });

  // Get squad from ESPN for home team
  const { data: homeSquad, isLoading: loadingHome } = useQuery({
    queryKey: ['espn-squad', match?.homeTeamId],
    queryFn: async () => (await apiClient.get(`/teams/${match!.homeTeamId}/espn-squad`)).data.data,
    enabled: !!match?.homeTeamId,
    staleTime: 30 * 60_000,
  });

  // Get squad from ESPN for away team
  const { data: awaySquad, isLoading: loadingAway } = useQuery({
    queryKey: ['espn-squad', match?.awayTeamId],
    queryFn: async () => (await apiClient.get(`/teams/${match!.awayTeamId}/espn-squad`)).data.data,
    enabled: !!match?.awayTeamId,
    staleTime: 30 * 60_000,
  });

  const isLoading = loadingHome || loadingAway || !match;

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  }

  const GENERIC_LINEUP = Array.from({ length: 11 }, (_, i) => ({
    id: `g${i}`, number: i + 1, name: '', positionAbbr: i === 0 ? 'GK' : i < 5 ? 'DF' : i < 8 ? 'MF' : 'FW',
  }));

  // Build ordered lineup from squad (GK first, then DF, MF, FW — max 11)
  const buildLineup = (squad: any) => {
    if (!squad?.squad?.length) return GENERIC_LINEUP;
    const sorted = [...squad.squad].sort((a: any, b: any) =>
      (POS_ORDER[a.positionAbbr as keyof typeof POS_ORDER] ?? 4) -
      (POS_ORDER[b.positionAbbr as keyof typeof POS_ORDER] ?? 4)
    );
    return sorted.slice(0, 11);
  };

  const homePlayers = buildLineup(homeSquad);
  const awayPlayers = buildLineup(awaySquad);

  // Assign formation positions
  const homeFormation = '4-3-3';
  const awayFormation = '4-4-2';
  const homePositions = FORMATIONS[homeFormation] ?? FORMATIONS['4-3-3'];
  // Away positions are mirrored (flip x)
  const awayPositions = (FORMATIONS[awayFormation] ?? FORMATIONS['4-4-2'])
    .map(([x, y]): [number, number] => [1 - x, y]);

  const currentPlayers = activeTeam === 'home' ? homePlayers : awayPlayers;
  const currentPositions = activeTeam === 'home' ? homePositions : awayPositions;
  const currentColor = activeTeam === 'home' ? '#001489' : '#C8102E';
  const currentLabel = activeTeam === 'home'
    ? (match?.homeTeam?.shortName ?? 'Local')
    : (match?.awayTeam?.shortName ?? 'Visitante');

  return (
    <View>
      {/* Team switcher */}
      <View style={styles.switcher}>
        <TouchableOpacity
          style={[styles.switchBtn, activeTeam === 'home' && { backgroundColor: '#001489' }]}
          onPress={() => setActiveTeam('home')}
        >
          <Text style={[styles.switchTxt, activeTeam === 'home' && { color: 'white' }]}>
            {match?.homeTeam?.code ?? 'Local'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.switchBtn, activeTeam === 'away' && { backgroundColor: '#C8102E' }]}
          onPress={() => setActiveTeam('away')}
        >
          <Text style={[styles.switchTxt, activeTeam === 'away' && { color: 'white' }]}>
            {match?.awayTeam?.code ?? 'Visitante'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Formation label */}
      <Text style={[styles.formLabel, { color: appColors.textSecondary }]}>
        {currentLabel} — {activeTeam === 'home' ? homeFormation : awayFormation}
      </Text>

      {/* Pitch */}
      <View style={[styles.pitch, { width: PITCH_W, height: PITCH_H }]}>
        {/* Pitch lines */}
        <View style={styles.halfLine} />
        <View style={styles.centerCircle} />
        <View style={[styles.penArea, { top: PITCH_H * 0.1 }]} />
        <View style={[styles.penArea, { bottom: PITCH_H * 0.1, top: undefined }]} />

        {/* Player dots */}
        {currentPlayers.map((player: any, i: number) => {
          const [px, py] = currentPositions[i] ?? [0.5, 0.5];
          return (
            <PlayerDot
              key={player.id ?? i}
              x={px * PITCH_W}
              y={py * PITCH_H}
              name={player.name ?? 'Jugador'}
              color={currentColor}
              number={player.number}
            />
          );
        })}
      </View>

      {/* Player list */}
      <View style={[styles.list, { backgroundColor: appColors.surface, borderRadius: borderRadius.lg }]}>
        {currentPlayers.map((player: any, i: number) => (
          <View key={player.id ?? i} style={[styles.listRow, { borderBottomColor: appColors.border }]}>
            <View style={[styles.numBadge, { backgroundColor: currentColor }]}>
              <Text style={styles.numText}>{player.number ?? i + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.playerName, { color: appColors.text }]}>{player.name}</Text>
            </View>
            <Text style={[styles.posTag, { color: currentColor, borderColor: currentColor }]}>
              {POS_LABEL[player.positionAbbr ?? ''] ?? player.positionAbbr ?? ''}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { padding: spacing.xl, alignItems: 'center' },
  switcher: {
    flexDirection: 'row', gap: spacing.sm,
    marginBottom: spacing.sm, justifyContent: 'center',
  },
  switchBtn: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.xs,
    borderRadius: borderRadius.full, borderWidth: 1, borderColor: 'rgba(0,0,0,0.12)',
  },
  switchTxt: { fontSize: typography.fontSize.sm, fontFamily: 'Inter_600SemiBold' },
  formLabel: {
    textAlign: 'center', fontSize: 11, fontFamily: 'Inter_500Medium',
    marginBottom: spacing.sm,
  },
  pitch: {
    alignSelf: 'center', backgroundColor: '#1a5c2a',
    borderRadius: 8, overflow: 'hidden', marginBottom: spacing.base,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
    position: 'relative',
  },
  halfLine: {
    position: 'absolute', left: 0, right: 0,
    top: '50%', height: 1.5, backgroundColor: 'rgba(255,255,255,0.5)',
  },
  centerCircle: {
    position: 'absolute', width: 60, height: 60, borderRadius: 30,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)',
    top: '50%', left: '50%',
    transform: [{ translateX: -30 }, { translateY: -30 }],
  },
  penArea: {
    position: 'absolute', left: '25%', right: '25%', height: '12%',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)',
  },
  dot: {
    position: 'absolute', alignItems: 'center', width: 36,
  },
  dotCircle: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4, shadowRadius: 2, elevation: 3,
  },
  dotNum: { color: 'white', fontSize: 9, fontFamily: 'Inter_700Bold' },
  dotName: {
    color: 'white', fontSize: 8, fontFamily: 'Inter_500Medium',
    marginTop: 1, textShadowColor: '#000', textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2, maxWidth: 36, textAlign: 'center',
  },
  list: { padding: spacing.base },
  listRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  numBadge: {
    width: 24, height: 24, borderRadius: 4,
    alignItems: 'center', justifyContent: 'center',
  },
  numText: { color: 'white', fontSize: 10, fontFamily: 'Inter_700Bold' },
  playerName: { fontSize: typography.fontSize.sm, fontFamily: 'Inter_500Medium' },
  posTag: {
    fontSize: 9, fontFamily: 'Inter_700Bold',
    borderWidth: 1, borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1,
  },
});
