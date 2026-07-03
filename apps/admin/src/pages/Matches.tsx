import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, CheckSquare, Edit3, Search } from 'lucide-react';
import dayjs from 'dayjs';
import { adminApi } from '../services/adminApi';

interface MatchRow {
  id: string;
  homeTeam: { name: string; code: string; flagUrl?: string } | null;
  awayTeam: { name: string; code: string; flagUrl?: string } | null;
  homeScore?: number;
  awayScore?: number;
  homePenalties?: number;
  awayPenalties?: number;
  matchDate: string;
  status: string;
  stage: string;
  group?: string;
  round?: number;
  venue?: string;
}

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-400',
  LIVE: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400',
  HALF_TIME: 'bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400',
  FINISHED: 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400',
  POSTPONED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400',
};

const STATUS_OPTIONS = ['SCHEDULED', 'LIVE', 'HALF_TIME', 'FINISHED', 'POSTPONED'];

function EditMatchModal({ match, onClose }: { match: MatchRow; onClose: () => void }) {
  const qc = useQueryClient();
  const [homeScore, setHomeScore] = useState(String(match.homeScore ?? ''));
  const [awayScore, setAwayScore] = useState(String(match.awayScore ?? ''));
  const [status, setStatus] = useState(match.status);
  const [hasPenalties, setHasPenalties] = useState(
    match.homePenalties != null || match.awayPenalties != null
  );
  const [homePen, setHomePen] = useState(String(match.homePenalties ?? ''));
  const [awayPen, setAwayPen] = useState(String(match.awayPenalties ?? ''));

  const saveMut = useMutation({
    mutationFn: () => {
      const data: Record<string, unknown> = { status };
      if (homeScore !== '') data.homeScore = Number(homeScore);
      if (awayScore !== '') data.awayScore = Number(awayScore);
      if (hasPenalties && homePen !== '' && awayPen !== '') {
        data.homePenalties = Number(homePen);
        data.awayPenalties = Number(awayPen);
      } else {
        data.homePenalties = null;
        data.awayPenalties = null;
      }
      return adminApi.editMatchFull(match.id, data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-matches'] });
      qc.invalidateQueries({ queryKey: ['admin-tournament-status'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold dark:text-white mb-1">Editar Partido</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          {match.homeTeam?.code ?? 'TBD'} vs {match.awayTeam?.code ?? 'TBD'}
          {match.round ? ` · R${match.round}` : ''}
          {' · '}{dayjs(match.matchDate).format('D MMM HH:mm')}
        </p>

        {/* Estado */}
        <div className="mb-4">
          <label className="block text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider mb-2">Estado</label>
          <div className="grid grid-cols-3 gap-1.5">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`py-1.5 rounded-lg text-xs font-bold border-2 transition-all
                  ${status === s ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-200 dark:border-slate-600 text-gray-500 dark:text-gray-400 hover:border-blue-300'}`}
              >
                {s === 'SCHEDULED' ? 'Prog.' : s === 'HALF_TIME' ? 'Descanso' : s === 'FINISHED' ? 'Final' : s === 'POSTPONED' ? 'Posterg.' : s}
              </button>
            ))}
          </div>
        </div>

        {/* Marcador */}
        <div className="mb-4">
          <label className="block text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider mb-2">Marcador</label>
          <div className="flex items-center gap-3">
            <div className="flex-1 text-center">
              <p className="text-xs text-gray-400 mb-1">{match.homeTeam?.code ?? 'TBD'}</p>
              <input
                type="number" min="0" value={homeScore}
                onChange={(e) => setHomeScore(e.target.value)}
                className="w-full text-center text-2xl font-black border dark:border-slate-600 rounded-xl py-3 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <span className="text-gray-400 font-bold text-xl">-</span>
            <div className="flex-1 text-center">
              <p className="text-xs text-gray-400 mb-1">{match.awayTeam?.code ?? 'TBD'}</p>
              <input
                type="number" min="0" value={awayScore}
                onChange={(e) => setAwayScore(e.target.value)}
                className="w-full text-center text-2xl font-black border dark:border-slate-600 rounded-xl py-3 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Penales */}
        <div className="mb-5">
          <label className="flex items-center gap-2 cursor-pointer select-none mb-2">
            <input
              type="checkbox" checked={hasPenalties}
              onChange={(e) => setHasPenalties(e.target.checked)}
              className="rounded"
            />
            <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">Definición por penales</span>
          </label>
          {hasPenalties && (
            <div className="flex items-center gap-3">
              <input
                type="number" min="0" value={homePen}
                onChange={(e) => setHomePen(e.target.value)}
                placeholder="0"
                className="flex-1 text-center text-xl font-bold border dark:border-slate-600 rounded-xl py-2 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-400 font-bold">-</span>
              <input
                type="number" min="0" value={awayPen}
                onChange={(e) => setAwayPen(e.target.value)}
                placeholder="0"
                className="flex-1 text-center text-xl font-bold border dark:border-slate-600 rounded-xl py-2 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 dark:text-white text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending}
            className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white text-sm font-bold transition-colors">
            {saveMut.isPending ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function MatchesPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [editMatch, setEditMatch] = useState<MatchRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-matches', filter],
    queryFn: () => adminApi.getMatches(filter !== 'ALL' ? { status: filter } : {}),
    refetchInterval: 30_000,
  });

  const startMutation = useMutation({
    mutationFn: (id: string) => adminApi.startMatch(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-matches'] }),
  });

  const finishMutation = useMutation({
    mutationFn: (id: string) => adminApi.finishMatch(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-matches'] }),
  });

  const allMatches: MatchRow[] = data?.data?.items ?? [];
  const matches = search
    ? allMatches.filter((m) =>
        m.homeTeam.code.toLowerCase().includes(search.toLowerCase()) ||
        m.awayTeam.code.toLowerCase().includes(search.toLowerCase()) ||
        m.homeTeam.name.toLowerCase().includes(search.toLowerCase()) ||
        m.awayTeam.name.toLowerCase().includes(search.toLowerCase())
      )
    : allMatches;

  const filters = ['ALL', 'SCHEDULED', 'LIVE', 'FINISHED'];

  return (
    <div className="space-y-6">
      {editMatch && <EditMatchModal match={editMatch} onClose={() => setEditMatch(null)} />}

      <div>
        <h1 className="text-2xl font-bold dark:text-white">Partidos</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Gestión y actualización de resultados</p>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {filters.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors
              ${filter === f ? 'bg-primary-500 text-white' : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>
            {f === 'ALL' ? 'Todos' : f}
          </button>
        ))}
        <div className="relative ml-auto">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text" value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar equipo..."
            className="pl-8 pr-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-48"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-700">
                {['Ronda', 'Partido', 'Marcador', 'Fase', 'Estado', 'Acciones'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50 dark:border-slate-700/50">
                      {Array.from({ length: 6 }).map((__, j) => (
                        <td key={j} className="px-4 py-3"><div className="animate-pulse h-4 bg-gray-100 dark:bg-slate-700 rounded" /></td>
                      ))}
                    </tr>
                  ))
                : matches.map((m) => (
                    <tr key={m.id} className="border-b border-gray-50 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/20 transition-colors">
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                        {m.round ? `R${m.round}` : '—'}<br />
                        <span className="text-gray-400">{dayjs(m.matchDate).format('D MMM HH:mm')}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {m.homeTeam?.flagUrl && <img src={m.homeTeam.flagUrl} className="w-5 h-3.5 object-contain rounded" />}
                          <span className="font-bold dark:text-white">{m.homeTeam?.code ?? 'TBD'}</span>
                          <span className="text-gray-400 text-xs">vs</span>
                          <span className="font-bold dark:text-white">{m.awayTeam?.code ?? 'TBD'}</span>
                          {m.awayTeam?.flagUrl && <img src={m.awayTeam.flagUrl} className="w-5 h-3.5 object-contain rounded" />}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold dark:text-white">
                        {m.homeScore != null
                          ? <>
                              {m.homeScore}-{m.awayScore}
                              {m.homePenalties != null && (
                                <span className="text-xs text-gray-400 ml-1">({m.homePenalties}-{m.awayPenalties}p)</span>
                              )}
                            </>
                          : <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                        {m.stage === 'GROUP' ? `Grupo ${m.group}` : m.stage?.replace(/_/g, ' ')}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_COLORS[m.status] ?? STATUS_COLORS.SCHEDULED}`}>
                          {m.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {m.status === 'SCHEDULED' && (
                            <button onClick={() => startMutation.mutate(m.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-950/20 transition-colors" title="Iniciar partido">
                              <Play size={14} />
                            </button>
                          )}
                          {m.status === 'LIVE' && (
                            <button onClick={() => finishMutation.mutate(m.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/20 transition-colors" title="Finalizar partido">
                              <CheckSquare size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => setEditMatch(m)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors" title="Editar resultado">
                            <Edit3 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
