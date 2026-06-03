import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../services/adminApi';

interface Team {
  id: string;
  name: string;
  shortName: string;
  code: string;
  region: string;
  fifaRanking?: number;
  group?: string;
  isEliminated: boolean;
}

const REGION_COLORS: Record<string, string> = {
  UEFA: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
  CONMEBOL: 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400',
  CONCACAF: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400',
  CAF: 'bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400',
  AFC: 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400',
  OFC: 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-400',
};

export function TeamsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-teams'],
    queryFn: adminApi.getTeams,
  });

  const teams: Team[] = data?.data ?? [];
  const byGroup = teams.reduce<Record<string, Team[]>>((acc, t) => {
    const g = t.group ?? '?';
    if (!acc[g]) acc[g] = [];
    acc[g].push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold dark:text-white">Selecciones</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">{teams.length} equipos — 12 grupos WC 2026</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-100 dark:bg-slate-800 rounded-2xl h-40" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Object.entries(byGroup).sort(([a], [b]) => a.localeCompare(b)).map(([letter, groupTeams]) => (
            <div key={letter} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700">
                <h3 className="font-bold dark:text-white">Grupo {letter}</h3>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-slate-700/50">
                {groupTeams.sort((a, b) => (a.fifaRanking ?? 999) - (b.fifaRanking ?? 999)).map((t) => (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-10 h-7 bg-gray-100 dark:bg-slate-700 rounded flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-black dark:text-white">{t.code}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${t.isEliminated ? 'text-gray-400 line-through' : 'dark:text-white'}`}>
                        {t.name}
                      </p>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${REGION_COLORS[t.region] ?? REGION_COLORS.OFC}`}>
                        {t.region}
                      </span>
                    </div>
                    {t.fifaRanking && (
                      <span className="text-xs font-mono text-gray-400 dark:text-gray-500">#{t.fifaRanking}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
