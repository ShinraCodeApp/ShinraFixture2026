import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Swords, RefreshCw, Shield } from 'lucide-react';
import { adminApi } from '../services/adminApi';
import { BracketCircle } from './BracketCircle';

// Round of 32 matchups (from image bracket + actual results)
// R85 excluded — Argentina's 3rd-place opponent can't be read from image; fix via drag-and-drop
const R32_ACTUAL = [
  { round: 73, homeCode: 'RSA', awayCode: 'CAN' }, // South Africa vs Canada → CAN wins → R89
  { round: 74, homeCode: 'NED', awayCode: 'MAR' }, // Netherlands vs Morocco → MAR wins → R89
  { round: 75, homeCode: 'GER', awayCode: 'PAR' }, // Germany vs Paraguay → PAR wins → R90
  { round: 76, homeCode: 'FRA', awayCode: 'SWE' }, // France vs Sweden → FRA wins → R90
  { round: 77, homeCode: 'BRA', awayCode: 'JPN' }, // Brazil vs Japan → BRA wins → R91
  { round: 78, homeCode: 'IRL', awayCode: 'NOR' }, // Ireland vs Norway → NOR wins → R91
  { round: 79, homeCode: 'MEX', awayCode: 'ECU' }, // Mexico vs Ecuador → MEX wins → R92
  { round: 80, homeCode: 'ENG', awayCode: 'COD' }, // England vs DR Congo → ENG wins → R92
  { round: 81, homeCode: 'POR', awayCode: 'CRO' }, // Portugal vs Croatia → POR wins → R93
  { round: 82, homeCode: 'ESP', awayCode: 'AUT' }, // Spain vs Austria → ESP wins → R93
  { round: 83, homeCode: 'USA', awayCode: 'BIH' }, // USA vs Bosnia → USA wins → R94
  { round: 84, homeCode: 'BEL', awayCode: 'SEN' }, // Belgium vs Senegal → BEL wins → R94
  { round: 85, homeCode: 'ARG', awayCode: 'CPV' }, // Argentina vs Cape Verde → ARG wins → R95
  { round: 86, homeCode: 'AUS', awayCode: 'EGY' }, // Australia vs Egypt → EGY wins → R95
  { round: 87, homeCode: 'SUI', awayCode: 'ALG' }, // Switzerland vs Algeria → SUI wins → R96
  { round: 88, homeCode: 'COL', awayCode: 'GHA' }, // Colombia vs Ghana → COL wins → R96
];

const R16_ACTUAL = [
  // home = equipo que viene del par "izquierdo" en el bracket circular (OUTER_R32 pos par)
  { round: 89, homeCode: 'MAR', awayCode: 'CAN', matchDate: '2026-07-04T17:00:00Z' }, // MAR(R74) + CAN(R73)
  { round: 90, homeCode: 'FRA', awayCode: 'PAR', matchDate: '2026-07-04T21:00:00Z' }, // FRA(R76) + PAR(R75)
  { round: 91, homeCode: 'BRA', awayCode: 'NOR', matchDate: '2026-07-05T20:00:00Z' }, // BRA(R77) + NOR(R78)
  { round: 92, homeCode: 'MEX', awayCode: 'ENG', matchDate: '2026-07-06T00:00:00Z' }, // MEX(R79) + ENG(R80)
  { round: 93, homeCode: 'ESP', awayCode: 'POR', matchDate: '2026-07-06T19:00:00Z' }, // ESP(R82) + POR(R81)
  { round: 94, homeCode: 'BEL', awayCode: 'USA', matchDate: '2026-07-07T00:00:00Z' }, // BEL(R84) + USA(R83)
  { round: 95, homeCode: 'ARG', awayCode: 'EGY', matchDate: '2026-07-07T16:00:00Z' }, // ARG(R85) + EGY(R86)
  { round: 96, homeCode: 'COL', awayCode: 'SUI', matchDate: '2026-07-07T20:00:00Z' }, // COL(R88) + SUI(R87)
];

interface BMatch {
  id: string;
  round: number;
  stage: string;
  homeTeam: { code: string; name: string; flagUrl?: string } | null;
  awayTeam: { code: string; name: string; flagUrl?: string } | null;
  homeScore: number | null;
  awayScore: number | null;
  homePenalties: number | null;
  awayPenalties: number | null;
  status: string;
}

function getWinner(m: BMatch): 'home' | 'away' | null {
  if (m.status !== 'FINISHED') return null;
  if (m.homePenalties != null && m.awayPenalties != null)
    return m.homePenalties > m.awayPenalties ? 'home' : 'away';
  if (m.homeScore != null && m.awayScore != null) {
    if (m.homeScore > m.awayScore) return 'home';
    if (m.awayScore > m.homeScore) return 'away';
  }
  return null;
}

function MatchCard({ m, compact = false }: { m: BMatch | undefined; compact?: boolean }) {
  if (!m) return (
    <div className={`bg-slate-800/50 rounded-xl border border-slate-700/50 ${compact ? 'p-2' : 'p-3'}`}>
      <TeamRow code="TBD" name="Por definir" score={null} pen={null} isWinner={false} compact={compact} />
      <div className="border-t border-slate-700/50 my-1" />
      <TeamRow code="TBD" name="Por definir" score={null} pen={null} isWinner={false} compact={compact} />
    </div>
  );

  const winner = getWinner(m);
  const finished = m.status === 'FINISHED';

  return (
    <div className={`bg-slate-800 rounded-xl border ${finished ? 'border-slate-600' : 'border-slate-700'} ${compact ? 'p-2' : 'p-3'} min-w-[130px]`}>
      <TeamRow
        code={m.homeTeam?.code ?? 'TBD'}
        name={m.homeTeam?.name ?? ''}
        flagUrl={m.homeTeam?.flagUrl}
        score={m.homeScore}
        pen={m.homePenalties}
        isWinner={winner === 'home'}
        compact={compact}
      />
      <div className="border-t border-slate-700/40 my-1" />
      <TeamRow
        code={m.awayTeam?.code ?? 'TBD'}
        name={m.awayTeam?.name ?? ''}
        flagUrl={m.awayTeam?.flagUrl}
        score={m.awayScore}
        pen={m.awayPenalties}
        isWinner={winner === 'away'}
        compact={compact}
      />
      {!finished && m.homeTeam && (
        <p className="text-[9px] text-slate-500 text-center mt-1 uppercase tracking-wider">Pendiente</p>
      )}
    </div>
  );
}

function TeamRow({ code, name, flagUrl, score, pen, isWinner, compact }: {
  code: string; name: string; flagUrl?: string; score: number | null; pen: number | null; isWinner: boolean; compact: boolean;
}) {
  return (
    <div className={`flex items-center gap-1.5 ${compact ? 'py-0.5' : 'py-1'}`}>
      {flagUrl
        ? <img src={flagUrl} className="w-5 h-3.5 object-contain rounded flex-shrink-0" />
        : <div className="w-5 h-3.5 bg-slate-700 rounded flex-shrink-0" />}
      <span className={`text-xs flex-1 truncate ${isWinner ? 'font-black text-white' : 'text-slate-400'}`}>
        {code === 'TBD' ? <span className="text-slate-600">TBD</span> : code}
      </span>
      {score != null && (
        <span className={`text-xs font-bold tabular-nums ${isWinner ? 'text-white' : 'text-slate-500'}`}>
          {score}{pen != null ? <span className="text-[9px] text-slate-400">({pen})</span> : ''}
        </span>
      )}
    </div>
  );
}

// Bracket structure: [homeRound, awayRound] pairs per stage
const BRACKET: { label: string; stage: string; next: string; pairs: [number, number][] }[] = [
  {
    label: '16avos', stage: 'ROUND_OF_32', next: 'ROUND_OF_16',
    pairs: [[73,74],[75,76],[77,78],[79,80],[81,82],[83,84],[85,86],[87,88]],
  },
  {
    label: 'Octavos', stage: 'ROUND_OF_16', next: 'QUARTER_FINAL',
    pairs: [[89,90],[91,92],[93,94],[95,96]],
  },
  {
    label: 'Cuartos', stage: 'QUARTER_FINAL', next: 'SEMI_FINAL',
    pairs: [[97,98],[99,100]],
  },
  {
    label: 'Semifinal', stage: 'SEMI_FINAL', next: 'FINAL',
    pairs: [[101,102]],
  },
];

const FINAL_ROUND = 104;

function BracketColumn({ label, pairs, byRound, compact }: {
  label: string;
  pairs: [number, number][];
  byRound: Record<number, BMatch>;
  compact: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 flex-shrink-0">
      <p className="text-center text-xs font-bold text-primary-400 uppercase tracking-widest mb-2">{label}</p>
      <div className="flex flex-col" style={{ gap: compact ? '8px' : '12px' }}>
        {pairs.map(([r1, r2]) => (
          <div key={r1} className="flex flex-col" style={{ gap: compact ? '4px' : '6px' }}>
            <MatchCard m={byRound[r1]} compact={compact} />
            <MatchCard m={byRound[r2]} compact={compact} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function BracketPage() {
  const qc = useQueryClient();
  const [view, setView] = useState<'linear' | 'circular'>('circular');
  const [fixingR16, setFixingR16] = useState(false);
  const [fixingR32, setFixingR32] = useState(false);
  const [fixMsg, setFixMsg] = useState<string | null>(null);

  const handleFixR16 = async () => {
    setFixingR16(true);
    setFixMsg(null);
    try {
      const result = await adminApi.fixKnockoutTeams(R16_ACTUAL);
      const ok = result?.results?.filter((r: string) => r.startsWith('OK')).length ?? 0;
      setFixMsg(`✓ ${ok}/8 octavos corregidos`);
      qc.invalidateQueries({ queryKey: ['admin-bracket'] });
      qc.invalidateQueries({ queryKey: ['admin-bracket-circular'] });
      qc.invalidateQueries({ queryKey: ['admin-tournament-status'] });
    } catch {
      setFixMsg('Error al corregir');
    } finally {
      setFixingR16(false);
      setTimeout(() => setFixMsg(null), 5000);
    }
  };

  const handleFixR32 = async () => {
    setFixingR32(true);
    setFixMsg(null);
    try {
      const result = await adminApi.fixKnockoutTeams(R32_ACTUAL, 'ROUND_OF_32');
      const ok = result?.results?.filter((r: string) => r.startsWith('OK')).length ?? 0;
      setFixMsg(`✓ ${ok}/${R32_ACTUAL.length} 16avos corregidos`);
      qc.invalidateQueries({ queryKey: ['admin-bracket'] });
      qc.invalidateQueries({ queryKey: ['admin-bracket-circular'] });
    } catch {
      setFixMsg('Error al corregir 16avos');
    } finally {
      setFixingR32(false);
      setTimeout(() => setFixMsg(null), 8000);
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ['admin-bracket'],
    queryFn: () => adminApi.getMatches({ stage: 'knockout', limit: '200' }),
    staleTime: 60_000,
  });

  const matches: BMatch[] = data?.data?.items ?? [];
  const byRound: Record<number, BMatch> = {};
  for (const m of matches) byRound[m.round] = m;

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-pulse text-slate-400">Cargando bracket...</div>
    </div>
  );

  const finalMatch = byRound[FINAL_ROUND];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Llaves del Mundial 2026</h1>
          <p className="text-slate-500 text-sm">Fase eliminatoria — 48 equipos</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {fixMsg && (
            <span className={`text-xs font-medium px-3 py-1.5 rounded-lg ${fixMsg.startsWith('✓') ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400' : 'bg-red-100 text-red-700'}`}>
              {fixMsg}
            </span>
          )}
          <button
            onClick={handleFixR32}
            disabled={fixingR32}
            title="Asigna los equipos reales a los 16avos (R73-R88) según el bracket oficial"
            className="flex items-center gap-2 px-4 py-2 bg-sky-700 hover:bg-sky-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <Shield size={14} />
            {fixingR32 ? 'Corrigiendo...' : 'Fix 16vos'}
          </button>
          <button
            onClick={handleFixR16}
            disabled={fixingR16}
            title="Asigna los equipos reales a los octavos (R89-R96) y elimina duplicados"
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <Swords size={14} />
            {fixingR16 ? 'Corrigiendo...' : 'Fix Octavos'}
          </button>
          <div className="flex gap-1 bg-slate-800 rounded-xl p-1">
            <button
              onClick={() => setView('circular')}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                view === 'circular' ? 'bg-primary-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              🌐 Circular
            </button>
            <button
              onClick={() => setView('linear')}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                view === 'linear' ? 'bg-primary-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              ≡ Lista
            </button>
          </div>
        </div>
      </div>

      {view === 'circular' && <BracketCircle />}

      {view === 'linear' && (
      <>

      <div className="bg-slate-900 rounded-2xl p-6 overflow-x-auto">
        <div className="flex gap-4 items-start min-w-max">
          {/* 16avos — split upper/lower */}
          <div className="flex flex-col gap-1 flex-shrink-0">
            <p className="text-center text-xs font-bold text-primary-400 uppercase tracking-widest mb-2">16avos</p>
            <div className="flex flex-col gap-3">
              {BRACKET[0].pairs.slice(0, 4).map(([r1, r2]) => (
                <div key={r1} className="flex flex-col gap-1.5">
                  <MatchCard m={byRound[r1]} />
                  <MatchCard m={byRound[r2]} />
                </div>
              ))}
            </div>
          </div>

          {/* Connector */}
          <div className="self-stretch flex flex-col justify-around py-8">
            {[0,1,2,3].map(i => <div key={i} className="w-4 border-t border-dashed border-slate-600" />)}
          </div>

          {/* Octavos upper */}
          <div className="flex flex-col gap-1 flex-shrink-0">
            <p className="text-center text-xs font-bold text-primary-400 uppercase tracking-widest mb-2">Octavos</p>
            <div className="flex flex-col gap-[52px]">
              {BRACKET[1].pairs.slice(0, 2).map(([r1, r2]) => (
                <div key={r1} className="flex flex-col gap-1.5">
                  <MatchCard m={byRound[r1]} />
                  <MatchCard m={byRound[r2]} />
                </div>
              ))}
            </div>
          </div>

          <div className="self-stretch flex flex-col justify-around py-16">
            {[0,1].map(i => <div key={i} className="w-4 border-t border-dashed border-slate-600" />)}
          </div>

          {/* Cuartos upper */}
          <div className="flex flex-col gap-1 flex-shrink-0">
            <p className="text-center text-xs font-bold text-primary-400 uppercase tracking-widest mb-2">Cuartos</p>
            <div className="flex flex-col gap-[160px]">
              <div className="flex flex-col gap-1.5">
                <MatchCard m={byRound[97]} />
                <MatchCard m={byRound[98]} />
              </div>
            </div>
          </div>

          <div className="self-stretch flex flex-col justify-around py-32">
            <div className="w-4 border-t border-dashed border-slate-600" />
          </div>

          {/* Semi + Final */}
          <div className="flex flex-col gap-1 flex-shrink-0">
            <p className="text-center text-xs font-bold text-primary-400 uppercase tracking-widest mb-2">Semi</p>
            <div className="flex flex-col gap-[300px]">
              <div className="flex flex-col gap-1.5">
                <MatchCard m={byRound[101]} />
              </div>
            </div>
          </div>

          <div className="self-stretch flex flex-col justify-center">
            <div className="w-4 border-t border-dashed border-yellow-500/50" />
          </div>

          {/* Final */}
          <div className="flex flex-col gap-1 flex-shrink-0 self-center">
            <p className="text-center text-xs font-black text-yellow-400 uppercase tracking-widest mb-2">⚽ Final</p>
            <MatchCard m={finalMatch} />
          </div>

          <div className="self-stretch flex flex-col justify-center">
            <div className="w-4 border-t border-dashed border-yellow-500/50" />
          </div>

          {/* Semi lower */}
          <div className="flex flex-col gap-1 flex-shrink-0">
            <p className="text-center text-xs font-bold text-primary-400 uppercase tracking-widest mb-2">Semi</p>
            <div className="flex flex-col gap-[300px]">
              <div className="flex flex-col gap-1.5">
                <MatchCard m={byRound[102]} />
              </div>
            </div>
          </div>

          <div className="self-stretch flex flex-col justify-around py-32">
            <div className="w-4 border-t border-dashed border-slate-600" />
          </div>

          {/* Cuartos lower */}
          <div className="flex flex-col gap-1 flex-shrink-0">
            <p className="text-center text-xs font-bold text-primary-400 uppercase tracking-widest mb-2">Cuartos</p>
            <div className="flex flex-col gap-[160px]">
              <div className="flex flex-col gap-1.5">
                <MatchCard m={byRound[99]} />
                <MatchCard m={byRound[100]} />
              </div>
            </div>
          </div>

          <div className="self-stretch flex flex-col justify-around py-16">
            {[0,1].map(i => <div key={i} className="w-4 border-t border-dashed border-slate-600" />)}
          </div>

          {/* Octavos lower */}
          <div className="flex flex-col gap-1 flex-shrink-0">
            <p className="text-center text-xs font-bold text-primary-400 uppercase tracking-widest mb-2">Octavos</p>
            <div className="flex flex-col gap-[52px]">
              {BRACKET[1].pairs.slice(2, 4).map(([r1, r2]) => (
                <div key={r1} className="flex flex-col gap-1.5">
                  <MatchCard m={byRound[r1]} />
                  <MatchCard m={byRound[r2]} />
                </div>
              ))}
            </div>
          </div>

          <div className="self-stretch flex flex-col justify-around py-8">
            {[0,1,2,3].map(i => <div key={i} className="w-4 border-t border-dashed border-slate-600" />)}
          </div>

          {/* 16avos lower */}
          <div className="flex flex-col gap-1 flex-shrink-0">
            <p className="text-center text-xs font-bold text-primary-400 uppercase tracking-widest mb-2">16avos</p>
            <div className="flex flex-col gap-3">
              {BRACKET[0].pairs.slice(4, 8).map(([r1, r2]) => (
                <div key={r1} className="flex flex-col gap-1.5">
                  <MatchCard m={byRound[r1]} />
                  <MatchCard m={byRound[r2]} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
