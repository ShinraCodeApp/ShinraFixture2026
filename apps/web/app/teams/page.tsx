'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Search, Globe } from 'lucide-react';
import { MainLayout } from '../../components/layout/MainLayout';
import { cn } from '../../lib/utils';
import { apiClient } from '../../lib/api';

const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
const REGIONS = ['UEFA', 'CONMEBOL', 'CONCACAF', 'CAF', 'AFC', 'OFC'];

export default function TeamsPage() {
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState<string | null>(null);
  const [group, setGroup] = useState<string | null>(null);

  const { data: teams, isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => apiClient.get('/teams').then((r) => r.data.data),
    staleTime: 10 * 60_000,
  });

  const filtered = useMemo(() => {
    if (!teams) return [];
    return (teams as any[]).filter((t) => {
      const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.code.toLowerCase().includes(search.toLowerCase());
      const matchRegion = !region || t.region === region;
      const matchGroup = !group || t.group === group;
      return matchSearch && matchRegion && matchGroup;
    });
  }, [teams, search, region, group]);

  // Group by tournament group
  const byGroup = useMemo(() => {
    if (group) return { [group]: filtered };
    return filtered.reduce((acc: any, t: any) => {
      if (!acc[t.group]) acc[t.group] = [];
      acc[t.group].push(t);
      return acc;
    }, {});
  }, [filtered, group]);

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-black dark:text-white mb-2">Selecciones</h1>
          <p className="text-gray-500 dark:text-gray-400">48 selecciones participantes en el Mundial 2026</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-8">
          <div className="relative flex-1 min-w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar selección..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {REGIONS.map((r) => (
              <button
                key={r}
                onClick={() => setRegion(region === r ? null : r)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                  region === r ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400'
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Group filter pills */}
        <div className="flex gap-1 flex-wrap mb-6">
          {GROUPS.map((g) => (
            <button
              key={g}
              onClick={() => setGroup(group === g ? null : g)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-bold transition-colors',
                group === g ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400'
              )}
            >
              G{g}
            </button>
          ))}
        </div>

        {/* Teams Grid by Group */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="h-32 rounded-2xl bg-gray-100 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(byGroup)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([groupLetter, groupTeams]) => (
                <div key={groupLetter}>
                  <h2 className="text-lg font-bold dark:text-white mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-primary-500 text-white text-sm flex items-center justify-center font-black">
                      {groupLetter}
                    </span>
                    Grupo {groupLetter}
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {(groupTeams as any[]).map((team) => (
                      <Link
                        key={team.id}
                        href={`/teams/${team.id}`}
                        className="group bg-white dark:bg-slate-800 rounded-2xl p-4 text-center border border-gray-100 dark:border-slate-700 hover:border-primary-500 dark:hover:border-primary-500 transition-all hover:shadow-lg hover:-translate-y-0.5"
                      >
                        <img
                          src={team.flagUrl ?? '/placeholder.png'}
                          alt={team.name}
                          className="w-12 h-12 rounded-full mx-auto mb-2 object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-flag.png'; }}
                        />
                        <p className="font-bold text-sm dark:text-white">{team.name}</p>
                        <p className="text-xs text-gray-400">{team.code}</p>
                        {team.fifaRanking && (
                          <p className="text-xs text-primary-500 mt-1">FIFA #{team.fifaRanking}</p>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
