import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Dimensions, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Rect, Circle, Line, Path, Text as SvgText, G } from 'react-native-svg';
import { useQuery } from '@tanstack/react-query';
import { io as ioClient } from 'socket.io-client';
import { apiService } from '../../services/api';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { colors, spacing, typography, borderRadius } from '../../theme';

// Formation positions as [xFraction, yFraction] of pitch dimensions
const HOME_FORMATION_433: [number, number][] = [
  [0.07, 0.5],
  [0.22, 0.12],[0.22, 0.37],[0.22, 0.63],[0.22, 0.88],
  [0.44, 0.18],[0.44, 0.5],[0.44, 0.82],
  [0.7, 0.12],[0.7, 0.5],[0.7, 0.88],
];
const AWAY_FORMATION_442: [number, number][] = [
  [0.93, 0.5],
  [0.78, 0.12],[0.78, 0.37],[0.78, 0.63],[0.78, 0.88],
  [0.56, 0.12],[0.56, 0.37],[0.56, 0.63],[0.56, 0.88],
  [0.36, 0.33],[0.36, 0.67],
];

const POS_ORDER: Record<string, number> = { GK: 0, DF: 1, MF: 2, FW: 3 };

const { width: W } = Dimensions.get('window');
const PITCH_W = W - spacing.base * 2;
const PITCH_H = PITCH_W * 0.65;

const API_URL = process.env.EXPO_PUBLIC_WS_URL ?? 'https://shinraapi-production.up.railway.app';

const EVENT_ICONS: Record<string, { icon: string; color: string; label: string }> = {
  GOAL:             { icon: 'soccer', color: '#10B981', label: 'GOL' },
  OWN_GOAL:         { icon: 'soccer', color: '#EF4444', label: 'GOL EN CONTRA' },
  PENALTY_SCORED:   { icon: 'soccer', color: '#10B981', label: 'PENAL ✓' },
  PENALTY_MISSED:   { icon: 'soccer', color: '#6B7280', label: 'PENAL ✗' },
  YELLOW_CARD:      { icon: 'card', color: '#F59E0B', label: 'AMARILLA' },
  RED_CARD:         { icon: 'card', color: '#EF4444', label: 'ROJA' },
  SECOND_YELLOW:    { icon: 'card', color: '#EF4444', label: '2° AMARILLA' },
  SUBSTITUTION_IN:  { icon: 'swap-horizontal', color: '#3B82F6', label: 'CAMBIO' },
  KICKOFF:          { icon: 'whistle', color: '#fff', label: 'INICIO' },
  HALF_TIME:        { icon: 'pause-circle', color: '#9CA3AF', label: 'MEDIO TIEMPO' },
  FULL_TIME:        { icon: 'flag-checkered', color: '#8B5CF6', label: 'FINAL' },
  VAR_REVIEW:       { icon: 'monitor', color: '#06B6D4', label: 'VAR' },
};

function FootballPitch({
  events, homeTeamId, homePlayers, awayPlayers,
}: {
  events: any[];
  homeTeamId?: string;
  homePlayers: any[];
  awayPlayers: any[];
}) {
  const pw = PITCH_W;
  const ph = PITCH_H;
  const goalH = ph * 0.22;
  const penW = pw * 0.22;
  const penH = ph * 0.54;
  const circleR = ph * 0.16;

  const getEventPos = (ev: any, idx: number): { x: number; y: number } => {
    const isHome = ev.teamId === homeTeamId;
    const baseX = isHome ? pw * 0.14 : pw * 0.86;
    const spread = (idx % 3) * 9;
    switch (ev.type) {
      case 'GOAL': case 'OWN_GOAL': case 'PENALTY_SCORED':
        return { x: baseX, y: ph * 0.35 + (idx % 3) * (ph * 0.12) };
      case 'YELLOW_CARD': case 'RED_CARD': case 'SECOND_YELLOW':
        return { x: pw * 0.28 + (isHome ? 0 : pw * 0.44) + spread, y: ph * 0.25 + (idx % 4) * (ph * 0.14) };
      default:
        return { x: pw / 2 + spread, y: ph * 0.3 + (idx % 4) * (ph * 0.12) };
    }
  };

  return (
    <Svg width={pw} height={ph} style={styles.pitch}>
      {/* Pitch background */}
      <Rect x={0} y={0} width={pw} height={ph} fill="#1a5c2a" rx={8} />
      {Array.from({ length: 8 }).map((_, i) => (
        <Rect key={i} x={i * (pw / 8)} y={0} width={pw / 16} height={ph} fill="rgba(255,255,255,0.025)" />
      ))}
      {/* Boundary */}
      <Rect x={pw*0.03} y={ph*0.04} width={pw*0.94} height={ph*0.92} fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth={1.5} rx={2} />
      {/* Halfway line */}
      <Line x1={pw/2} y1={ph*0.04} x2={pw/2} y2={ph*0.96} stroke="rgba(255,255,255,0.65)" strokeWidth={1.5} />
      {/* Center circle */}
      <Circle cx={pw/2} cy={ph/2} r={circleR} fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth={1.5} />
      <Circle cx={pw/2} cy={ph/2} r={4} fill="rgba(255,255,255,0.8)" />
      {/* Left penalty area */}
      <Rect x={pw*0.03} y={(ph-penH)/2} width={penW} height={penH} fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth={1.5} />
      <Rect x={pw*0.03} y={(ph-goalH)/2} width={pw*0.06} height={goalH} fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth={1.2} />
      <Rect x={0} y={(ph-goalH*0.55)/2} width={pw*0.025} height={goalH*0.55} fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.9)" strokeWidth={2} />
      {/* Right penalty area */}
      <Rect x={pw*0.97-penW} y={(ph-penH)/2} width={penW} height={penH} fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth={1.5} />
      <Rect x={pw*0.91} y={(ph-goalH)/2} width={pw*0.06} height={goalH} fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth={1.2} />
      <Rect x={pw*0.975} y={(ph-goalH*0.55)/2} width={pw*0.025} height={goalH*0.55} fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.9)" strokeWidth={2} />

      {/* HOME players — blue dots */}
      {homePlayers.map((p: any, i: number) => {
        if (i >= HOME_FORMATION_433.length) return null;
        const [fx, fy] = HOME_FORMATION_433[i];
        const cx = fx * pw;
        const cy = fy * ph;
        const lastName = (p.name ?? '').split(' ').pop()?.substring(0, 7) ?? '';
        return (
          <G key={`h${i}`}>
            <Circle cx={cx} cy={cy} r={9} fill="#1D4ED8" stroke="white" strokeWidth={1.5} opacity={0.95} />
            <SvgText x={cx} y={cy + 4} textAnchor="middle" fontSize={8} fill="white" fontWeight="bold">
              {p.number ?? i + 1}
            </SvgText>
            <SvgText x={cx} y={cy + 17} textAnchor="middle" fontSize={6.5} fill="rgba(255,255,255,0.9)">
              {lastName}
            </SvgText>
          </G>
        );
      })}

      {/* AWAY players — red dots */}
      {awayPlayers.map((p: any, i: number) => {
        if (i >= AWAY_FORMATION_442.length) return null;
        const [fx, fy] = AWAY_FORMATION_442[i];
        const cx = fx * pw;
        const cy = fy * ph;
        const lastName = (p.name ?? '').split(' ').pop()?.substring(0, 7) ?? '';
        return (
          <G key={`a${i}`}>
            <Circle cx={cx} cy={cy} r={9} fill="#DC2626" stroke="white" strokeWidth={1.5} opacity={0.95} />
            <SvgText x={cx} y={cy + 4} textAnchor="middle" fontSize={8} fill="white" fontWeight="bold">
              {p.number ?? i + 1}
            </SvgText>
            <SvgText x={cx} y={cy + 17} textAnchor="middle" fontSize={6.5} fill="rgba(255,255,255,0.9)">
              {lastName}
            </SvgText>
          </G>
        );
      })}

      {/* Event markers — smaller, on top of players */}
      {events.filter(ev => ['GOAL','OWN_GOAL','PENALTY_SCORED','YELLOW_CARD','RED_CARD','SECOND_YELLOW','VAR_REVIEW'].includes(ev.type))
        .map((ev, idx) => {
          const pos = getEventPos(ev, idx);
          const meta = EVENT_ICONS[ev.type] ?? { color: '#fff', icon: 'circle' };
          const emoji = ev.type === 'GOAL' || ev.type === 'PENALTY_SCORED' ? '⚽'
            : ev.type === 'YELLOW_CARD' ? '🟨'
            : ev.type === 'RED_CARD' || ev.type === 'SECOND_YELLOW' ? '🟥'
            : ev.type === 'VAR_REVIEW' ? '📺' : '●';
          return (
            <G key={ev.id ?? idx} x={pos.x - 11} y={pos.y - 11}>
              <Circle cx={11} cy={11} r={11} fill={meta.color} opacity={0.92} stroke="white" strokeWidth={1} />
              <SvgText x={11} y={15} textAnchor="middle" fontSize={11} fill="white" fontWeight="bold">
                {emoji}
              </SvgText>
            </G>
          );
        })}
    </Svg>
  );
}

function StatBar({ label, home, away }: { label: string; home: number; away: number }) {
  const total = (home + away) || 1;
  const homeP = Math.round((home / total) * 100);
  return (
    <View style={radarStyles.statRow}>
      <Text style={radarStyles.statVal}>{home}</Text>
      <View style={radarStyles.middle}>
        <Text style={radarStyles.barLabelText}>{label}</Text>
        <View style={radarStyles.track}>
          <View style={[radarStyles.barFill, { width: `${homeP}%` as any }]} />
          <View style={[radarStyles.barFillRight, { width: `${100-homeP}%` as any }]} />
        </View>
      </View>
      <Text style={radarStyles.statVal}>{away}</Text>
    </View>
  );
}

const radarStyles = StyleSheet.create({
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 4 },
  statVal: { width: 28, textAlign: 'center', color: 'white', fontSize: 13, fontFamily: typography.fontFamily.bold },
  middle: { flex: 1, gap: 3 },
  barLabelText: { color: 'rgba(255,255,255,0.7)', fontSize: 9, fontFamily: typography.fontFamily.medium, textAlign: 'center' },
  track: { height: 8, borderRadius: 4, overflow: 'hidden', flexDirection: 'row' },
  barFill: { height: 8, backgroundColor: '#3B82F6' },
  barFillRight: { height: 8, backgroundColor: '#EF4444' },
});

export function LiveRadarScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { matchId } = route.params;
  const token = useSelector((s: RootState) => (s.auth as any).token ?? (s.auth as any).accessToken);

  const [liveEvents, setLiveEvents] = useState<any[]>([]);
  const [liveScore, setLiveScore] = useState<{ home: number; away: number; minute: number } | null>(null);
  const [liveStats, setLiveStats] = useState<any>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<any>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const { data: match, isLoading } = useQuery({
    queryKey: ['match', matchId],
    queryFn: async () => (await apiService.get(`/matches/${matchId}`)).data.data,
    staleTime: 30_000,
  });

  const { data: events, refetch: refetchEvents } = useQuery({
    queryKey: ['match-events', matchId],
    queryFn: async () => (await apiService.get(`/matches/${matchId}/events`)).data.data ?? [],
    staleTime: 0,
    refetchInterval: 30_000,
  });

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['match-stats', matchId],
    queryFn: async () => (await apiService.get(`/matches/${matchId}/stats`)).data.data,
    staleTime: 0,
    refetchInterval: 30_000,
  });

  const { data: homeSquad } = useQuery({
    queryKey: ['espn-squad', match?.homeTeamId],
    queryFn: async () => (await apiService.get(`/teams/${match!.homeTeamId}/espn-squad`)).data.data,
    enabled: !!match?.homeTeamId,
    staleTime: 30 * 60_000,
  });

  const { data: awaySquad } = useQuery({
    queryKey: ['espn-squad', match?.awayTeamId],
    queryFn: async () => (await apiService.get(`/teams/${match!.awayTeamId}/espn-squad`)).data.data,
    enabled: !!match?.awayTeamId,
    staleTime: 30 * 60_000,
  });

  // Generic players for when ESPN squad is unavailable
  const GENERIC_PLAYERS = Array.from({ length: 11 }, (_, i) => ({ number: i + 1, name: '' }));

  const homePlayers = useMemo(() => {
    if (!homeSquad?.squad?.length) return GENERIC_PLAYERS;
    return [...homeSquad.squad]
      .sort((a: any, b: any) => (POS_ORDER[a.positionAbbr] ?? 4) - (POS_ORDER[b.positionAbbr] ?? 4))
      .slice(0, 11);
  }, [homeSquad]);

  const awayPlayers = useMemo(() => {
    if (!awaySquad?.squad?.length) return GENERIC_PLAYERS;
    return [...awaySquad.squad]
      .sort((a: any, b: any) => (POS_ORDER[a.positionAbbr] ?? 4) - (POS_ORDER[b.positionAbbr] ?? 4))
      .slice(0, 11);
  }, [awaySquad]);

  // Merge DB events + live events
  const allEvents = [...(events ?? []), ...liveEvents.filter(le => !(events ?? []).find((e: any) => e.id === le.id))];
  const allStats = liveStats ?? stats;

  // Pulse animation for LIVE indicator
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Socket.IO connection
  useEffect(() => {
    if (!match) return;

    const socket = ioClient(API_URL, {
      transports: ['websocket'],
      auth: token ? { token } : {},
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join-match', matchId);
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('match:current', (data: any) => {
      if (data.events) setLiveEvents(data.events);
      if (data.stats) setLiveStats(data.stats);
      if (data.homeScore !== undefined) {
        setLiveScore({ home: data.homeScore ?? 0, away: data.awayScore ?? 0, minute: data.minute ?? 0 });
      }
    });

    socket.on('match:event', (ev: any) => {
      setLiveEvents(prev => [...prev.filter(e => e.id !== ev.id), ev]);
    });

    socket.on('match:score', (data: any) => {
      setLiveScore({ home: data.homeScore, away: data.awayScore, minute: data.minute ?? 0 });
    });

    socket.on('match:stats', (data: any) => {
      setLiveStats(data);
    });

    return () => {
      socket.emit('leave-match', matchId);
      socket.disconnect();
    };
  }, [matchId, match, token]);

  // Sync ESPN on mount + every 30s while live to get latest score/events
  useEffect(() => {
    if (!match) return;
    // Sync immediately on enter
    apiService.post('/matches/espn-sync', {})
      .then(() => { refetchEvents(); refetchStats(); })
      .catch(() => {});

    if (match.status !== 'LIVE' && match.status !== 'HALF_TIME') return;
    const interval = setInterval(() => {
      apiService.post('/matches/espn-sync', {})
        .then(() => { refetchEvents(); refetchStats(); })
        .catch(() => {});
    }, 30_000);
    return () => clearInterval(interval);
  }, [match?.id, match?.status]);

  if (isLoading || !match) return (
    <View style={{ flex: 1, backgroundColor: '#0a0a1a', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={colors.accent} size="large" />
    </View>
  );

  const isLive = match.status === 'LIVE';
  const homeScore = liveScore?.home ?? match.homeScore ?? 0;
  const awayScore = liveScore?.away ?? match.awayScore ?? 0;
  const minute = liveScore?.minute ?? match.minute ?? 0;

  const sortedEvents = [...allEvents].sort((a, b) => b.minute - a.minute);
  const home = match.homeTeam;
  const away = match.awayTeam;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0a0a1a', '#0d1b2a', '#0a1628']} style={StyleSheet.absoluteFill} />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Radar en Vivo</Text>
            {isLive ? (
              <View style={styles.liveRow}>
                <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
                <Text style={styles.liveText}>EN VIVO {minute > 0 ? `• ${minute}'` : ''}</Text>
              </View>
            ) : (
              <Text style={styles.notLiveText}>
                {match.status === 'FINISHED' ? 'FINALIZADO' : 'POR JUGAR'}
              </Text>
            )}
          </View>
          {connected ? (
            <MaterialCommunityIcons name="wifi" size={18} color="#10B981" />
          ) : (
            <MaterialCommunityIcons name="wifi-off" size={18} color="#6B7280" />
          )}
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Scoreboard */}
          <View style={styles.scoreboard}>
            <View style={styles.teamSide}>
              {home?.flagUrl
                ? <Image source={{ uri: home.flagUrl }} style={styles.flagImg} />
                : <MaterialCommunityIcons name="flag" size={28} color="rgba(255,255,255,0.5)" />}
              <Text style={styles.teamCode}>{home?.shortName ?? home?.code ?? '?'}</Text>
            </View>
            <View style={styles.scoreCenter}>
              <Text style={styles.score}>{homeScore} — {awayScore}</Text>
              {isLive && minute > 0 && (
                <View style={styles.minuteTag}>
                  <Text style={styles.minuteText}>{minute}'</Text>
                </View>
              )}
            </View>
            <View style={[styles.teamSide, styles.teamRight]}>
              {away?.flagUrl
                ? <Image source={{ uri: away.flagUrl }} style={styles.flagImg} />
                : <MaterialCommunityIcons name="flag" size={28} color="rgba(255,255,255,0.5)" />}
              <Text style={styles.teamCode}>{away?.shortName ?? away?.code ?? '?'}</Text>
            </View>
          </View>

          {/* Goal counts visual */}
          <View style={styles.goalRow}>
            {sortedEvents.filter(e => e.type === 'GOAL' || e.type === 'OWN_GOAL' || e.type === 'PENALTY_SCORED').map((e, i) => (
              <View key={i} style={[styles.goalBadge, { backgroundColor: e.teamId === home?.id ? '#1D4ED8' : '#7F1D1D' }]}>
                <Text style={styles.goalBadgeText}>⚽ {e.minute}'</Text>
                {e.description ? <Text style={styles.goalBadgePlayer} numberOfLines={1}>{e.description}</Text> : null}
              </View>
            ))}
          </View>

          {/* Pitch */}
          <View style={styles.pitchContainer}>
            <Text style={styles.pitchTeamLabel}>{home?.shortName ?? home?.code}</Text>
            <FootballPitch
              events={allEvents}
              homeTeamId={home?.id}
              homePlayers={homePlayers}
              awayPlayers={awayPlayers}
            />
            <Text style={[styles.pitchTeamLabel, styles.pitchTeamLabelRight]}>{away?.shortName ?? away?.code}</Text>
          </View>

          {/* Stats */}
          {allStats && (
            <View style={styles.statsCard}>
              <Text style={styles.sectionTitle}>Estadísticas del partido</Text>
              {allStats.homePossession != null && (
                <StatBar label="Posesión %" home={allStats.homePossession} away={allStats.awayPossession ?? 0} />
              )}
              {allStats.homeShots != null && (
                <StatBar label="Tiros" home={allStats.homeShots} away={allStats.awayShots ?? 0} />
              )}
              {allStats.homeShotsOnTarget != null && (
                <StatBar label="Al arco" home={allStats.homeShotsOnTarget} away={allStats.awayShotsOnTarget ?? 0} />
              )}
              {allStats.homeCorners != null && (
                <StatBar label="Córners" home={allStats.homeCorners} away={allStats.awayCorners ?? 0} />
              )}
              {allStats.homeFouls != null && (
                <StatBar label="Faltas" home={allStats.homeFouls} away={allStats.awayFouls ?? 0} />
              )}
              {allStats.homeYellowCards != null && (
                <StatBar label="Amarillas" home={allStats.homeYellowCards} away={allStats.awayYellowCards ?? 0} />
              )}
              {allStats.homeXG != null && (
                <StatBar label="xG" home={allStats.homeXG} away={allStats.awayXG ?? 0} />
              )}
            </View>
          )}

          {/* Timeline */}
          {sortedEvents.length > 0 && (
            <View style={styles.timelineCard}>
              <Text style={styles.sectionTitle}>Línea de tiempo</Text>
              {sortedEvents.map((ev, i) => {
                const meta = EVENT_ICONS[ev.type] ?? { icon: 'circle', color: '#6B7280', label: ev.type };
                const isHomeEv = ev.teamId === home?.id;
                return (
                  <View key={ev.id ?? i} style={[styles.timelineItem, isHomeEv ? styles.timelineHome : styles.timelineAway]}>
                    {isHomeEv && <View style={styles.timelineMinuteWrap}><Text style={styles.timelineMinute}>{ev.minute}'</Text></View>}
                    <View style={[styles.timelineDot, { backgroundColor: meta.color }]}>
                      <MaterialCommunityIcons name={meta.icon as any} size={12} color="white" />
                    </View>
                    <View style={[styles.timelineContent, !isHomeEv && styles.timelineContentRight]}>
                      <Text style={[styles.timelineType, { color: meta.color }]}>{meta.label}</Text>
                      {ev.description ? <Text style={styles.timelineDesc} numberOfLines={1}>{ev.description}</Text> : null}
                    </View>
                    {!isHomeEv && <View style={styles.timelineMinuteWrap}><Text style={styles.timelineMinute}>{ev.minute}'</Text></View>}
                  </View>
                );
              })}
            </View>
          )}

          {sortedEvents.length === 0 && !isLive && (
            <View style={styles.noEvents}>
              <MaterialCommunityIcons name="radar" size={48} color="rgba(255,255,255,0.2)" />
              <Text style={styles.noEventsText}>El radar se activará cuando el partido comience</Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.base, paddingVertical: spacing.sm, gap: spacing.sm },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.bold },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  liveDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#EF4444' },
  liveText: { color: '#EF4444', fontSize: 10, fontFamily: typography.fontFamily.bold, letterSpacing: 0.5 },
  notLiveText: { color: '#6B7280', fontSize: 10, fontFamily: typography.fontFamily.semiBold },

  scoreboard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: spacing.base, marginTop: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: borderRadius.xl, padding: spacing.base,
  },
  teamSide: { flex: 1, alignItems: 'flex-start', gap: 4 },
  teamRight: { alignItems: 'flex-end' },
  flagImg: { width: 36, height: 24, borderRadius: 2 },
  teamCode: { color: 'white', fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.bold },
  scoreCenter: { flex: 1, alignItems: 'center' },
  score: { color: 'white', fontSize: 32, fontFamily: typography.fontFamily.bold, letterSpacing: 2 },
  minuteTag: { backgroundColor: '#EF4444', borderRadius: borderRadius.full, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4 },
  minuteText: { color: 'white', fontSize: 11, fontFamily: typography.fontFamily.bold },

  goalRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: spacing.base, marginTop: spacing.sm },
  goalBadge: { borderRadius: borderRadius.sm, paddingHorizontal: 8, paddingVertical: 4 },
  goalBadgeText: { color: 'white', fontSize: 11, fontFamily: typography.fontFamily.bold },
  goalBadgePlayer: { color: 'rgba(255,255,255,0.7)', fontSize: 9 },

  pitchContainer: { marginHorizontal: spacing.base, marginTop: spacing.base },
  pitchTeamLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontFamily: typography.fontFamily.bold, textAlign: 'left', marginBottom: 4 },
  pitchTeamLabelRight: { textAlign: 'right', marginTop: 4, marginBottom: 0 },
  pitch: { borderRadius: 8 },

  statsCard: {
    marginHorizontal: spacing.base, marginTop: spacing.base,
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: borderRadius.xl, padding: spacing.base,
  },
  sectionTitle: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontFamily: typography.fontFamily.bold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm },

  timelineCard: {
    marginHorizontal: spacing.base, marginTop: spacing.base,
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: borderRadius.xl, padding: spacing.base,
  },
  timelineItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 4 },
  timelineHome: { justifyContent: 'flex-start' },
  timelineAway: { justifyContent: 'flex-end' },
  timelineMinuteWrap: { width: 32 },
  timelineMinute: { color: 'rgba(255,255,255,0.4)', fontSize: 11, textAlign: 'center' },
  timelineDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  timelineContent: { flex: 1 },
  timelineContentRight: { alignItems: 'flex-end' },
  timelineType: { fontSize: 11, fontFamily: typography.fontFamily.bold },
  timelineDesc: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },

  noEvents: { alignItems: 'center', paddingVertical: 40, gap: spacing.sm, marginHorizontal: spacing.base },
  noEventsText: { color: 'rgba(255,255,255,0.3)', fontSize: typography.fontSize.sm, textAlign: 'center' },
});
