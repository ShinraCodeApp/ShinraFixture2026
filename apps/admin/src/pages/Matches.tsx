import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, CheckSquare, Edit3 } from 'lucide-react';
import dayjs from 'dayjs';
import { adminApi } from '../services/adminApi';

interface MatchRow {
  id: string;
  homeTeam: { name: string; code: string };
  awayTeam: { name: string; code: string };
  homeScore?: number;
  awayScore?: number;
  matchDate: string;
  status: string;
  stage: string;
  group?: string;
  venue?: string;
}

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-400',
  LIVE: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400',
  HALF_TIME: 'bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400',
  FINISHED: 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400',
  POSTPONED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400',
};

export function MatchesPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('ALL');
  const [editMatch, setEditMatch] = useState<MatchRow | null>(null);
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-matches', filter],
    queryFn: () => adminApi.getMatches(filter !== 'ALL' ? { status: filter } : {}),
  });

  const startMutation = useMutation({
    mutationFn: (id: string) => adminApi.startMatch(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-matches'] }),
  });

  const finishMutation = useMutation({
    mutationFn: (id: string) => adminApi.finishMatch(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-matches'] }),
  });

  const scoreMutation = useMutation({
    mutationFn: ({ id, hs, as }: { id: string; hs: number; as: number }) =>
      adminApi.updateMatchScore(id, { homeScore: hs, awayScore: as, status: 'LIVE' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-matches'] }); setEditMatch(null); },
  });

  const matches: MatchRow[] = data?.data ?? [];
  const filters = ['ALL', 'SCHEDULED', 'LIVE', 'FINISHED'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold dark:text-white">Partidos</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Gestión y actualización de resultados</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {filters.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors
              ${filter === f ? 'bg-primary-500 text-white' : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>
            {f === 'ALL' ? 'Todos' : f}
          </button>
        ))}
      </div>

      {/* Score edit modal */}
      {editMatch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-bold dark:text-white mb-1">Actualizar Marcador</h2>
            <p className="text-sm text-gray-500 mb-4">{editMatch.homeTeam.code} vs {editMatch.awayTeam.code}</p>
            <div className="flex items-center gap-3 mb-4">
              <input type="number" min="0" value={homeScore} onChange={(e) => setHomeScore(e.target.value)}
                className="flex-1 text-center text-2xl font-black border dark:border-slate-600 rounded-xl py-3 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
              <span className="text-gray-400 font-bold text-xl">-</span>
              <input type="number" min="0" value={awayScore} onChange={(e) => setAwayScore(e.target.value)}
                className="flex-1 text-center text-2xl font-black border dark:border-slate-600 rounded-xl py-3 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditMatch(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 dark:text-white text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                Cancelar
              </button>
              <button
                onClick={() => scoreMutation.mutate({ id: editMatch.id, hs: +homeScore, as: +awayScore })}
                disabled={homeScore === '' || awayScore === '' || scoreMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:opacity-40 text-white text-sm font-bold transition-colors">
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-700">
                {['Fecha', 'Partido', 'Marcador', 'Fase', 'Estado', 'Acciones'].map((h) => (
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
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {dayjs(m.matchDate).format('D MMM HH:mm')}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold dark:text-white">{m.homeTeam.code}</span>
                        <span className="text-gray-400 mx-1">vs</span>
                        <span className="font-bold dark:text-white">{m.awayTeam.code}</span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold dark:text-white">
                        {m.homeScore != null ? `${m.homeScore} - ${m.awayScore}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                        {m.stage === 'GROUP' ? `Grupo ${m.group}` : m.stage}
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
                            <>
                              <button onClick={() => { setEditMatch(m); setHomeScore(String(m.homeScore ?? 0)); setAwayScore(String(m.awayScore ?? 0)); }}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors" title="Editar marcador">
                                <Edit3 size={14} />
                              </button>
                              <button onClick={() => finishMutation.mutate(m.id)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/20 transition-colors" title="Finalizar partido">
                                <CheckSquare size={14} />
                              </button>
                            </>
                          )}
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
