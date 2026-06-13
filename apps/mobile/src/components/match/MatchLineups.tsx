import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Dimensions, TouchableOpacity, Image } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAppTheme } from '../../hooks/useAppTheme';
import { spacing, typography, borderRadius, colors } from '../../theme';
import { apiService as apiClient } from '../../services/api';

const { width: W } = Dimensions.get('window');
const PITCH_W = W - spacing.screen * 2 - spacing.base * 2;
const PITCH_H = PITCH_W * 1.4;

const FORMATIONS: Record<string, [number, number][]> = {
  '4-3-3': [
    [0.08, 0.5],
    [0.22, 0.15],[0.22, 0.38],[0.22, 0.62],[0.22, 0.85],
    [0.45, 0.2],[0.45, 0.5],[0.45, 0.8],
    [0.7, 0.15],[0.7, 0.5],[0.7, 0.85],
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
  '3-5-2': [
    [0.08, 0.5],
    [0.22, 0.25],[0.22, 0.5],[0.22, 0.75],
    [0.42, 0.1],[0.42, 0.3],[0.42, 0.5],[0.42, 0.7],[0.42, 0.9],
    [0.7, 0.35],[0.7, 0.65],
  ],
  '5-3-2': [
    [0.08, 0.5],
    [0.2, 0.1],[0.2, 0.3],[0.2, 0.5],[0.2, 0.7],[0.2, 0.9],
    [0.45, 0.25],[0.45, 0.5],[0.45, 0.75],
    [0.7, 0.35],[0.7, 0.65],
  ],
};

const POS_ORDER: Record<string, number> = { GK: 0, GR: 0, DF: 1, CB: 1, LB: 1, RB: 1, MF: 2, MID: 2, CM: 2, DM: 2, AM: 2, FW: 3, ATT: 3, ST: 3, LW: 3, RW: 3 };
const POS_LABEL: Record<string, string> = { GK: 'POR', GR: 'POR', DF: 'DEF', CB: 'DEF', LB: 'DEF', RB: 'DEF', MF: 'MED', MID: 'MED', CM: 'MED', DM: 'MED', AM: 'MED', FW: 'DEL', ATT: 'DEL', ST: 'DEL' };

interface Props { matchId: string }

function PlayerDot({ x, y, name, color, number }: { x: number; y: number; name: string; color: string; number?: any }) {
  const lastName = name.split(' ').pop() ?? name;
  return (
    <View style={[styles.dot, { left: x - 18, top: y - 18 }]}>
      <View style={[styles.dotCircle, { backgroundColor: color }]}>
        <Text style={styles.dotNum}>{number ?? ''}</Text>
      </View>
      <Text style={styles.dotName} numberOfLines={1}>{lastName}</Text>
    </View>
  );
}

export function MatchLineups({ matchId }: Props) {
  const { appColors } = useAppTheme();
  const [activeTeam, setActiveTeam] = useState<'home' | 'away'>('home');
  const [showBench, setShowBench] = useState(false);

  // Try real ESPN match lineup first
  const { data: espnData, isLoading: loadingEspn } = useQuery({
    queryKey: ['espn-lineup', matchId],
    queryFn: async () => (await apiClient.get(`/matches/${matchId}/espn-lineup`)).data,
    staleTime: 10 * 60_000,
    retry: 1,
  });

  // Fallback: get match details for squad-based lineup
  const { data: match, isLoading: loadingMatch } = useQuery({
    queryKey: ['match', matchId],
    queryFn: async () => (await apiClient.get(`/matches/${matchId}`)).data.data,
    staleTime: 5 * 60_000,
    enabled: !espnData?.data?.lineups,
  });

  const { data: homeSquad } = useQuery({
    queryKey: ['espn-squad', match?.homeTeamId],
    queryFn: async () => (await apiClient.get(`/teams/${match!.homeTeamId}/espn-squad`)).data.data,
    enabled: !!match?.homeTeamId && !espnData?.data?.lineups,
    staleTime: 30 * 60_000,
  });

  const { data: awaySquad } = useQuery({
    queryKey: ['espn-squad', match?.awayTeamId],
    queryFn: async () => (await apiClient.get(`/teams/${match!.awayTeamId}/espn-squad`)).data.data,
    enabled: !!match?.awayTeamId && !espnData?.data?.lineups,
    staleTime: 30 * 60_000,
  });

  const isLoading = loadingEspn || (loadingMatch && !espnData?.data);

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  }

  // ── Real ESPN lineup ─────────────────────────────────────────────────────
  const espnLineups: any[] | null = espnData?.data?.lineups ?? null;
  if (espnLineups && espnLineups.length >= 2) {
    const homeRoster = espnLineups.find((r: any) => r.isHome) ?? espnLineups[0];
    const awayRoster = espnLineups.find((r: any) => !r.isHome) ?? espnLineups[1];
    const current = activeTeam === 'home' ? homeRoster : awayRoster;
    const starters: any[] = current.starters ?? [];
    const bench: any[] = current.bench ?? [];

    const formation = current.formation ?? '4-3-3';
    const positions = (FORMATIONS[formation] ?? FORMATIONS['4-3-3'])
      .map(([x, y]): [number, number] => activeTeam === 'away' ? [1 - x, y] : [x, y]);

    const teamColor = activeTeam === 'home' ? '#001489' : '#C8102E';
    const homeLabel = homeRoster.team?.displayName ?? 'Local';
    const awayLabel = awayRoster.team?.displayName ?? 'Visitante';

    return (
      <View>
        {/* Source badge */}
        <View style={styles.sourceBadge}>
          <Text style={styles.sourceText}>Alineación oficial ESPN</Text>
        </View>

        {/* Team switcher */}
        <View style={styles.switcher}>
          <TouchableOpacity
            style={[styles.switchBtn, activeTeam === 'home' && { backgroundColor: '#001489' }]}
            onPress={() => setActiveTeam('home')}
          >
            {homeRoster.team?.logo ? (
              <Image source={{ uri: homeRoster.team.logo }} style={styles.switchLogo} />
            ) : null}
            <Text style={[styles.switchTxt, activeTeam === 'home' && { color: 'white' }]}>
              {homeRoster.team?.abbreviation ?? 'Local'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.switchBtn, activeTeam === 'away' && { backgroundColor: '#C8102E' }]}
            onPress={() => setActiveTeam('away')}
          >
            {awayRoster.team?.logo ? (
              <Image source={{ uri: awayRoster.team.logo }} style={styles.switchLogo} />
            ) : null}
            <Text style={[styles.switchTxt, activeTeam === 'away' && { color: 'white' }]}>
              {awayRoster.team?.abbreviation ?? 'Visitante'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.formLabel, { color: appColors.textSecondary }]}>
          {activeTeam === 'home' ? homeLabel : awayLabel} — {formation}
        </Text>

        {/* Pitch */}
        <View style={[styles.pitch, { width: PITCH_W, height: PITCH_H }]}>
          <View style={styles.halfLine} />
          <View style={styles.centerCircle} />
          <View style={[styles.penArea, { top: PITCH_H * 0.1 }]} />
          <View style={[styles.penArea, { bottom: PITCH_H * 0.1, top: undefined }]} />
          {starters.slice(0, 11).map((player: any, i: number) => {
            const [px, py] = positions[i] ?? [0.5, 0.5];
            return (
              <PlayerDot key={player.id ?? i} x={px * PITCH_W} y={py * PITCH_H}
                name={player.name} color={teamColor} number={player.number} />
            );
          })}
        </View>

        {/* Starters list */}
        <View style={[styles.list, { backgroundColor: appColors.surface, borderRadius: borderRadius.lg }]}>
          <Text style={[styles.listHeader, { color: appColors.textSecondary }]}>Titulares</Text>
          {starters.map((player: any, i: number) => (
            <View key={player.id ?? i} style={[styles.listRow, { borderBottomColor: appColors.border }]}>
              <View style={[styles.numBadge, { backgroundColor: teamColor }]}>
                <Text style={styles.numText}>{player.number ?? i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.playerName, { color: appColors.text }]}>{player.name}</Text>
              </View>
              <Text style={[styles.posTag, { color: teamColor, borderColor: teamColor }]}>
                {POS_LABEL[player.positionAbbr?.toUpperCase() ?? ''] ?? player.positionAbbr ?? ''}
              </Text>
            </View>
          ))}
        </View>

        {/* Bench toggle */}
        {bench.length > 0 && (
          <TouchableOpacity style={styles.benchToggle} onPress={() => setShowBench(s => !s)}>
            <Text style={[styles.benchToggleTxt, { color: appColors.textSecondary }]}>
              {showBench ? 'Ocultar' : 'Ver'} suplentes ({bench.length})
            </Text>
          </TouchableOpacity>
        )}

        {showBench && bench.length > 0 && (
          <View style={[styles.list, { backgroundColor: appColors.surface, borderRadius: borderRadius.lg, marginTop: 4 }]}>
            <Text style={[styles.listHeader, { color: appColors.textSecondary }]}>Suplentes</Text>
            {bench.map((player: any, i: number) => (
              <View key={player.id ?? i} style={[styles.listRow, { borderBottomColor: appColors.border }]}>
                <View style={[styles.numBadge, { backgroundColor: appColors.border }]}>
                  <Text style={[styles.numText, { color: appColors.textSecondary }]}>{player.number ?? ''}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.playerName, { color: appColors.text }]}>{player.name}</Text>
                </View>
                <Text style={[styles.posTag, { color: appColors.textSecondary, borderColor: appColors.border }]}>
                  {POS_LABEL[player.positionAbbr?.toUpperCase() ?? ''] ?? player.positionAbbr ?? ''}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  }

  // ── Fallback: squad-based lineup ─────────────────────────────────────────
  if (!match) return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;

  const GENERIC = Array.from({ length: 11 }, (_, i) => ({
    id: `g${i}`, number: i + 1, name: `Jugador ${i + 1}`,
    positionAbbr: i === 0 ? 'GK' : i < 5 ? 'DF' : i < 8 ? 'MF' : 'FW',
  }));

  const buildLineup = (squad: any) => {
    if (!squad?.squad?.length) return GENERIC;
    return [...squad.squad]
      .sort((a: any, b: any) => (POS_ORDER[a.positionAbbr] ?? 4) - (POS_ORDER[b.positionAbbr] ?? 4))
      .slice(0, 11);
  };

  const homePlayers = buildLineup(homeSquad);
  const awayPlayers = buildLineup(awaySquad);
  const homeFormation = '4-3-3';
  const awayFormation = '4-4-2';
  const homePositions = FORMATIONS[homeFormation];
  const awayPositions = (FORMATIONS[awayFormation]).map(([x, y]): [number, number] => [1 - x, y]);

  const currentPlayers = activeTeam === 'home' ? homePlayers : awayPlayers;
  const currentPositions = activeTeam === 'home' ? homePositions : awayPositions;
  const currentColor = activeTeam === 'home' ? '#001489' : '#C8102E';

  return (
    <View>
      <View style={styles.sourceBadge}>
        <Text style={styles.sourceText}>Plantilla referencial (sin alineación confirmada)</Text>
      </View>

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

      <Text style={[styles.formLabel, { color: appColors.textSecondary }]}>
        {activeTeam === 'home' ? match?.homeTeam?.shortName : match?.awayTeam?.shortName} — {activeTeam === 'home' ? homeFormation : awayFormation}
      </Text>

      <View style={[styles.pitch, { width: PITCH_W, height: PITCH_H }]}>
        <View style={styles.halfLine} />
        <View style={styles.centerCircle} />
        <View style={[styles.penArea, { top: PITCH_H * 0.1 }]} />
        <View style={[styles.penArea, { bottom: PITCH_H * 0.1, top: undefined }]} />
        {currentPlayers.map((player: any, i: number) => {
          const [px, py] = currentPositions[i] ?? [0.5, 0.5];
          return (
            <PlayerDot key={player.id ?? i} x={px * PITCH_W} y={py * PITCH_H}
              name={player.name} color={currentColor} number={player.number} />
          );
        })}
      </View>

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
              {POS_LABEL[player.positionAbbr?.toUpperCase() ?? ''] ?? player.positionAbbr ?? ''}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { padding: spacing.xl, alignItems: 'center' },
  sourceBadge: {
    alignSelf: 'center', backgroundColor: `${colors.primary}15`,
    borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: 3,
    marginBottom: spacing.sm,
  },
  sourceText: { fontSize: 10, color: colors.primary, fontFamily: 'Inter_500Medium' },
  switcher: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm, justifyContent: 'center' },
  switchBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.xs,
    borderRadius: borderRadius.full, borderWidth: 1, borderColor: 'rgba(0,0,0,0.12)',
  },
  switchLogo: { width: 16, height: 16, borderRadius: 8, resizeMode: 'contain' },
  switchTxt: { fontSize: typography.fontSize.sm, fontFamily: 'Inter_600SemiBold' },
  formLabel: { textAlign: 'center', fontSize: 11, fontFamily: 'Inter_500Medium', marginBottom: spacing.sm },
  pitch: {
    alignSelf: 'center', backgroundColor: '#1a5c2a',
    borderRadius: 8, overflow: 'hidden', marginBottom: spacing.base,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', position: 'relative',
  },
  halfLine: { position: 'absolute', left: 0, right: 0, top: '50%', height: 1.5, backgroundColor: 'rgba(255,255,255,0.5)' },
  centerCircle: {
    position: 'absolute', width: 60, height: 60, borderRadius: 30,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)',
    top: '50%', left: '50%', transform: [{ translateX: -30 }, { translateY: -30 }],
  },
  penArea: {
    position: 'absolute', left: '25%', right: '25%', height: '12%',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)',
  },
  dot: { position: 'absolute', alignItems: 'center', width: 36 },
  dotCircle: {
    width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.4, shadowRadius: 2, elevation: 3,
  },
  dotNum: { color: 'white', fontSize: 9, fontFamily: 'Inter_700Bold' },
  dotName: {
    color: 'white', fontSize: 8, fontFamily: 'Inter_500Medium', marginTop: 1,
    textShadowColor: '#000', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
    maxWidth: 36, textAlign: 'center',
  },
  listHeader: { fontSize: 10, fontFamily: 'Inter_600SemiBold', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  list: { padding: spacing.base },
  listRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  numBadge: { width: 24, height: 24, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  numText: { color: 'white', fontSize: 10, fontFamily: 'Inter_700Bold' },
  playerName: { fontSize: typography.fontSize.sm, fontFamily: 'Inter_500Medium' },
  posTag: { fontSize: 9, fontFamily: 'Inter_700Bold', borderWidth: 1, borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1 },
  benchToggle: { alignItems: 'center', paddingVertical: spacing.sm },
  benchToggleTxt: { fontSize: typography.fontSize.xs, fontFamily: 'Inter_500Medium' },
});
