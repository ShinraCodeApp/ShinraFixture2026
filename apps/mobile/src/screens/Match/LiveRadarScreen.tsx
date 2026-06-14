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
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { apiService } from '../../services/api';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { colors, spacing, typography, borderRadius } from '../../theme';

dayjs.locale('es');

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

const TEAM_COLORS: Record<string, string> = {
  ARG:'#75AADB', BRA:'#FCD116', GER:'#333333', FRA:'#002395', ESP:'#AA151B',
  ENG:'#003090', MEX:'#006847', USA:'#BF0A30', CAN:'#FF0000', POR:'#006600',
  NED:'#FF6600', BEL:'#EF2B2D', CRO:'#CC0000', SUI:'#FF0000', JPN:'#BC002D',
  KOR:'#003478', AUS:'#00843D', MAR:'#C1272D', SEN:'#00853F', URU:'#5EB6E4',
  ECU:'#FFD100', TUN:'#E70013', NZL:'#2B2B2B', KSA:'#006C35', IRN:'#239F40',
  QAT:'#8D1B3D', RSA:'#007A4D', GHA:'#FCD116', TUR:'#E30A17', AUT:'#ED2939',
  SWE:'#006AA7', ALG:'#006233', HTI:'#00209F', CPV:'#003893', EGY:'#CE1126',
  COD:'#007FFF', CUW:'#4B9CD3', UZB:'#1EB53A', COL:'#FCD116', IRQ:'#CE1126',
  NOR:'#EF2B2D', PAN:'#DA121A', BIH:'#002395', JOR:'#007A3D', PAR:'#D52B1E',
  CZE:'#D7141A', ZAF:'#007A4D', BOL:'#009A44', PER:'#D91023',
};

function teamColor(code?: string, fallback = '#3B82F6') {
  return code ? (TEAM_COLORS[code] ?? fallback) : fallback;
}

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
  events, homeTeamId, homePlayers, awayPlayers, homeCode, awayCode, allStats,
}: {
  events: any[];
  homeTeamId?: string;
  homePlayers: any[];
  awayPlayers: any[];
  homeCode?: string;
  awayCode?: string;
  allStats?: any;
}) {
  const homeCol = teamColor(homeCode, '#1D4ED8');
  const awayCol = teamColor(awayCode, '#DC2626');

  // Possession zones — how much of the pitch each team "owns"
  const homePoss = allStats?.homePossession ?? 50;
  const homeZoneW = (homePoss / 100) * 0.7; // max 70% of pitch width
  const awayZoneW = ((100 - homePoss) / 100) * 0.7;
  const pw = PITCH_W;
  const ph = PITCH_H;
  const goalH = ph * 0.22;
  const penW = pw * 0.22;
  const penH = ph * 0.54;
  const circleR = ph * 0.16;

  const getEventPos = (ev: any, idx: number): { x: number; y: number } => {
    const isHome = ev.teamId === homeTeamId;
    // Home attacks RIGHT → goals shown at right side (opponent's goal); away goals at left
    const baseX = isHome ? pw * 0.86 : pw * 0.14;
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
      {/* Pressure zones — home (left→right) and away (right→left) */}
      <Rect x={pw*0.03} y={ph*0.04} width={pw * homeZoneW * 0.94} height={ph*0.92}
        fill={homeCol} opacity={0.08} rx={4} />
      <Rect x={pw*0.97 - pw * awayZoneW * 0.94} y={ph*0.04} width={pw * awayZoneW * 0.94} height={ph*0.92}
        fill={awayCol} opacity={0.08} rx={4} />

      {/* Shot on target markers near goals */}
      {Array.from({ length: Math.min(allStats?.homeShotsOnTarget ?? 0, 8) }).map((_, i) => (
        <Circle key={`hs${i}`}
          cx={pw * 0.93 + (i % 2) * 6}
          cy={ph * 0.3 + i * (ph * 0.055)}
          r={4} fill={homeCol} opacity={0.75} stroke="white" strokeWidth={1} />
      ))}
      {Array.from({ length: Math.min(allStats?.awayShotsOnTarget ?? 0, 8) }).map((_, i) => (
        <Circle key={`as${i}`}
          cx={pw * 0.07 - (i % 2) * 6}
          cy={ph * 0.3 + i * (ph * 0.055)}
          r={4} fill={awayCol} opacity={0.75} stroke="white" strokeWidth={1} />
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

      {/* HOME players — team color dots */}
      {homePlayers.map((p: any, i: number) => {
        if (i >= HOME_FORMATION_433.length) return null;
        const [fx, fy] = HOME_FORMATION_433[i];
        const cx = fx * pw;
        const cy = fy * ph;
        const lastName = (p.name ?? '').split(' ').pop()?.substring(0, 7) ?? '';
        return (
          <G key={`h${i}`}>
            <Circle cx={cx} cy={cy} r={9} fill={homeCol} stroke="white" strokeWidth={1.5} opacity={0.95} />
            <SvgText x={cx} y={cy + 4} textAnchor="middle" fontSize={8} fill="white" fontWeight="bold">
              {p.number ?? i + 1}
            </SvgText>
            <SvgText x={cx} y={cy + 17} textAnchor="middle" fontSize={6.5} fill="rgba(255,255,255,0.9)">
              {lastName}
            </SvgText>
          </G>
        );
      })}

      {/* AWAY players — team color dots */}
      {awayPlayers.map((p: any, i: number) => {
        if (i >= AWAY_FORMATION_442.length) return null;
        const [fx, fy] = AWAY_FORMATION_442[i];
        const cx = fx * pw;
        const cy = fy * ph;
        const lastName = (p.name ?? '').split(' ').pop()?.substring(0, 7) ?? '';
        return (
          <G key={`a${i}`}>
            <Circle cx={cx} cy={cy} r={9} fill={awayCol} stroke="white" strokeWidth={1.5} opacity={0.95} />
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

function StatBar({ label, home, away, homeColor = '#3B82F6', awayColor = '#EF4444' }: {
  label: string; home: number; away: number; homeColor?: string; awayColor?: string;
}) {
  const total = (home + away) || 1;
  const homeP = Math.round((home / total) * 100);
  return (
    <View style={radarStyles.statRow}>
      <Text style={radarStyles.statVal}>{home}</Text>
      <View style={radarStyles.middle}>
        <Text style={radarStyles.barLabelText}>{label}</Text>
        <View style={radarStyles.track}>
          <View style={[radarStyles.barFill, { width: `${homeP}%` as any, backgroundColor: homeColor }]} />
          <View style={[radarStyles.barFillRight, { width: `${100-homeP}%` as any, backgroundColor: awayColor }]} />
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
  const [clockSec, setClockSec] = useState(0);
  const [liveStats, setLiveStats] = useState<any>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<any>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ballX = useRef(new Animated.Value(PITCH_W / 2 - 8)).current;
  const ballY = useRef(new Animated.Value(PITCH_H / 2 - 8)).current;
  const ballMoveRef = useRef<any>(null);

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

  const { data: espnStats, refetch: refetchEspn } = useQuery({
    queryKey: ['espn-stats', matchId],
    queryFn: async () => {
      const res = await apiService.get(`/matches/${matchId}/espn-stats`);
      const teams: any[] = res.data.data?.teamStats ?? [];
      const home = teams.find((t: any) => t.isHome);
      const away = teams.find((t: any) => !t.isHome);
      const pick = (t: any, name: string) => {
        const s = t?.stats?.find((x: any) => x.name === name);
        return s ? parseFloat(s.value) || 0 : null;
      };
      return home && away ? {
        homePossession: pick(home, 'possessionPct'),
        awayPossession: pick(away, 'possessionPct'),
        homeShots: pick(home, 'totalShots'),
        awayShots: pick(away, 'totalShots'),
        homeShotsOnTarget: pick(home, 'shotsOnTarget'),
        awayShotsOnTarget: pick(away, 'shotsOnTarget'),
        homeCorners: pick(home, 'wonCorners'),
        awayCorners: pick(away, 'wonCorners'),
        homeFouls: pick(home, 'foulsCommitted'),
        awayFouls: pick(away, 'foulsCommitted'),
        homeYellowCards: pick(home, 'yellowCards'),
        awayYellowCards: pick(away, 'yellowCards'),
        homePasses: pick(home, 'totalPasses'),
        awayPasses: pick(away, 'totalPasses'),
        homePassPct: pick(home, 'passPct'),
        awayPassPct: pick(away, 'passPct'),
        homeTackles: pick(home, 'effectiveTackles'),
        awayTackles: pick(away, 'effectiveTackles'),
        homeSaves: pick(home, 'saves'),
        awaySaves: pick(away, 'saves'),
        homeOffsides: pick(home, 'offsides'),
        awayOffsides: pick(away, 'offsides'),
      } : null;
    },
    staleTime: 0,
    refetchInterval: 30_000,
    retry: false,
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
  // ESPN stats take priority over DB stats
  const allStats = liveStats ?? espnStats ?? stats;

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
      transports: ['websocket', 'polling'],
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

  // Ball animation — moves when live, jumps to goal when scored
  useEffect(() => {
    if (!match) return;
    const isMatchLive = match.status === 'LIVE' || match.status === 'HALF_TIME';
    if (!isMatchLive) {
      ballX.setValue(PITCH_W / 2 - 8);
      ballY.setValue(PITCH_H / 2 - 8);
      return;
    }
    const moveBall = () => {
      const homePoss = (liveStats ?? stats)?.homePossession ?? 50;
      const biasX = homePoss > 52
        ? PITCH_W * 0.45 + Math.random() * PITCH_W * 0.45
        : PITCH_W * 0.1 + Math.random() * PITCH_W * 0.45;
      const targetX = Math.max(12, Math.min(PITCH_W - 12, biasX));
      const targetY = Math.max(12, Math.min(PITCH_H - 12, PITCH_H * 0.08 + Math.random() * PITCH_H * 0.84));
      ballMoveRef.current = Animated.parallel([
        Animated.timing(ballX, { toValue: targetX - 8, duration: 2000 + Math.random() * 3000, useNativeDriver: false }),
        Animated.timing(ballY, { toValue: targetY - 8, duration: 2000 + Math.random() * 3000, useNativeDriver: false }),
      ]);
      ballMoveRef.current.start(({ finished }: any) => { if (finished) moveBall(); });
    };
    moveBall();
    return () => { ballMoveRef.current?.stop(); };
  }, [match?.status, (liveStats ?? stats)?.homePossession]);

  // Jump ball to goal when a goal is scored
  const goalCount = allEvents?.filter((e: any) => ['GOAL','PENALTY_SCORED','OWN_GOAL'].includes(e.type)).length ?? 0;
  useEffect(() => {
    if (goalCount === 0) return;
    const goals = (allEvents ?? []).filter((e: any) => ['GOAL','PENALTY_SCORED','OWN_GOAL'].includes(e.type));
    const lastGoal = goals[goals.length - 1];
    if (!lastGoal || !match) return;
    const isHome = lastGoal.teamId === match.homeTeamId;
    ballMoveRef.current?.stop();
    Animated.sequence([
      Animated.parallel([
        Animated.timing(ballX, { toValue: isHome ? PITCH_W * 0.92 - 8 : PITCH_W * 0.03, duration: 500, useNativeDriver: false }),
        Animated.timing(ballY, { toValue: PITCH_H / 2 - 8, duration: 500, useNativeDriver: false }),
      ]),
    ]).start();
  }, [goalCount]);

  // Refetch events/stats from DB + ESPN every 30s
  useEffect(() => {
    if (!match) return;
    const interval = setInterval(() => {
      refetchEvents();
      refetchStats();
      refetchEspn();
    }, 30_000);
    return () => clearInterval(interval);
  }, [match?.id]);

  if (isLoading || !match) return (
    <View style={{ flex: 1, backgroundColor: '#0a0a1a', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={colors.accent} size="large" />
    </View>
  );

  const isLive = match.status === 'LIVE';
  const homeScore = liveScore?.home ?? match.homeScore ?? 0;
  const awayScore = liveScore?.away ?? match.awayScore ?? 0;
  const minute = liveScore?.minute ?? match.minute ?? 0;

  // Live seconds counter — resets each time the server pushes a new minute
  useEffect(() => {
    if (!isLive) { setClockSec(0); return; }
    setClockSec(0);
    const id = setInterval(() => setClockSec(s => (s >= 59 ? 59 : s + 1)), 1000);
    return () => clearInterval(id);
  }, [minute, isLive]);

  const clockLabel = minute > 0 ? `${minute}:${String(clockSec).padStart(2, '0')}` : '';

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
                <Text style={styles.liveText}>EN VIVO {clockLabel ? `• ${clockLabel}'` : ''}</Text>
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
              {isLive && clockLabel && (
                <View style={styles.minuteTag}>
                  <Text style={styles.minuteText}>{clockLabel}'</Text>
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
              <View key={i} style={[styles.goalBadge, { backgroundColor: e.teamId === home?.id ? teamColor(home?.code) : teamColor(away?.code, '#7F1D1D') }]}>
                <Text style={styles.goalBadgeText}>⚽ {e.minute}'</Text>
                {e.description ? <Text style={styles.goalBadgePlayer} numberOfLines={1}>{e.description}</Text> : null}
              </View>
            ))}
          </View>

          {/* Pitch */}
          <View style={styles.pitchContainer}>
            <Text style={styles.pitchTeamLabel}>{home?.shortName ?? home?.code}</Text>
            <View style={{ position: 'relative' }}>
              <FootballPitch
                events={allEvents}
                homeTeamId={home?.id}
                homePlayers={homePlayers}
                awayPlayers={awayPlayers}
                homeCode={home?.code}
                awayCode={away?.code}
                allStats={allStats}
              />
              <Animated.View
                style={[styles.ball, { left: ballX, top: ballY }]}
                pointerEvents="none"
              />
            </View>
            <Text style={[styles.pitchTeamLabel, styles.pitchTeamLabelRight]}>{away?.shortName ?? away?.code}</Text>
          </View>

          {/* Stats */}
          {allStats && (
            <View style={styles.statsCard}>
              <Text style={styles.sectionTitle}>Estadísticas del partido</Text>
              {allStats.homePossession != null && (
                <StatBar label="Posesión %" home={allStats.homePossession} away={allStats.awayPossession ?? 0} homeColor={teamColor(home?.code)} awayColor={teamColor(away?.code, '#EF4444')} />
              )}
              {allStats.homeShots != null && (
                <StatBar label="Tiros" home={allStats.homeShots} away={allStats.awayShots ?? 0} homeColor={teamColor(home?.code)} awayColor={teamColor(away?.code, '#EF4444')} />
              )}
              {allStats.homeShotsOnTarget != null && (
                <StatBar label="Al arco" home={allStats.homeShotsOnTarget} away={allStats.awayShotsOnTarget ?? 0} homeColor={teamColor(home?.code)} awayColor={teamColor(away?.code, '#EF4444')} />
              )}
              {allStats.homeCorners != null && (
                <StatBar label="Córners" home={allStats.homeCorners} away={allStats.awayCorners ?? 0} homeColor={teamColor(home?.code)} awayColor={teamColor(away?.code, '#EF4444')} />
              )}
              {allStats.homeFouls != null && (
                <StatBar label="Faltas" home={allStats.homeFouls} away={allStats.awayFouls ?? 0} homeColor={teamColor(home?.code)} awayColor={teamColor(away?.code, '#EF4444')} />
              )}
              {allStats.homeYellowCards != null && (
                <StatBar label="Amarillas" home={allStats.homeYellowCards} away={allStats.awayYellowCards ?? 0} homeColor={teamColor(home?.code)} awayColor={teamColor(away?.code, '#EF4444')} />
              )}
              {allStats.homeXG != null && (
                <StatBar label="xG" home={allStats.homeXG} away={allStats.awayXG ?? 0} homeColor={teamColor(home?.code)} awayColor={teamColor(away?.code, '#EF4444')} />
              )}
              {allStats.homePasses != null && (
                <StatBar label="Pases" home={allStats.homePasses} away={allStats.awayPasses ?? 0} homeColor={teamColor(home?.code)} awayColor={teamColor(away?.code, '#EF4444')} />
              )}
              {allStats.homePassPct != null && (
                <StatBar label="Precisión pases %" home={allStats.homePassPct} away={allStats.awayPassPct ?? 0} homeColor={teamColor(home?.code)} awayColor={teamColor(away?.code, '#EF4444')} />
              )}
              {allStats.homeTackles != null && (
                <StatBar label="Tackles" home={allStats.homeTackles} away={allStats.awayTackles ?? 0} homeColor={teamColor(home?.code)} awayColor={teamColor(away?.code, '#EF4444')} />
              )}
              {allStats.homeSaves != null && (
                <StatBar label="Atajadas" home={allStats.homeSaves} away={allStats.awaySaves ?? 0} homeColor={teamColor(home?.code)} awayColor={teamColor(away?.code, '#EF4444')} />
              )}
              {allStats.homeOffsides != null && (
                <StatBar label="Fueras de juego" home={allStats.homeOffsides} away={allStats.awayOffsides ?? 0} homeColor={teamColor(home?.code)} awayColor={teamColor(away?.code, '#EF4444')} />
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
            <View style={styles.preMatchCard}>
              <Text style={styles.preMatchTitle}>
                {match.status === 'FINISHED' ? 'Sin eventos registrados' : 'Información del partido'}
              </Text>
              <View style={styles.preMatchRow}>
                <MaterialCommunityIcons name="calendar-clock" size={16} color="rgba(255,255,255,0.5)" />
                <Text style={styles.preMatchText}>
                  {dayjs(match.matchDate).format('dddd D [de] MMMM • HH:mm')}
                </Text>
              </View>
              {match.venue ? (
                <View style={styles.preMatchRow}>
                  <MaterialCommunityIcons name="stadium-outline" size={16} color="rgba(255,255,255,0.5)" />
                  <Text style={styles.preMatchText}>
                    {match.venue}{match.city ? ` · ${match.city}` : ''}
                  </Text>
                </View>
              ) : null}
              {match.status !== 'FINISHED' && (
                <View style={[styles.preMatchRow, { marginTop: 10, opacity: 0.4 }]}>
                  <MaterialCommunityIcons name="radar" size={14} color="white" />
                  <Text style={[styles.preMatchText, { fontSize: 11 }]}>
                    Los eventos aparecerán cuando empiece el partido
                  </Text>
                </View>
              )}
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

  preMatchCard: {
    marginHorizontal: spacing.base, marginTop: spacing.base,
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: borderRadius.xl,
    padding: spacing.base, gap: 10,
  },
  preMatchTitle: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontFamily: typography.fontFamily.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  preMatchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  preMatchText: { color: 'rgba(255,255,255,0.75)', fontSize: typography.fontSize.sm, flex: 1 },
  ball: {
    position: 'absolute', width: 14, height: 14, borderRadius: 7,
    backgroundColor: 'white', borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.25)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6, shadowRadius: 3, elevation: 8, zIndex: 20,
  },
});
