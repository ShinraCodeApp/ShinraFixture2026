'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';

interface Scorer {
  player: {
    id: string;
    name: string;
    photoUrl?: string;
    team: { name: string; code: string; flagUrl?: string };
  };
  goals: number;
  assists: number;
  matchesPlayed: number;
}

function useTopScorers(limit: number) {
  return useQuery<Scorer[]>({
    queryKey: ['stats', 'topscorers', limit],
    queryFn: async () => {
      const res = await apiClient.get(`/stats/top-scorers?limit=${limit}`);
      return res.data?.data ?? [];
    },
    staleTime: 10 * 60_000,
  });
}

export function TopScorers({ limit = 5 }: { limit?: number }) {
  const { data: scorers = [], isLoading } = useTopScorers(limit);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: limit }).map((_, i) => (
          <div key={i} className="animate-pulse bg-gray-100 dark:bg-slate-800 rounded-xl h-14" />
        ))}
      </div>
    );
  }

  if (!scorers.length) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 text-center border border-gray-100 dark:border-slate-700">
        <p className="text-gray-400 text-sm">Estadísticas disponibles cuando comience el torneo</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
      {scorers.map((s, i) => (
        <div
          key={s.player.id}
          className="flex items-center gap-3 px-4 py-3 border-b last:border-0 border-gray-50 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/20 transition-colors"
        >
          <span className={`w-5 text-center text-xs font-bold ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-orange-400' : 'text-gray-300'}`}>
            {i + 1}
          </span>
          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold dark:text-white">{s.player.team.code}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold dark:text-white truncate">{s.player.name}</p>
            <p className="text-xs text-gray-400">{s.player.team.name}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-black dark:text-white">{s.goals}</p>
            <p className="text-xs text-gray-400">goles</p>
          </div>
        </div>
      ))}
    </div>
  );
}
