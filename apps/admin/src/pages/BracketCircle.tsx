import React, { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../services/adminApi';

type TeamRef = { id: string; code: string; name: string; flagUrl?: string };

interface BMatch {
  id: string;
  round: number;
  homeTeam: TeamRef | null;
  awayTeam: TeamRef | null;
  homeScore: number | null;
  awayScore: number | null;
  homePenalties: number | null;
  awayPenalties: number | null;
  status: string;
}

// ── Layout ──────────────────────────────────────────────────────────────────
const S       = 880;
const CX      = S / 2;
const CY      = S / 2;
const RADII    = [398, 310, 228, 154, 88];
// Outer ring is largest so teams are prominent; winner nodes shrink inward
const NODE_R   = [ 26,  22,  20,  24, 30];
const SLOT_CNT = [ 32,  16,   8,   4,  2];

const LAYER_ROUNDS: Record<number, number[]> = {
  1: [89, 90, 91, 92, 93, 94, 95, 96],
  2: [97, 98, 99, 100],
  3: [101, 102],
  4: [104],
};

// Outer ring order: reordered so each R32 pair visually connects radially to the correct R16 slot.
// Pairs 8-9: R84(POR)→R93 home, R83(ESP)→R93 away
// Pairs 10-11: R81→R94 home, R82→R94 away (USA/BEL sources)
// Pairs 12-13: R87(ARG)→R95 home, R86(EGY)→R95 away
// Pairs 14-15: R85(SUI)→R96 home, R88(COL)→R96 away
const OUTER_R32 = [73,74,75,76,77,78,79,80, 84,83,81,82, 87,86,85,88];

const STAGE_LABELS = ['16avos', 'Octavos', 'Cuartos', 'Semis', 'Final'];

// ── Helpers ──────────────────────────────────────────────────────────────────
function slotXY(layer: number, slot: number): [number, number] {
  const outerSpan   = Math.pow(2, layer);
  const outerCenter = slot * outerSpan + (outerSpan - 1) / 2;
  const deg         = outerCenter * (360 / 32) - 90;
  const rad         = (deg * Math.PI) / 180;
  return [CX + RADII[layer] * Math.cos(rad), CY + RADII[layer] * Math.sin(rad)];
}

function matchRoundFor(layer: number, slot: number): number {
  if (layer === 0) return OUTER_R32[Math.floor(slot / 2)];
  return LAYER_ROUNDS[layer][Math.floor(slot / 2)];
}

function winnerSide(m: BMatch | undefined): 'home' | 'away' | null {
  if (!m || m.status !== 'FINISHED') return null;
  if (m.homePenalties != null && m.awayPenalties != null)
    return m.homePenalties > m.awayPenalties ? 'home' : 'away';
  if (m.homeScore != null && m.awayScore != null) {
    if (m.homeScore > m.awayScore) return 'home';
    if (m.awayScore > m.homeScore) return 'away';
  }
  return null;
}

interface NodeInfo {
  team: TeamRef | null;
  won: boolean;
  lost: boolean;
  matchRound: number;
}

interface DragState {
  srcLayer: number;
  srcSlot: number;
  team: TeamRef | null;
  matchId: string;
  side: 'home' | 'away';
  svgX: number;
  svgY: number;
  startX: number;
  startY: number;
}

function buildNode(layer: number, slot: number, byRound: Record<number, BMatch>): NodeInfo {
  const round = matchRoundFor(layer, slot);
  const side  = slot % 2 === 0 ? 'home' : 'away';
  const m     = byRound[round];
  const team  = m ? (side === 'home' ? m.homeTeam : m.awayTeam) : null;
  const w     = winnerSide(m);
  const fin   = m?.status === 'FINISHED';
  return { team, won: fin && w === side, lost: fin && w !== null && w !== side, matchRound: round };
}

// ── Edit Modal ───────────────────────────────────────────────────────────────
function EditModal({ match, onClose, onSaved }: {
  match: BMatch;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [homeScore, setHomeScore] = useState(match.homeScore ?? 0);
  const [awayScore, setAwayScore] = useState(match.awayScore ?? 0);
  const [status, setStatus]       = useState(match.status);
  const [hasPen, setHasPen]       = useState(match.homePenalties != null);
  const [homePen, setHomePen]     = useState(match.homePenalties ?? 0);
  const [awayPen, setAwayPen]     = useState(match.awayPenalties ?? 0);

  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      adminApi.editMatchFull(match.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-bracket-circular'] });
      qc.invalidateQueries({ queryKey: ['admin-bracket'] });
      qc.invalidateQueries({ queryKey: ['admin-tournament-status'] });
      onSaved();
    },
  });

  const save = () => {
    const payload: Record<string, unknown> = {
      status,
      homeScore: status !== 'SCHEDULED' ? homeScore : null,
      awayScore: status !== 'SCHEDULED' ? awayScore : null,
      homePenalties: hasPen ? homePen : null,
      awayPenalties: hasPen ? awayPen : null,
    };
    mutation.mutate(payload);
  };

  const inputCls = 'w-full rounded-lg bg-slate-900 border border-slate-700 text-white text-center text-xl font-bold py-2 focus:outline-none focus:border-primary-500';
  const smInputCls = 'w-20 rounded-lg bg-slate-900 border border-slate-700 text-white text-center font-bold py-1.5 text-base focus:outline-none focus:border-primary-500';

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-5" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="text-center">
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">
            R{match.round} · {STAGE_LABELS.find((_, i) => {
              const layerRounds = [[], [89,90,91,92,93,94,95,96],[97,98,99,100],[101,102],[104]];
              return layerRounds[i]?.includes(match.round) || (match.round >= 73 && match.round <= 88 && i === 0);
            }) ?? ''}
            {match.round >= 73 && match.round <= 88 ? '16avos' :
             match.round >= 89 && match.round <= 96 ? 'Octavos' :
             match.round >= 97 && match.round <= 100 ? 'Cuartos' :
             match.round >= 101 && match.round <= 102 ? 'Semis' : 'Final'}
          </p>
          <div className="flex items-center justify-center gap-3">
            {match.homeTeam?.flagUrl && <img src={match.homeTeam.flagUrl} className="w-8 h-6 object-contain rounded" />}
            <span className="font-black text-white text-lg">{match.homeTeam?.code ?? 'TBD'}</span>
            <span className="text-slate-500 text-sm">vs</span>
            <span className="font-black text-white text-lg">{match.awayTeam?.code ?? 'TBD'}</span>
            {match.awayTeam?.flagUrl && <img src={match.awayTeam.flagUrl} className="w-8 h-6 object-contain rounded" />}
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="text-xs text-slate-400 block mb-1.5 font-medium">Estado</label>
          <div className="grid grid-cols-4 gap-1.5">
            {['SCHEDULED', 'LIVE', 'HALF_TIME', 'FINISHED'].map(s => (
              <button key={s}
                onClick={() => setStatus(s)}
                className={`py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  status === s
                    ? s === 'FINISHED' ? 'bg-green-600 text-white'
                      : s === 'LIVE' || s === 'HALF_TIME' ? 'bg-red-600 text-white'
                      : 'bg-primary-600 text-white'
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                }`}
              >
                {s === 'SCHEDULED' ? 'Prog' : s === 'HALF_TIME' ? 'Desc' : s === 'LIVE' ? 'Vivo' : 'Final'}
              </button>
            ))}
          </div>
        </div>

        {/* Score */}
        {status !== 'SCHEDULED' && (
          <div>
            <label className="text-xs text-slate-400 block mb-1.5 font-medium">Marcador</label>
            <div className="flex items-center gap-3">
              <input type="number" min={0} max={99} value={homeScore}
                onChange={e => setHomeScore(+e.target.value)}
                className={inputCls}
              />
              <span className="text-slate-500 font-bold text-lg flex-shrink-0">–</span>
              <input type="number" min={0} max={99} value={awayScore}
                onChange={e => setAwayScore(+e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        )}

        {/* Penalties */}
        {status === 'FINISHED' && (
          <div>
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input type="checkbox" checked={hasPen} onChange={e => setHasPen(e.target.checked)}
                className="w-4 h-4 rounded accent-primary-500"
              />
              <span className="text-xs text-slate-300 font-medium">Definido por penales</span>
            </label>
            {hasPen && (
              <div className="flex items-center gap-3 justify-center mt-2">
                <div className="text-center">
                  <p className="text-[10px] text-slate-500 mb-1">{match.homeTeam?.code ?? 'Local'}</p>
                  <input type="number" min={0} max={20} value={homePen}
                    onChange={e => setHomePen(+e.target.value)}
                    className={smInputCls}
                  />
                </div>
                <span className="text-slate-500 text-sm font-bold mt-4">–</span>
                <div className="text-center">
                  <p className="text-[10px] text-slate-500 mb-1">{match.awayTeam?.code ?? 'Visit'}</p>
                  <input type="number" min={0} max={20} value={awayPen}
                    onChange={e => setAwayPen(+e.target.value)}
                    className={smInputCls}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {mutation.isError && (
          <p className="text-red-400 text-xs text-center">Error al guardar</p>
        )}
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-300 text-sm hover:bg-slate-700 transition-colors">
            Cancelar
          </button>
          <button onClick={save} disabled={mutation.isPending}
            className="flex-1 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white text-sm font-bold transition-colors">
            {mutation.isPending ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export function BracketCircle() {
  const [editingMatch, setEditingMatch] = useState<BMatch | null>(null);
  const [hoveredRound, setHoveredRound] = useState<number | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dropTarget, setDropTarget] = useState<{ layer: number; slot: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const qc = useQueryClient();

  const toSVG = useCallback((e: React.MouseEvent): { x: number; y: number } => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const inv = svg.getScreenCTM()?.inverse();
    if (!inv) return { x: 0, y: 0 };
    const sp = pt.matrixTransform(inv);
    return { x: sp.x, y: sp.y };
  }, []);

  const handleSwap = useCallback(async (
    d: DragState, dst: { layer: number; slot: number }, byRound: Record<number, BMatch>
  ) => {
    const srcMatch = byRound[matchRoundFor(d.srcLayer, d.srcSlot)];
    const dstMatch = byRound[matchRoundFor(dst.layer, dst.slot)];
    if (!srcMatch || !dstMatch || srcMatch.id === dstMatch.id) return;

    const dstSide = dst.slot % 2 === 0 ? 'home' : 'away';
    const dstTeam = dstSide === 'home' ? dstMatch.homeTeam : dstMatch.awayTeam;

    const srcPatch: Record<string, unknown> =
      d.side === 'home'
        ? { homeTeamId: dstTeam?.id ?? null, homeLabel: dstTeam?.code ?? null }
        : { awayTeamId: dstTeam?.id ?? null, awayLabel: dstTeam?.code ?? null };

    const dstPatch: Record<string, unknown> =
      dstSide === 'home'
        ? { homeTeamId: d.team?.id ?? null, homeLabel: d.team?.code ?? null }
        : { awayTeamId: d.team?.id ?? null, awayLabel: d.team?.code ?? null };

    await Promise.all([
      adminApi.editMatchFull(srcMatch.id, srcPatch),
      adminApi.editMatchFull(dstMatch.id, dstPatch),
    ]);
    qc.invalidateQueries({ queryKey: ['admin-bracket-circular'] });
    qc.invalidateQueries({ queryKey: ['admin-bracket'] });
  }, [qc]);

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
    <div className="flex items-center justify-center h-64 text-slate-400">Cargando bracket...</div>
  );

  // Build all nodes
  const nodes: Record<string, NodeInfo> = {};
  for (let layer = 0; layer <= 4; layer++)
    for (let slot = 0; slot < SLOT_CNT[layer]; slot++)
      nodes[`${layer}-${slot}`] = buildNode(layer, slot, byRound);

  const clipDefs: React.ReactNode[] = [];
  const lines:    React.ReactNode[] = [];
  const circles:  React.ReactNode[] = [];
  const hitAreas: React.ReactNode[] = [];
  const scoreLabels: React.ReactNode[] = [];

  // ── Lines ─────────────────────────────────────────────────────────────────
  for (let layer = 0; layer <= 4; layer++) {
    for (let pair = 0; pair < SLOT_CNT[layer] / 2; pair++) {
      const sA = pair * 2, sB = pair * 2 + 1;
      const [ax, ay] = slotXY(layer, sA);
      const [bx, by] = slotXY(layer, sB);
      const [px, py] = layer < 4 ? slotXY(layer + 1, pair) : [CX, CY];

      const nA = nodes[`${layer}-${sA}`];
      const nB = nodes[`${layer}-${sB}`];
      const matchRound = nA.matchRound;
      const isHovered  = hoveredRound === matchRound;

      const cA = nA.won ? '#22c55e' : nA.lost ? '#1f2937' : isHovered ? '#64748b' : '#334155';
      const cB = nB.won ? '#22c55e' : nB.lost ? '#1f2937' : isHovered ? '#64748b' : '#334155';

      lines.push(
        <line key={`la-${layer}-${pair}`} x1={ax} y1={ay} x2={px} y2={py}
          stroke={cA} strokeWidth={nA.won ? 2.5 : 1.5} opacity={nA.lost ? 0.3 : 1}
        />,
        <line key={`lb-${layer}-${pair}`} x1={bx} y1={by} x2={px} y2={py}
          stroke={cB} strokeWidth={nB.won ? 2.5 : 1.5} opacity={nB.lost ? 0.3 : 1}
        />
      );

      // Outer pair bracket arc — visually groups the two opponents
      if (layer === 0) {
        const arcR = RADII[0] + NODE_R[0] + 10;
        const degA = (pair * 2)     * (360 / 32) - 90;
        const degB = (pair * 2 + 1) * (360 / 32) - 90;
        const radA = (degA * Math.PI) / 180;
        const radB = (degB * Math.PI) / 180;
        const x1 = CX + arcR * Math.cos(radA), y1 = CY + arcR * Math.sin(radA);
        const x2 = CX + arcR * Math.cos(radB), y2 = CY + arcR * Math.sin(radB);
        const arcColor = nA.won || nB.won ? '#22c55e' : isHovered ? '#3b82f6' : '#1e3a5f';
        lines.push(
          <path key={`arc-${pair}`}
            d={`M ${x1} ${y1} A ${arcR} ${arcR} 0 0 1 ${x2} ${y2}`}
            fill="none" stroke={arcColor} strokeWidth={2}
            opacity={(nA.lost && nB.lost) ? 0.2 : 0.7}
          />
        );
      }

      // Score label at midpoint between the two opponents
      const m = byRound[matchRound];
      if (m && m.homeScore != null && m.status !== 'SCHEDULED') {
        const mx = (ax + bx) / 2;
        const my = (ay + by) / 2;
        const scoreText = m.homePenalties != null
          ? `${m.homeScore}-${m.awayScore} (${m.homePenalties}-${m.awayPenalties}p)`
          : `${m.homeScore}-${m.awayScore}`;
        scoreLabels.push(
          <text key={`sc-${layer}-${pair}`} x={mx} y={my}
            textAnchor="middle"
            fontSize={layer === 0 ? 8 : layer === 1 ? 9.5 : 11}
            fill={m.status === 'LIVE' ? '#f87171' : '#94a3b8'}
            fontFamily="monospace" fontWeight="bold"
          >
            {scoreText}
          </text>
        );
      }

      // Clickable hit area: transparent circle at midpoint of the two opponents
      if (m) {
        const mx  = (ax + bx) / 2;
        const my  = (ay + by) / 2;
        const hitR = layer === 0 ? 18 : layer === 1 ? 22 : 26;
        hitAreas.push(
          <circle key={`hit-${layer}-${pair}`} cx={mx} cy={my} r={hitR}
            fill="transparent"
            style={{ cursor: 'pointer' }}
            onClick={() => setEditingMatch(m)}
            onMouseEnter={() => setHoveredRound(matchRound)}
            onMouseLeave={() => setHoveredRound(null)}
          />
        );
        // Edit pencil indicator on hover or finished
        if (isHovered) {
          circles.push(
            <g key={`pen-${layer}-${pair}`} style={{ pointerEvents: 'none' }}>
              <circle cx={mx} cy={my} r={9} fill="#1e40af" opacity={0.9} />
              <text x={mx} y={my + 3.5} textAnchor="middle" fontSize={11} fill="white">✎</text>
            </g>
          );
        }
      }
    }
  }

  // ── Nodes ─────────────────────────────────────────────────────────────────
  for (let layer = 0; layer <= 4; layer++) {
    const r = NODE_R[layer];
    for (let slot = 0; slot < SLOT_CNT[layer]; slot++) {
      const [x, y] = slotXY(layer, slot);
      const info   = nodes[`${layer}-${slot}`];
      const cpId   = `cp-${layer}-${slot}`;
      const isH    = hoveredRound === info.matchRound;
      const m      = byRound[info.matchRound];

      clipDefs.push(
        <clipPath key={cpId} id={cpId}>
          <circle cx={x} cy={y} r={r - 1} />
        </clipPath>
      );

      const isDrop = dropTarget?.layer === layer && dropTarget?.slot === slot;
      const isDragSrc = drag?.srcLayer === layer && drag?.srcSlot === slot;
      const bg     = isDrop ? '#1e3a5f' : !info.team ? '#0f172a' : info.lost ? '#131c2e' : '#1e293b';
      const border = isDrop ? '#60a5fa' : info.won ? '#22c55e' : isH ? '#3b82f6' : info.lost ? '#1e293b' : info.team ? '#3f5068' : '#1e293b';
      const bw     = isDrop ? 3 : info.won || isH ? 2.5 : 1.5;

      if (info.won) {
        circles.push(
          <circle key={`glow-${layer}-${slot}`} cx={x} cy={y} r={r + 5}
            fill="none" stroke="#22c55e" strokeWidth={1.5} opacity={0.3}
          />
        );
      }

      circles.push(
        <g key={`n-${layer}-${slot}`}
          style={{ cursor: info.team ? 'grab' : (m ? 'pointer' : 'default') }}
          onMouseDown={(e) => {
            if (!info.team || !m) return;
            e.preventDefault();
            const { x: sx, y: sy } = toSVG(e);
            setDrag({
              srcLayer: layer, srcSlot: slot,
              team: info.team, matchId: m.id,
              side: slot % 2 === 0 ? 'home' : 'away',
              svgX: sx, svgY: sy, startX: sx, startY: sy,
            });
          }}
          onMouseEnter={() => {
            if (drag && m && !(drag.srcLayer === layer && drag.srcSlot === slot)) {
              setDropTarget({ layer, slot });
            } else if (!drag && m) {
              setHoveredRound(info.matchRound);
            }
          }}
          onMouseLeave={() => {
            if (drag) setDropTarget(null);
            else setHoveredRound(null);
          }}
        >
          <circle cx={x} cy={y} r={r} fill={bg} stroke={border} strokeWidth={bw} />
          {info.team?.flagUrl && !isDragSrc && (
            <image href={info.team.flagUrl}
              x={x - r + 1} y={y - r + 1}
              width={(r - 1) * 2} height={(r - 1) * 2}
              clipPath={`url(#${cpId})`}
              preserveAspectRatio="xMidYMid slice"
              opacity={info.lost ? 0.2 : 1}
            />
          )}
          {isDragSrc && (
            <text x={x} y={y + 4} textAnchor="middle" fill="#475569" fontSize={10} fontFamily="monospace">···</text>
          )}
          {!info.team && (
            <text x={x} y={y + 4} textAnchor="middle" fill="#334155" fontSize={10} fontFamily="monospace">?</text>
          )}
          {info.team && layer <= 2 && !isDragSrc && (
            <text x={x} y={y + r + 13}
              textAnchor="middle"
              fontSize={layer === 0 ? 9 : layer === 1 ? 10.5 : 11}
              fill={info.lost ? '#2d3748' : info.won ? '#86efac' : '#8ca5c2'}
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

  // ── Stage labels ──────────────────────────────────────────────────────────
  const stageEls = RADII.map((r, layer) => {
    const deg = -135;
    const rad = (deg * Math.PI) / 180;
    const lx  = CX + (r - NODE_R[layer] - 14) * Math.cos(rad);
    const ly  = CY + (r - NODE_R[layer] - 14) * Math.sin(rad);
    return (
      <text key={`sl-${layer}`} x={lx} y={ly}
        textAnchor="middle" fontSize={10}
        fill="#475569" fontFamily="sans-serif" fontWeight="bold" letterSpacing={0.8}
      >
        {STAGE_LABELS[layer]}
      </text>
    );
  });

  return (
    <>
      {editingMatch && (
        <EditModal
          match={editingMatch}
          onClose={() => setEditingMatch(null)}
          onSaved={() => setEditingMatch(null)}
        />
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Tocá cualquier partido para editar · auto-refresh 2 min
          </p>
          <button onClick={() => refetch()} disabled={isFetching}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors disabled:opacity-50">
            {isFetching ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>

        <div className="bg-slate-950 rounded-2xl overflow-hidden">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${S} ${S}`}
            style={{ width: '100%', maxHeight: '85vh', display: 'block', userSelect: 'none' }}
            onMouseMove={(e) => {
              if (!drag) return;
              const { x, y } = toSVG(e);
              setDrag(prev => prev ? { ...prev, svgX: x, svgY: y } : null);
            }}
            onMouseUp={(e) => {
              if (!drag) return;
              const { x, y } = toSVG(e);
              const moved = Math.hypot(x - drag.startX, y - drag.startY);
              if (moved < 8) {
                const m = byRound[matchRoundFor(drag.srcLayer, drag.srcSlot)];
                if (m) setEditingMatch(m);
              } else if (dropTarget) {
                handleSwap(drag, dropTarget, byRound);
              }
              setDrag(null);
              setDropTarget(null);
            }}
            onMouseLeave={() => { setDrag(null); setDropTarget(null); }}
          >
            <defs>{clipDefs}</defs>

            <rect width={S} height={S} fill="#020617" />

            {/* Ring bands */}
            {RADII.map((r, i) => (
              <circle key={`band-${i}`} cx={CX} cy={CY} r={r}
                fill="none" stroke="#0d1829" strokeWidth={NODE_R[i] * 2 + 10}
              />
            ))}
            {RADII.map((r, i) => (
              <circle key={`ring-${i}`} cx={CX} cy={CY} r={r}
                fill="none" stroke="#1e293b" strokeWidth={0.75}
              />
            ))}

            {lines}
            {scoreLabels}
            {stageEls}
            {circles}
            {hitAreas}

            {/* Center trophy */}
            <circle cx={CX} cy={CY} r={44} fill="#0a1220" stroke="#78350f" strokeWidth={1.5} />
            <circle cx={CX} cy={CY} r={39} fill="#0f172a" stroke="#d97706" strokeWidth={1} />
            <text x={CX} y={CY - 4} textAnchor="middle" fontSize={26}>🏆</text>
            <text x={CX} y={CY + 17} textAnchor="middle" fill="#d97706"
              fontSize={9} fontWeight="bold" fontFamily="sans-serif" letterSpacing={1.5}>
              2026
            </text>

            {/* Drag ghost */}
            {drag && (
              <g style={{ pointerEvents: 'none' }}>
                <circle cx={drag.svgX} cy={drag.svgY} r={28}
                  fill="#1e293b" stroke="#60a5fa" strokeWidth={2.5} opacity={0.9} />
                {drag.team?.flagUrl && (
                  <image href={drag.team.flagUrl}
                    x={drag.svgX - 27} y={drag.svgY - 27}
                    width={54} height={54}
                    clipPath="url(#ghost-clip)"
                    preserveAspectRatio="xMidYMid slice"
                  />
                )}
                <clipPath id="ghost-clip">
                  <circle cx={drag.svgX} cy={drag.svgY} r={27} />
                </clipPath>
                <text x={drag.svgX} y={drag.svgY + 41}
                  textAnchor="middle" fontSize={11} fill="#60a5fa"
                  fontFamily="monospace" fontWeight="bold">
                  {drag.team?.code ?? '?'}
                </text>
              </g>
            )}
          </svg>
        </div>
      </div>
    </>
  );
}
