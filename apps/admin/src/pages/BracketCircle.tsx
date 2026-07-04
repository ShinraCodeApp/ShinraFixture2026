import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../services/adminApi';

interface BMatch {
  id: string;
  round: number;
  homeTeam: { code: string; name: string; flagUrl?: string } | null;
  awayTeam: { code: string; name: string; flagUrl?: string } | null;
  homeScore: number | null;
  awayScore: number | null;
  homePenalties: number | null;
  awayPenalties: number | null;
  status: string;
}

// ── Layout constants ────────────────────────────────────────────────────────
const S = 880;          // SVG size
const CX = S / 2;
const CY = S / 2;

// Radius and node size per layer (0=outermost R32, 4=finalists)
const RADII    = [398, 310, 228, 154, 88];
const NODE_R   = [ 18,  21,  25,  29, 34];
const SLOT_CNT = [ 32,  16,   8,   4,  2]; // teams per layer

// Rounds mapped to each layer (layer 1–4 only; layer 0 is special)
const LAYER_ROUNDS: Record<number, number[]> = {
  1: [89, 90, 91, 92, 93, 94, 95, 96],
  2: [97, 98, 99, 100],
  3: [101, 102],
  4: [104],
};

// ── Math helpers ────────────────────────────────────────────────────────────
function slotXY(layer: number, slot: number): [number, number] {
  const outerSpan   = Math.pow(2, layer);
  const outerCenter = slot * outerSpan + (outerSpan - 1) / 2;
  const deg         = outerCenter * (360 / 32) - 90; // 0° = top, clockwise
  const rad         = (deg * Math.PI) / 180;
  return [CX + RADII[layer] * Math.cos(rad), CY + RADII[layer] * Math.sin(rad)];
}

function winner(m: BMatch | undefined): 'home' | 'away' | null {
  if (!m || m.status !== 'FINISHED') return null;
  if (m.homePenalties != null && m.awayPenalties != null)
    return m.homePenalties > m.awayPenalties ? 'home' : 'away';
  if (m.homeScore != null && m.awayScore != null) {
    if (m.homeScore > m.awayScore) return 'home';
    if (m.awayScore > m.homeScore) return 'away';
  }
  return null;
}

// ── Node type ───────────────────────────────────────────────────────────────
interface NodeInfo {
  team: BMatch['homeTeam'] | null;
  won: boolean;
  lost: boolean;
}

function buildNodeInfo(
  layer: number,
  slot: number,
  byRound: Record<number, BMatch>
): NodeInfo {
  let m: BMatch | undefined;
  let side: 'home' | 'away';

  if (layer === 0) {
    // R32 participants: rounds 73–88, 2 teams each
    const round = 73 + Math.floor(slot / 2);
    side = slot % 2 === 0 ? 'home' : 'away';
    m = byRound[round];
  } else {
    const rounds = LAYER_ROUNDS[layer];
    const round  = rounds[Math.floor(slot / 2)];
    side = slot % 2 === 0 ? 'home' : 'away';
    m = byRound[round];
  }

  const team    = m ? (side === 'home' ? m.homeTeam : m.awayTeam) : null;
  const w       = winner(m);
  const finished = m?.status === 'FINISHED';

  return {
    team,
    won:  finished && w === side,
    lost: finished && w !== null && w !== side,
  };
}

// ── Stage ring labels ───────────────────────────────────────────────────────
const STAGE_LABELS = ['16avos', 'Octavos', 'Cuartos', 'Semis', 'Final'];

// ── Component ───────────────────────────────────────────────────────────────
export function BracketCircle() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-bracket-circular'],
    queryFn:  () => adminApi.getMatches({ stage: 'knockout', limit: '200' }),
    staleTime: 30_000,
    refetchInterval: 2 * 60_000,
  });

  const matches: BMatch[] = data?.data?.items ?? [];
  const byRound: Record<number, BMatch> = {};
  for (const m of matches) byRound[m.round] = m;

  if (isLoading) return (
    <div className="flex items-center justify-center h-64 text-slate-400">
      Cargando bracket...
    </div>
  );

  // ── Build node info ─────────────────────────────────────────────────────
  const nodes: Record<string, NodeInfo> = {};
  for (let layer = 0; layer <= 4; layer++) {
    for (let slot = 0; slot < SLOT_CNT[layer]; slot++) {
      nodes[`${layer}-${slot}`] = buildNodeInfo(layer, slot, byRound);
    }
  }

  // ── SVG elements ────────────────────────────────────────────────────────
  const clipDefs: React.ReactNode[] = [];
  const lines:    React.ReactNode[] = [];
  const circles:  React.ReactNode[] = [];

  // Connector lines (layers 0–3 → parent in layer+1, plus layer 4 → center)
  for (let layer = 0; layer <= 4; layer++) {
    const pairs = SLOT_CNT[layer] / 2;
    for (let pair = 0; pair < pairs; pair++) {
      const sA = pair * 2;
      const sB = pair * 2 + 1;

      const [ax, ay] = slotXY(layer, sA);
      const [bx, by] = slotXY(layer, sB);

      const nA = nodes[`${layer}-${sA}`];
      const nB = nodes[`${layer}-${sB}`];

      let px: number, py: number;
      if (layer < 4) {
        [px, py] = slotXY(layer + 1, pair);
      } else {
        // Final → trophy center
        px = CX; py = CY;
      }

      const colorA  = nA.won ? '#22c55e' : nA.lost ? '#1f2937' : '#334155';
      const colorB  = nB.won ? '#22c55e' : nB.lost ? '#1f2937' : '#334155';
      const opacA   = nA.lost ? 0.35 : 1;
      const opacB   = nB.lost ? 0.35 : 1;
      const strokeA = nA.won ? 2 : 1.5;
      const strokeB = nB.won ? 2 : 1.5;

      lines.push(
        <line key={`la-${layer}-${pair}`}
          x1={ax} y1={ay} x2={px} y2={py}
          stroke={colorA} strokeWidth={strokeA} opacity={opacA}
        />,
        <line key={`lb-${layer}-${pair}`}
          x1={bx} y1={by} x2={px} y2={py}
          stroke={colorB} strokeWidth={strokeB} opacity={opacB}
        />
      );
    }
  }

  // Nodes
  for (let layer = 0; layer <= 4; layer++) {
    const r = NODE_R[layer];
    for (let slot = 0; slot < SLOT_CNT[layer]; slot++) {
      const [x, y] = slotXY(layer, slot);
      const info   = nodes[`${layer}-${slot}`];
      const cpId   = `cp-${layer}-${slot}`;

      clipDefs.push(
        <clipPath key={cpId} id={cpId}>
          <circle cx={x} cy={y} r={r - 1} />
        </clipPath>
      );

      const bg      = !info.team ? '#0f172a' : info.lost ? '#131c2e' : '#1e293b';
      const border  = info.won   ? '#22c55e' : info.lost ? '#1e293b' : info.team ? '#3f5068' : '#1e293b';
      const bWidth  = info.won   ? 2.5 : 1.5;
      const imgOpac = info.lost  ? 0.22 : 1;

      // Outer glow for winners
      if (info.won) {
        circles.push(
          <circle key={`glow-${layer}-${slot}`} cx={x} cy={y} r={r + 4}
            fill="none" stroke="#22c55e" strokeWidth={1.5} opacity={0.3}
          />
        );
      }

      circles.push(
        <g key={`n-${layer}-${slot}`}>
          <circle cx={x} cy={y} r={r} fill={bg} stroke={border} strokeWidth={bWidth} />
          {info.team?.flagUrl && (
            <image
              href={info.team.flagUrl}
              x={x - r + 1} y={y - r + 1}
              width={(r - 1) * 2} height={(r - 1) * 2}
              clipPath={`url(#${cpId})`}
              preserveAspectRatio="xMidYMid slice"
              opacity={imgOpac}
            />
          )}
          {!info.team && (
            <text x={x} y={y + 3} textAnchor="middle" fill="#334155" fontSize={8} fontFamily="monospace">?</text>
          )}
          {/* Team code label: shown on outer 2 layers */}
          {info.team && layer <= 1 && (
            <text
              x={x} y={y + r + 10}
              textAnchor="middle"
              fontSize={layer === 0 ? 6.5 : 7.5}
              fill={info.lost ? '#2d3748' : info.won ? '#86efac' : '#7a8fa6'}
              fontFamily="monospace"
              fontWeight={info.won ? 'bold' : 'normal'}
            >
              {info.team.code}
            </text>
          )}
        </g>
      );
    }
  }

  // Stage labels (placed at upper-left of each ring)
  const stageLabelEls = RADII.map((r, layer) => {
    const deg = -135; // upper-left diagonal
    const rad = (deg * Math.PI) / 180;
    const lx  = CX + (r - NODE_R[layer] - 12) * Math.cos(rad);
    const ly  = CY + (r - NODE_R[layer] - 12) * Math.sin(rad);
    return (
      <text key={`sl-${layer}`} x={lx} y={ly}
        textAnchor="middle" fontSize={8}
        fill="#475569" fontFamily="sans-serif" fontWeight="bold" letterSpacing={0.8}
      >
        {STAGE_LABELS[layer]}
      </text>
    );
  });

  // Score labels on the bracket lines: show score on the outer rings' match pairs
  const scoreLabels: React.ReactNode[] = [];
  for (let layer = 0; layer <= 3; layer++) {
    const pairs = SLOT_CNT[layer] / 2;
    for (let pair = 0; pair < pairs; pair++) {
      const sA = pair * 2;
      const sB = pair * 2 + 1;

      // The match info is in the parent layer's match
      // For layer 0: match is round 73 + pair (pair 0..7 = R73..R80, pair 8..15 = R81..R88)
      let matchRound: number;
      if (layer === 0) {
        matchRound = 73 + pair;
      } else {
        matchRound = LAYER_ROUNDS[layer][pair];
      }

      const m = byRound[matchRound];
      if (!m || m.status !== 'FINISHED' || m.homeScore == null) continue;

      const [ax, ay] = slotXY(layer, sA);
      const [bx, by] = slotXY(layer, sB);
      const midX = (ax + bx) / 2;
      const midY = (ay + by) / 2;

      const scoreText = m.homePenalties != null
        ? `${m.homeScore}-${m.awayScore} (${m.homePenalties}-${m.awayPenalties}p)`
        : `${m.homeScore}-${m.awayScore}`;

      scoreLabels.push(
        <text key={`score-${layer}-${pair}`}
          x={midX} y={midY}
          textAnchor="middle"
          fontSize={layer === 0 ? 6 : 7}
          fill="#64748b"
          fontFamily="monospace"
        >
          {scoreText}
        </text>
      );
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">Se actualiza automáticamente · auto-refresh 2 min</p>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-xs px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors disabled:opacity-50"
        >
          {isFetching ? 'Actualizando...' : 'Actualizar ahora'}
        </button>
      </div>

      <div className="bg-slate-950 rounded-2xl overflow-hidden">
        <svg
          viewBox={`0 0 ${S} ${S}`}
          style={{ width: '100%', maxHeight: '82vh', display: 'block' }}
        >
          <defs>{clipDefs}</defs>

          {/* Dark field */}
          <rect width={S} height={S} fill="#020617" />

          {/* Subtle ring guides */}
          {RADII.map((r, i) => (
            <circle key={`ring-${i}`} cx={CX} cy={CY} r={r}
              fill="none" stroke="#0f1c2e" strokeWidth={NODE_R[i] * 2 + 8}
            />
          ))}
          {RADII.map((r, i) => (
            <circle key={`ring-line-${i}`} cx={CX} cy={CY} r={r}
              fill="none" stroke="#1e293b" strokeWidth={0.75}
            />
          ))}

          {/* Lines behind nodes */}
          {lines}

          {/* Score labels */}
          {scoreLabels}

          {/* Stage labels */}
          {stageLabelEls}

          {/* Team nodes */}
          {circles}

          {/* Trophy center */}
          <circle cx={CX} cy={CY} r={42} fill="#0a1220" stroke="#78350f" strokeWidth={1.5} />
          <circle cx={CX} cy={CY} r={38} fill="#0f1c2e" stroke="#d97706" strokeWidth={1} />
          <text x={CX} y={CY - 5} textAnchor="middle" fontSize={24}>🏆</text>
          <text x={CX} y={CY + 15} textAnchor="middle" fill="#d97706"
            fontSize={8} fontWeight="bold" fontFamily="sans-serif" letterSpacing={1.5}>
            MUNDIAL
          </text>
        </svg>
      </div>
    </div>
  );
}
