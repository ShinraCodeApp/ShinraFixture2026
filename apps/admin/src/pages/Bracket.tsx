import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../services/adminApi';
import { BracketCircle } from './BracketCircle';

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
  const [view, setView] = useState<'linear' | 'circular'>('circular');

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
        <div className="flex gap-1 bg-slate-800 rounded-xl p-1 flex-shrink-0">
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
