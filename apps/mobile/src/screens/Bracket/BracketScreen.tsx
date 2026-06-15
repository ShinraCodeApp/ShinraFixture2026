import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Image, StyleSheet,
  ActivityIndicator, TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../hooks/useAppTheme';
import { colors, spacing, typography } from '../../theme';
import { apiService } from '../../services/api';

// ── Layout ─────────────────────────────────────────────────────────────
const SH = 82;
const CW = 98;
const CH = 60;
const GW = 20;
const CS = CW + GW;
const BH = 8 * SH;

const LR32 = 0;
const LR16 = CS;
const LQF  = CS * 2;
const LSF  = CS * 3;

const FX = LSF + CW + GW;

const RSF  = FX + CW + GW;
const RQF  = RSF + CS;
const RR16 = RSF + CS * 2;
const RR32 = RSF + CS * 3;

const TW = RR32 + CW + 16;

function yC(round: number, idx: number): number {
  const k = 1 << round;
  return k * SH * idx + (k * SH) / 2;
}

// ── Data types ─────────────────────────────────────────────────────────
interface TeamInfo { name: string; code: string; logo: string }
interface Slot { type: 'g1' | 'g2' | 'g3'; group?: string; pools?: string[] }
interface BMatch { id: string; home: Slot; away: Slot }
type GroupMap = Record<string, { team: TeamInfo }[]>;

// DB match from API
interface DbMatch {
  id: string;
  homeTeam?: { name: string; code: string; flagUrl?: string } | null;
  awayTeam?: { name: string; code: string; flagUrl?: string } | null;
  homeScore?: number | null;
  awayScore?: number | null;
  status?: string;
}

interface KnockoutMap {
  r32: DbMatch[];
  r16: DbMatch[];
  qf:  DbMatch[];
  sf:  DbMatch[];
  fin: DbMatch[];
}

// ── WC 2026 bracket definition ─────────────────────────────────────────
const L_R32: BMatch[] = [
  { id:'M49', home:{type:'g1',group:'E'}, away:{type:'g3',pools:['A','B','C','D','F']} },
  { id:'M50', home:{type:'g1',group:'I'}, away:{type:'g3',pools:['C','D','F','G','H']} },
  { id:'M51', home:{type:'g2',group:'A'}, away:{type:'g2',group:'B'} },
  { id:'M52', home:{type:'g1',group:'F'}, away:{type:'g2',group:'C'} },
  { id:'M53', home:{type:'g2',group:'K'}, away:{type:'g2',group:'L'} },
  { id:'M54', home:{type:'g1',group:'H'}, away:{type:'g2',group:'J'} },
  { id:'M55', home:{type:'g1',group:'D'}, away:{type:'g3',pools:['B','E','F','L','J']} },
  { id:'M56', home:{type:'g1',group:'G'}, away:{type:'g3',pools:['A','E','H','L','J']} },
];
const R_R32: BMatch[] = [
  { id:'M57', home:{type:'g1',group:'C'}, away:{type:'g2',group:'F'} },
  { id:'M58', home:{type:'g1',group:'A'}, away:{type:'g3',pools:['C','E','F','H','I']} },
  { id:'M59', home:{type:'g2',group:'E'}, away:{type:'g2',group:'I'} },
  { id:'M60', home:{type:'g1',group:'L'}, away:{type:'g3',pools:['E','H','I','J','K']} },
  { id:'M61', home:{type:'g2',group:'D'}, away:{type:'g2',group:'G'} },
  { id:'M62', home:{type:'g1',group:'J'}, away:{type:'g2',group:'H'} },
  { id:'M63', home:{type:'g1',group:'B'}, away:{type:'g3',pools:['E','F','G','L','J']} },
  { id:'M64', home:{type:'g1',group:'K'}, away:{type:'g3',pools:['A','B','D','I','J']} },
];

// ── Helpers ────────────────────────────────────────────────────────────
function resolveTeam(slot: Slot, gmap: GroupMap): TeamInfo | null {
  if (slot.type === 'g3' || !slot.group) return null;
  const g = gmap[slot.group];
  if (!g) return null;
  return g[slot.type === 'g1' ? 0 : 1]?.team ?? null;
}
function slotLabel(slot: Slot): string {
  if (slot.type === 'g3') return '3°*';
  return `${slot.type === 'g1' ? '1' : '2'}° ${slot.group}`;
}

// ── Sub-components ─────────────────────────────────────────────────────
function TeamRow({ slot, gmap, appColors }: { slot: Slot; gmap: GroupMap; appColors: any }) {
  const team = resolveTeam(slot, gmap);
  if (!team) {
    return (
      <View style={s.teamRow}>
        <View style={[s.logoBox, { backgroundColor: appColors.surfaceSecondary }]} />
        <Text style={[s.placeholderTxt, { color: appColors.textSecondary }]}>{slotLabel(slot)}</Text>
      </View>
    );
  }
  return (
    <View style={s.teamRow}>
      <Image source={{ uri: team.logo }} style={s.logo} resizeMode="contain" />
      <Text style={[s.codeTxt, { color: appColors.text }]} numberOfLines={1}>{team.code}</Text>
    </View>
  );
}

// R32 card — tappable when we have a DB match ID
function MatchCard({
  match, gmap, x, slotIdx, appColors, lineColor, dbMatch, nav,
}: {
  match: BMatch; gmap: GroupMap; x: number; slotIdx: number;
  appColors: any; lineColor: string; dbMatch?: DbMatch; nav: any;
}) {
  const cy = yC(0, slotIdx);
  const cardY = cy - CH / 2;
  const finished = dbMatch?.status === 'FINISHED';

  return (
    <TouchableOpacity
      disabled={!dbMatch?.id}
      onPress={() => dbMatch?.id && nav.navigate('MatchDetail', { matchId: dbMatch.id })}
      activeOpacity={0.75}
      style={[s.card, {
        position: 'absolute',
        left: x, top: cardY, width: CW, height: CH,
        backgroundColor: appColors.surface,
        borderColor: finished ? colors.success + '60' : appColors.border,
      }]}
    >
      {finished && (
        <Text style={[s.matchId, { color: colors.success }]}>
          {dbMatch!.homeScore}-{dbMatch!.awayScore} ✓
        </Text>
      )}
      {!finished && (
        <Text style={[s.matchId, { color: appColors.textSecondary }]}>{match.id}</Text>
      )}
      <TeamRow slot={match.home} gmap={gmap} appColors={appColors} />
      <View style={[s.divider, { backgroundColor: appColors.border }]} />
      <TeamRow slot={match.away} gmap={gmap} appColors={appColors} />
    </TouchableOpacity>
  );
}

// Knockout card for R16+ — shows real teams when available
function KnockoutCard({
  round, idx, x, dbMatch, label, appColors, nav,
}: {
  round: number; idx: number; x: number;
  dbMatch?: DbMatch; label: string; appColors: any; nav: any;
}) {
  const cy = yC(round, idx);
  const cardY = cy - CH / 2;
  const home = dbMatch?.homeTeam;
  const away = dbMatch?.awayTeam;
  const hasTeams = !!(home && away);
  const hasScore = dbMatch?.homeScore != null;
  const finished = dbMatch?.status === 'FINISHED';

  return (
    <TouchableOpacity
      disabled={!dbMatch?.id}
      onPress={() => dbMatch?.id && nav.navigate('MatchDetail', { matchId: dbMatch.id })}
      activeOpacity={0.75}
      style={[s.card, !hasTeams && s.advCard, {
        position: 'absolute',
        left: x, top: cardY, width: CW, height: CH,
        backgroundColor: hasTeams ? appColors.surface : appColors.surfaceSecondary,
        borderColor: finished ? colors.success + '60' : appColors.border,
      }]}
    >
      {hasTeams ? (
        <>
          {hasScore && (
            <Text style={[s.matchId, { color: finished ? colors.success : colors.primary }]}>
              {dbMatch!.homeScore}-{dbMatch!.awayScore}{finished ? ' ✓' : ''}
            </Text>
          )}
          <View style={s.teamRow}>
            {home!.flagUrl
              ? <Image source={{ uri: home!.flagUrl }} style={s.logo} resizeMode="contain" />
              : <View style={[s.logoBox, { backgroundColor: appColors.surfaceSecondary }]} />}
            <Text style={[s.codeTxt, { color: appColors.text }]} numberOfLines={1}>{home!.code}</Text>
          </View>
          <View style={[s.divider, { backgroundColor: appColors.border }]} />
          <View style={s.teamRow}>
            {away!.flagUrl
              ? <Image source={{ uri: away!.flagUrl }} style={s.logo} resizeMode="contain" />
              : <View style={[s.logoBox, { backgroundColor: appColors.surfaceSecondary }]} />}
            <Text style={[s.codeTxt, { color: appColors.text }]} numberOfLines={1}>{away!.code}</Text>
          </View>
        </>
      ) : (
        <Text style={[s.advLabel, { color: appColors.textSecondary }]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

// Final card
function FinalCard({ appColors, dbMatch, nav }: { appColors: any; dbMatch?: DbMatch; nav: any }) {
  const cy = yC(3, 0);
  const cardY = cy - CH / 2 - 10;
  const home = dbMatch?.homeTeam;
  const away = dbMatch?.awayTeam;
  const hasTeams = !!(home && away);
  const finished = dbMatch?.status === 'FINISHED';

  return (
    <TouchableOpacity
      disabled={!dbMatch?.id}
      onPress={() => dbMatch?.id && nav.navigate('MatchDetail', { matchId: dbMatch.id })}
      activeOpacity={0.85}
      style={[s.card, s.finalCard, {
        position: 'absolute',
        left: FX, top: cardY, width: CW, height: CH + 20,
        backgroundColor: '#1a1200',
        borderColor: finished ? colors.success : colors.primary,
      }]}
    >
      <Text style={[s.finalLabel, { color: colors.primary }]}>FINAL</Text>
      {hasTeams ? (
        <>
          <Text style={[s.finalSub, { color: 'white' }]}>{home!.code} vs {away!.code}</Text>
          {dbMatch?.homeScore != null && (
            <Text style={[s.finalSub, { color: colors.primary }]}>
              {dbMatch.homeScore}-{dbMatch.awayScore}
            </Text>
          )}
        </>
      ) : (
        <>
          <Text style={[s.finalSub, { color: '#888' }]}>26 Jul</Text>
          <View style={[s.divider, { backgroundColor: '#333' }]} />
          <Text style={[s.finalSub, { color: '#888' }]}>Nueva Jersey</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

// Line helpers
function HL({ x, y, w, c }: { x: number; y: number; w: number; c: string }) {
  return <View style={{ position: 'absolute', left: x, top: y - 0.5, width: w, height: 1, backgroundColor: c }} />;
}
function VL({ x, y, h, c }: { x: number; y: number; h: number; c: string }) {
  return <View style={{ position: 'absolute', left: x - 0.5, top: y, width: 1, height: h, backgroundColor: c }} />;
}

function LeftConns({ fromX, numPairs, fromRound, lc }: { fromX: number; numPairs: number; fromRound: number; lc: string }) {
  const elems: React.ReactElement[] = [];
  for (let i = 0; i < numPairs; i++) {
    const y1 = yC(fromRound, 2 * i);
    const y2 = yC(fromRound, 2 * i + 1);
    const ym = yC(fromRound + 1, i);
    const xR = fromX + CW;
    const xV = xR + GW / 2;
    elems.push(
      <HL key={`lh1-${fromRound}-${i}`} x={xR} y={y1} w={GW / 2} c={lc} />,
      <HL key={`lh2-${fromRound}-${i}`} x={xR} y={y2} w={GW / 2} c={lc} />,
      <VL key={`lv-${fromRound}-${i}`} x={xV} y={y1} h={y2 - y1} c={lc} />,
      <HL key={`lh3-${fromRound}-${i}`} x={xV} y={ym} w={GW / 2} c={lc} />,
    );
  }
  return <>{elems}</>;
}

function RightConns({ fromX, prevX, numPairs, fromRound, lc }: { fromX: number; prevX: number; numPairs: number; fromRound: number; lc: string }) {
  const elems: React.ReactElement[] = [];
  for (let i = 0; i < numPairs; i++) {
    const y1 = yC(fromRound, 2 * i);
    const y2 = yC(fromRound, 2 * i + 1);
    const ym = yC(fromRound + 1, i);
    const xV = fromX - GW / 2;
    const xPR = prevX + CW;
    elems.push(
      <HL key={`rh1-${fromRound}-${i}`} x={xV} y={y1} w={GW / 2} c={lc} />,
      <HL key={`rh2-${fromRound}-${i}`} x={xV} y={y2} w={GW / 2} c={lc} />,
      <VL key={`rv-${fromRound}-${i}`} x={xV} y={y1} h={y2 - y1} c={lc} />,
      <HL key={`rh3-${fromRound}-${i}`} x={xPR} y={ym} w={GW / 2} c={lc} />,
    );
  }
  return <>{elems}</>;
}

const ROUND_COLS = [
  { label: 'R32',   x: LR32 },
  { label: 'R16',   x: LR16 },
  { label: 'QF',    x: LQF  },
  { label: 'SF',    x: LSF  },
  { label: 'FINAL', x: FX   },
  { label: 'SF',    x: RSF  },
  { label: 'QF',    x: RQF  },
  { label: 'R16',   x: RR16 },
  { label: 'R32',   x: RR32 },
];

// ── Main screen ────────────────────────────────────────────────────────
export function BracketScreen() {
  const nav = useNavigation<any>();
  const { appColors } = useAppTheme();
  const [gmap, setGmap] = useState<GroupMap>({});
  const [ko, setKo] = useState<KnockoutMap>({ r32: [], r16: [], qf: [], sf: [], fin: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const WC = '?tournamentType=WORLD_CUP';
      const [standingsRes, r32Res, r16Res, qfRes, sfRes, finRes] = await Promise.all([
        apiService.get('/stats/wc-standings'),
        apiService.get(`/matches/stage/ROUND_OF_32${WC}`).catch(() => ({ data: { data: [] } })),
        apiService.get(`/matches/stage/ROUND_OF_16${WC}`).catch(() => ({ data: { data: [] } })),
        apiService.get(`/matches/stage/QUARTER_FINAL${WC}`).catch(() => ({ data: { data: [] } })),
        apiService.get(`/matches/stage/SEMI_FINAL${WC}`).catch(() => ({ data: { data: [] } })),
        apiService.get(`/matches/stage/FINAL${WC}`).catch(() => ({ data: { data: [] } })),
      ]);

      // Build group map from standings
      const arr: any[] = standingsRes.data.data ?? [];
      const map: GroupMap = {};
      for (const g of arr) {
        map[g.group] = (g.entries ?? []).map((e: any) => ({
          team: {
            name: e.team?.name ?? '',
            code: e.team?.code ?? '???',
            logo: e.team?.logo ?? '',
          },
        }));
      }
      setGmap(map);

      setKo({
        r32: r32Res.data.data ?? [],
        r16: r16Res.data.data ?? [],
        qf:  qfRes.data.data ?? [],
        sf:  sfRes.data.data ?? [],
        fin: finRes.data.data ?? [],
      });
    } catch {
      // placeholders show on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchAll(); };

  const lc = appColors.border;
  const HEADER_H = 36;
  const totalH = BH + HEADER_H + 32;

  // Match knockout matches to bracket positions by array index (ordered by matchDate)
  // Left half: positions 0-7 for R32, Right half: positions 8-15
  const getR32 = (isLeft: boolean, i: number) =>
    isLeft ? ko.r32[i] : ko.r32[8 + i];

  // R16: left 0-3, right 4-7
  const getR16 = (isLeft: boolean, i: number) =>
    isLeft ? ko.r16[i] : ko.r16[4 + i];

  // QF: left 0-1, right 2-3
  const getQF = (isLeft: boolean, i: number) =>
    isLeft ? ko.qf[i] : ko.qf[2 + i];

  // SF: left 0, right 1
  const getSF = (isLeft: boolean) =>
    isLeft ? ko.sf[0] : ko.sf[1];

  return (
    <View style={[s.screen, { backgroundColor: appColors.background }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={[s.header, { backgroundColor: appColors.surface, borderBottomColor: appColors.border }]}>
          <TouchableOpacity onPress={() => nav.goBack()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={appColors.text} />
          </TouchableOpacity>
          <View>
            <Text style={[s.title, { color: appColors.text }]}>Llaves del Mundial</Text>
            <Text style={[s.sub, { color: appColors.textSecondary }]}>Copa Mundial 2026 · Fase eliminatoria</Text>
          </View>
        </View>

        {loading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <ScrollView
            horizontal
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            showsHorizontalScrollIndicator
            contentContainerStyle={{ paddingHorizontal: 8 }}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              {/* Scroll hint */}
              <View style={[s.hint, { backgroundColor: appColors.surfaceSecondary }]}>
                <Ionicons name="swap-horizontal-outline" size={12} color={appColors.textSecondary} />
                <Text style={[s.hintTxt, { color: appColors.textSecondary }]}>
                  Deslizá para ver el bracket completo · Tocá un partido para ver detalles
                </Text>
              </View>

              {/* Bracket canvas */}
              <View style={{ width: TW, height: totalH, position: 'relative' }}>

                {/* Round headers */}
                {ROUND_COLS.map(({ label, x }) => (
                  <View key={`hdr-${label}-${x}`} style={[s.roundHeader, { left: x, top: 0, width: CW }]}>
                    <Text style={[s.roundLabel, { color: colors.primary }]}>{label}</Text>
                  </View>
                ))}

                {/* Connector lines */}
                <View style={{ position: 'absolute', left: 0, top: HEADER_H }}>
                  <LeftConns fromX={LR32} numPairs={4} fromRound={0} lc={lc} />
                  <LeftConns fromX={LR16} numPairs={2} fromRound={1} lc={lc} />
                  <LeftConns fromX={LQF}  numPairs={1} fromRound={2} lc={lc} />
                  <HL x={LSF + CW} y={yC(3, 0)} w={GW} c={lc} />

                  <RightConns fromX={RR32} prevX={RR16} numPairs={4} fromRound={0} lc={lc} />
                  <RightConns fromX={RR16} prevX={RQF}  numPairs={2} fromRound={1} lc={lc} />
                  <RightConns fromX={RQF}  prevX={RSF}  numPairs={1} fromRound={2} lc={lc} />
                  <HL x={FX + CW} y={yC(3, 0)} w={GW} c={lc} />
                </View>

                {/* Match cards */}
                <View style={{ position: 'absolute', left: 0, top: HEADER_H }}>

                  {/* Left R32 */}
                  {L_R32.map((m, i) => (
                    <MatchCard
                      key={m.id}
                      match={m}
                      gmap={gmap}
                      x={LR32}
                      slotIdx={i}
                      appColors={appColors}
                      lineColor={lc}
                      dbMatch={getR32(true, i)}
                      nav={nav}
                    />
                  ))}

                  {/* Right R32 */}
                  {R_R32.map((m, i) => (
                    <MatchCard
                      key={m.id}
                      match={m}
                      gmap={gmap}
                      x={RR32}
                      slotIdx={i}
                      appColors={appColors}
                      lineColor={lc}
                      dbMatch={getR32(false, i)}
                      nav={nav}
                    />
                  ))}

                  {/* Left R16 */}
                  {[0, 1, 2, 3].map(i => (
                    <KnockoutCard
                      key={`lr16-${i}`}
                      round={1} idx={i} x={LR16}
                      dbMatch={getR16(true, i)}
                      label={`W${49 + i * 2}/W${50 + i * 2}`}
                      appColors={appColors}
                      nav={nav}
                    />
                  ))}

                  {/* Left QF */}
                  {[0, 1].map(i => (
                    <KnockoutCard
                      key={`lqf-${i}`}
                      round={2} idx={i} x={LQF}
                      dbMatch={getQF(true, i)}
                      label={`W R16-L${i * 2 + 1}/L${i * 2 + 2}`}
                      appColors={appColors}
                      nav={nav}
                    />
                  ))}

                  {/* Left SF */}
                  <KnockoutCard
                    round={3} idx={0} x={LSF}
                    dbMatch={getSF(true)}
                    label="W QF-L"
                    appColors={appColors}
                    nav={nav}
                  />

                  {/* Right R16 */}
                  {[0, 1, 2, 3].map(i => (
                    <KnockoutCard
                      key={`rr16-${i}`}
                      round={1} idx={i} x={RR16}
                      dbMatch={getR16(false, i)}
                      label={`W${57 + i * 2}/W${58 + i * 2}`}
                      appColors={appColors}
                      nav={nav}
                    />
                  ))}

                  {/* Right QF */}
                  {[0, 1].map(i => (
                    <KnockoutCard
                      key={`rqf-${i}`}
                      round={2} idx={i} x={RQF}
                      dbMatch={getQF(false, i)}
                      label={`W R16-R${i * 2 + 1}/R${i * 2 + 2}`}
                      appColors={appColors}
                      nav={nav}
                    />
                  ))}

                  {/* Right SF */}
                  <KnockoutCard
                    round={3} idx={0} x={RSF}
                    dbMatch={getSF(false)}
                    label="W QF-R"
                    appColors={appColors}
                    nav={nav}
                  />

                  {/* Final */}
                  <FinalCard
                    appColors={appColors}
                    dbMatch={ko.fin[0]}
                    nav={nav}
                  />
                </View>
              </View>

              {/* Legend */}
              <View style={[s.legend, { backgroundColor: appColors.surface }]}>
                <Text style={[s.legendTxt, { color: appColors.textSecondary }]}>
                  * 3° → Mejor tercero clasificado de los grupos indicados
                </Text>
                <Text style={[s.legendTxt, { color: appColors.textSecondary }]}>
                  Los equipos se actualizan automáticamente según el fixture · ✓ Resultado final
                </Text>
              </View>
            </ScrollView>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.screen, paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 4 },
  title: { fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold },
  sub: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.regular },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hint: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, marginBottom: 8, alignSelf: 'flex-start',
  },
  hintTxt: { fontSize: 11, fontFamily: typography.fontFamily.regular },

  roundHeader: { position: 'absolute' },
  roundLabel: {
    fontSize: 10, fontFamily: typography.fontFamily.bold,
    textAlign: 'center', paddingVertical: 4,
  },

  card: {
    position: 'absolute', borderRadius: 6, borderWidth: 1,
    paddingHorizontal: 5, paddingVertical: 4, justifyContent: 'space-between',
  },
  advCard: { justifyContent: 'center', alignItems: 'center' },
  finalCard: { borderWidth: 2, justifyContent: 'center', alignItems: 'center', gap: 2 },

  matchId: { fontSize: 8, fontFamily: typography.fontFamily.regular, textAlign: 'center' },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  logo: { width: 18, height: 18, borderRadius: 2 },
  logoBox: { width: 18, height: 18, borderRadius: 2 },
  codeTxt: { fontSize: 11, fontFamily: typography.fontFamily.semiBold, flex: 1 },
  placeholderTxt: { fontSize: 10, fontFamily: typography.fontFamily.regular, flex: 1 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: -5 },

  advLabel: { fontSize: 9, fontFamily: typography.fontFamily.regular, textAlign: 'center' },
  finalLabel: { fontSize: 13, fontFamily: typography.fontFamily.bold },
  finalSub: { fontSize: 9, fontFamily: typography.fontFamily.regular },

  legend: {
    marginTop: 12, padding: 10, borderRadius: 8, gap: 2, marginHorizontal: 8,
  },
  legendTxt: { fontSize: 10, fontFamily: typography.fontFamily.regular },
});
