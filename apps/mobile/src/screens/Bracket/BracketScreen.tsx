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
const SH = 82;     // slot height per R32 match
const CW = 98;     // card width
const CH = 60;     // card height
const GW = 20;     // gap between rounds (connector space)
const CS = CW + GW; // column step = 118
const BH = 8 * SH; // bracket height = 656

// Left half x-positions
const LR32 = 0;
const LR16 = CS;
const LQF  = CS * 2;
const LSF  = CS * 3;

// Final (center)
const FX = LSF + CW + GW; // left edge of Final card

// Right half x-positions (mirror, going away from center)
const RSF  = FX + CW + GW;
const RQF  = RSF + CS;
const RR16 = RSF + CS * 2;
const RR32 = RSF + CS * 3;

const TW = RR32 + CW + 16; // total bracket width

// y-center of a match given round (0=R32…3=SF) and match index
function yC(round: number, idx: number): number {
  const k = 1 << round; // 1,2,4,8
  return k * SH * idx + (k * SH) / 2;
}

// ── Data types ─────────────────────────────────────────────────────────
interface TeamInfo { name: string; code: string; logo: string }
interface Slot { type: 'g1' | 'g2' | 'g3'; group?: string; pools?: string[] }
interface BMatch { id: string; home: Slot; away: Slot }
type GroupMap = Record<string, { team: TeamInfo }[]>;

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

function MatchCard({
  match, gmap, x, slotIdx, colX, appColors, lineColor,
}: {
  match: BMatch; gmap: GroupMap; x: number; slotIdx: number; colX: number;
  appColors: any; lineColor: string;
}) {
  const cy = yC(0, slotIdx);
  const cardY = cy - CH / 2;
  return (
    <View style={[s.card, {
      left: x, top: cardY, width: CW, height: CH,
      backgroundColor: appColors.surface,
      borderColor: appColors.border,
    }]}>
      <Text style={[s.matchId, { color: appColors.textSecondary }]}>{match.id}</Text>
      <TeamRow slot={match.home} gmap={gmap} appColors={appColors} />
      <View style={[s.divider, { backgroundColor: appColors.border }]} />
      <TeamRow slot={match.away} gmap={gmap} appColors={appColors} />
    </View>
  );
}

function AdvCard({
  round, idx, x, label, appColors,
}: {
  round: number; idx: number; x: number; label: string; appColors: any;
}) {
  const cy = yC(round, idx);
  const cardY = cy - CH / 2;
  return (
    <View style={[s.card, s.advCard, {
      left: x, top: cardY, width: CW, height: CH,
      backgroundColor: appColors.surfaceSecondary,
      borderColor: appColors.border,
    }]}>
      <Text style={[s.advLabel, { color: appColors.textSecondary }]}>{label}</Text>
    </View>
  );
}

function FinalCard({ appColors }: { appColors: any }) {
  const cy = yC(3, 0);
  const cardY = cy - CH / 2 - 10;
  return (
    <View style={[s.card, s.finalCard, {
      left: FX, top: cardY, width: CW, height: CH + 20,
      backgroundColor: '#1a1200',
      borderColor: colors.primary,
    }]}>
      <Text style={[s.finalLabel, { color: colors.primary }]}>FINAL</Text>
      <Text style={[s.finalSub, { color: '#888' }]}>26 Jul</Text>
      <View style={[s.divider, { backgroundColor: '#333' }]} />
      <Text style={[s.finalSub, { color: '#888' }]}>Nueva Jersey</Text>
    </View>
  );
}

// Line helpers (absolutely positioned)
function HL({ x, y, w, c }: { x: number; y: number; w: number; c: string }) {
  return <View style={{ position: 'absolute', left: x, top: y - 0.5, width: w, height: 1, backgroundColor: c }} />;
}
function VL({ x, y, h, c }: { x: number; y: number; h: number; c: string }) {
  return <View style={{ position: 'absolute', left: x - 0.5, top: y, width: 1, height: h, backgroundColor: c }} />;
}

// Left-side connectors: from colX going RIGHT to nextColX
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

// Right-side connectors: from colX going LEFT toward prevColX
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

// Round header labels
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStandings = useCallback(async () => {
    try {
      const res = await apiService.get('/stats/wc-standings');
      const arr: any[] = res.data.data ?? [];
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
    } catch (e) {
      // silently fail, placeholders show
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchStandings(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchStandings(); };

  const lc = appColors.border; // line color
  const HEADER_H = 36;
  const totalH = BH + HEADER_H + 32; // 32 top+bottom pad

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
                  Deslizá para ver el bracket completo
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
                  {/* Left half connectors */}
                  <LeftConns fromX={LR32} numPairs={4} fromRound={0} lc={lc} />
                  <LeftConns fromX={LR16} numPairs={2} fromRound={1} lc={lc} />
                  <LeftConns fromX={LQF}  numPairs={1} fromRound={2} lc={lc} />
                  {/* LSF → Final */}
                  <HL x={LSF + CW} y={yC(3, 0)} w={GW} c={lc} />

                  {/* Right half connectors */}
                  <RightConns fromX={RR32} prevX={RR16} numPairs={4} fromRound={0} lc={lc} />
                  <RightConns fromX={RR16} prevX={RQF}  numPairs={2} fromRound={1} lc={lc} />
                  <RightConns fromX={RQF}  prevX={RSF}  numPairs={1} fromRound={2} lc={lc} />
                  {/* RSF → Final */}
                  <HL x={FX + CW} y={yC(3, 0)} w={GW} c={lc} />
                </View>

                {/* Match cards offset by HEADER_H */}
                <View style={{ position: 'absolute', left: 0, top: HEADER_H }}>

                  {/* Left R32 */}
                  {L_R32.map((m, i) => (
                    <MatchCard key={m.id} match={m} gmap={gmap} x={LR32} slotIdx={i} colX={LR32} appColors={appColors} lineColor={lc} />
                  ))}

                  {/* Right R32 */}
                  {R_R32.map((m, i) => (
                    <MatchCard key={m.id} match={m} gmap={gmap} x={RR32} slotIdx={i} colX={RR32} appColors={appColors} lineColor={lc} />
                  ))}

                  {/* Left advanced rounds (placeholder cards) */}
                  {[0,1,2,3].map(i => (
                    <AdvCard key={`lr16-${i}`} round={1} idx={i} x={LR16} label={`W${49+i*2}/W${50+i*2}`} appColors={appColors} />
                  ))}
                  {[0,1].map(i => (
                    <AdvCard key={`lqf-${i}`} round={2} idx={i} x={LQF} label={`W R16-L${i*2+1}/L${i*2+2}`} appColors={appColors} />
                  ))}
                  <AdvCard round={3} idx={0} x={LSF} label="W QF-L" appColors={appColors} />

                  {/* Right advanced rounds (placeholder cards) */}
                  {[0,1,2,3].map(i => (
                    <AdvCard key={`rr16-${i}`} round={1} idx={i} x={RR16} label={`W${57+i*2}/W${58+i*2}`} appColors={appColors} />
                  ))}
                  {[0,1].map(i => (
                    <AdvCard key={`rqf-${i}`} round={2} idx={i} x={RQF} label={`W R16-R${i*2+1}/R${i*2+2}`} appColors={appColors} />
                  ))}
                  <AdvCard round={3} idx={0} x={RSF} label="W QF-R" appColors={appColors} />

                  {/* Final */}
                  <FinalCard appColors={appColors} />
                </View>
              </View>

              {/* Legend */}
              <View style={[s.legend, { backgroundColor: appColors.surface }]}>
                <Text style={[s.legendTxt, { color: appColors.textSecondary }]}>
                  * 3° → Mejor tercero clasificado de los grupos indicados
                </Text>
                <Text style={[s.legendTxt, { color: appColors.textSecondary }]}>
                  Los equipos se actualizan automáticamente según el fixture
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
