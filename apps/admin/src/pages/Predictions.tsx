import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Zap } from 'lucide-react';
import { adminApi } from '../services/adminApi';

export function PredictionsPage() {
  const qc = useQueryClient();
  const [matchId, setMatchId] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-predictions'],
    queryFn: () => adminApi.getPredictions({ limit: '50' }),
  });

  const { data: finishedMatches } = useQuery({
    queryKey: ['admin-matches', 'FINISHED'],
    queryFn: () => adminApi.getMatches({ status: 'FINISHED', limit: '50' }),
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => adminApi.resolvePredictions(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-predictions'] });
      setMatchId('');
    },
  });

  const predictions = data?.data?.predictions ?? [];
  const matches = finishedMatches?.data ?? [];

  const stats = {
    total: data?.data?.total ?? 0,
    won: predictions.filter((p: any) => p.status === 'WON').length,
    lost: predictions.filter((p: any) => p.status === 'LOST').length,
    pending: predictions.filter((p: any) => p.status === 'PENDING').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold dark:text-white">Predicciones</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Gestión y resolución de pronósticos</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-blue-600' },
          { label: 'Pendientes', value: stats.pending, color: 'text-yellow-600' },
          { label: 'Correctas', value: stats.won, color: 'text-green-600' },
          { label: 'Incorrectas', value: stats.lost, color: 'text-red-500' },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700 text-center">
            <p className={`text-2xl font-black ${s.color}`}>{s.value.toLocaleString()}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Resolve predictions */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700">
        <h2 className="font-semibold dark:text-white mb-4 flex items-center gap-2">
          <Zap size={16} className="text-yellow-500" />
          Resolver Predicciones
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Selecciona un partido finalizado para calcular y asignar los puntos a todos los pronosticadores.
        </p>
        <div className="flex gap-3">
          <select
            value={matchId}
            onChange={(e) => setMatchId(e.target.value)}
            className="flex-1 border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Seleccionar partido finalizado...</option>
            {matches.map((m: any) => (
              <option key={m.id} value={m.id}>
                {m.homeTeam?.code} {m.homeScore}-{m.awayScore} {m.awayTeam?.code}
              </option>
            ))}
          </select>
          <button
            onClick={() => matchId && resolveMutation.mutate(matchId)}
            disabled={!matchId || resolveMutation.isPending}
            className="px-4 py-2.5 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-40 text-black font-bold rounded-xl text-sm transition-colors"
          >
            {resolveMutation.isPending ? 'Procesando...' : 'Resolver'}
          </button>
        </div>
        {resolveMutation.isSuccess && (
          <p className="mt-3 text-sm text-green-600 dark:text-green-400">✓ Predicciones resueltas correctamente</p>
        )}
      </div>

      {/* Recent table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700">
          <h2 className="font-semibold dark:text-white">Predicciones Recientes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-700">
                {['Usuario', 'Partido', 'Pronóstico', 'Estado', 'Puntos'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50 dark:border-slate-700/50">
                      {Array.from({ length: 5 }).map((__, j) => (
                        <td key={j} className="px-4 py-3"><div className="animate-pulse h-4 bg-gray-100 dark:bg-slate-700 rounded" /></td>
                      ))}
                    </tr>
                  ))
                : predictions.map((p: any) => (
                    <tr key={p.id} className="border-b border-gray-50 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/20 transition-colors">
                      <td className="px-4 py-3 font-medium dark:text-white">{p.user?.username ?? '-'}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                        {p.match?.homeTeam?.code} vs {p.match?.awayTeam?.code}
                      </td>
                      <td className="px-4 py-3 font-mono dark:text-white">{p.homeScore} - {p.awayScore}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold
                          ${p.status === 'WON' ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400' :
                            p.status === 'LOST' ? 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400' :
                            'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-400'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold dark:text-white">{p.pointsEarned}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
