'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Calendar, Filter, Search, ChevronDown } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { MainLayout } from '../../components/layout/MainLayout';
import { MatchRow } from '../../components/match/MatchRow';
import { StandingsTable } from '../../components/standings/StandingsTable';
import { cn } from '../../lib/utils';
import { apiClient } from '../../lib/api';

dayjs.locale('es');

const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
const STAGES = [
  { value: 'GROUP', label: 'Fase de Grupos' },
  { value: 'ROUND_OF_32', label: 'Octavos de Final' },
  { value: 'ROUND_OF_16', label: 'Ronda de 16' },
  { value: 'QUARTER_FINAL', label: 'Cuartos de Final' },
  { value: 'SEMI_FINAL', label: 'Semifinales' },
  { value: 'FINAL', label: 'Final' },
];

type ViewMode = 'fixture' | 'standings';

export default function FixturePage() {
  const [viewMode, setViewMode] = useState<ViewMode>('fixture');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [searchTeam, setSearchTeam] = useState('');

  const queryParams = new URLSearchParams({ limit: '100' });
  if (selectedGroup) queryParams.set('group', selectedGroup);
  if (selectedStage) queryParams.set('stage', selectedStage);

  const { data, isLoading } = useQuery({
    queryKey: ['matches', 'fixture', selectedGroup, selectedStage],
    queryFn: () => apiClient.get(`/matches?${queryParams}`).then((r) => r.data.data),
    staleTime: 60_000,
  });

  const matches = data?.items ?? [];

  // Group by date
  const groupedByDate = useMemo(() => {
    const filtered = searchTeam
      ? matches.filter((m: any) =>
          m.homeTeam.name.toLowerCase().includes(searchTeam.toLowerCase()) ||
          m.awayTeam.name.toLowerCase().includes(searchTeam.toLowerCase())
        )
      : matches;

    return filtered.reduce((acc: any, match: any) => {
      const dateKey = dayjs(match.matchDate).format('YYYY-MM-DD');
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(match);
      return acc;
    }, {});
  }, [matches, searchTeam]);

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black dark:text-white mb-2">Fixture</h1>
          <p className="text-gray-500 dark:text-gray-400">FIFA World Cup 2026™ — 80 partidos</p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-4 mb-6">
          {/* Mode Toggle */}
          <div className="flex bg-gray-100 dark:bg-slate-800 rounded-xl p-1">
            {(['fixture', 'standings'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  viewMode === mode
                    ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                )}
              >
                {mode === 'fixture' ? '📅 Partidos' : '🏆 Posiciones'}
              </button>
            ))}
          </div>

          {viewMode === 'fixture' && (
            <>
              {/* Search */}
              <div className="relative flex-1 min-w-48">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar selección..."
                  value={searchTeam}
                  onChange={(e) => setSearchTeam(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Group Filter */}
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => setSelectedGroup(null)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                    !selectedGroup
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700'
                  )}
                >
                  Todos
                </button>
                {GROUPS.map((g) => (
                  <button
                    key={g}
                    onClick={() => setSelectedGroup(selectedGroup === g ? null : g)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                      selectedGroup === g
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700'
                    )}
                  >
                    G{g}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {viewMode === 'standings' ? (
            <motion.div key="standings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <StandingsTable />
            </motion.div>
          ) : (
            <motion.div key="fixture" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-20 rounded-xl bg-gray-100 dark:bg-slate-800 animate-pulse" />
                  ))}
                </div>
              ) : Object.keys(groupedByDate).length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Calendar size={48} className="mx-auto mb-4 opacity-30" />
                  <p>No hay partidos para los filtros seleccionados</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedByDate)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([date, dateMatches]) => (
                      <div key={date}>
                        <div className="sticky top-16 z-10 py-2 mb-2">
                          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-slate-900 px-2 py-1 rounded">
                            {dayjs(date).format('dddd, D [de] MMMM')}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {(dateMatches as any[]).map((match) => (
                            <MatchRow key={match.id} match={match} />
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MainLayout>
  );
}
