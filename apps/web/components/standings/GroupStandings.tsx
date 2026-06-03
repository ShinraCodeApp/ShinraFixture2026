'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';

interface TeamStanding {
  teamId: string;
  team: { name: string; code: string; flagUrl?: string };
  position?: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  qualified: boolean;
}

interface Group {
  letter: string;
  teams: TeamStanding[];
}

function useStandings() {
  return useQuery<Group[]>({
    queryKey: ['standings'],
    queryFn: async () => {
      const res = await apiClient.get('/matches/standings');
      return res.data?.data ?? [];
    },
    staleTime: 5 * 60_000,
  });
}

function GroupTable({ group, compact }: { group: Group; compact?: boolean }) {
  const cols = compact
    ? ['PJ', 'G', 'E', 'P', 'Pts']
    : ['PJ', 'G', 'E', 'P', 'GF', 'GC', 'DG', 'Pts'];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-700">
      <div className="px-4 py-2.5 bg-gray-50 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700">
        <h3 className="font-bold text-sm dark:text-white">Grupo {group.letter}</h3>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-50 dark:border-slate-700/50">
            <th className="text-left px-3 py-2 text-xs text-gray-400 font-medium w-8">#</th>
            <th className="text-left px-2 py-2 text-xs text-gray-400 font-medium">Selección</th>
            {cols.map((c) => (
              <th key={c} className="text-center px-1 py-2 text-xs text-gray-400 font-medium w-8">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {group.teams.map((t, i) => (
            <tr
              key={t.teamId}
              className={`border-b last:border-0 border-gray-50 dark:border-slate-700/30 transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/20
                ${i < 2 ? 'bg-green-50/30 dark:bg-green-950/10' : ''}`}
            >
              <td className="px-3 py-2.5">
                <span className={`text-xs font-bold ${i < 2 ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                  {i + 1}
                </span>
              </td>
              <td className="px-2 py-2.5">
                <span className="font-semibold dark:text-white text-sm">{t.team.code}</span>
              </td>
              {!compact && <td className="text-center px-1 py-2.5 text-xs dark:text-gray-300">{t.played}</td>}
              <td className="text-center px-1 py-2.5 text-xs dark:text-gray-300">{t.won}</td>
              <td className="text-center px-1 py-2.5 text-xs dark:text-gray-300">{t.drawn}</td>
              <td className="text-center px-1 py-2.5 text-xs dark:text-gray-300">{t.lost}</td>
              {!compact && <td className="text-center px-1 py-2.5 text-xs dark:text-gray-300">{t.goalsFor}</td>}
              {!compact && <td className="text-center px-1 py-2.5 text-xs dark:text-gray-300">{t.goalsAgainst}</td>}
              {!compact && (
                <td className="text-center px-1 py-2.5 text-xs dark:text-gray-300">
                  {t.goalDifference > 0 ? `+${t.goalDifference}` : t.goalDifference}
                </td>
              )}
              <td className="text-center px-1 py-2.5 font-bold text-xs dark:text-white">{t.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function GroupStandings({ compact = false }: { compact?: boolean }) {
  const { data: groups = [], isLoading } = useStandings();
  const [activeGroup, setActiveGroup] = useState('A');
  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

  if (isLoading) {
    return <div className="animate-pulse bg-gray-100 dark:bg-slate-800 rounded-2xl h-48" />;
  }

  const group = groups.find((g) => g.letter === activeGroup) ?? {
    letter: activeGroup,
    teams: [
      { teamId: '1', team: { name: 'USA', code: 'USA' }, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, qualified: false },
      { teamId: '2', team: { name: 'México', code: 'MEX' }, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, qualified: false },
      { teamId: '3', team: { name: 'Panamá', code: 'PAN' }, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, qualified: false },
      { teamId: '4', team: { name: 'Bahrein', code: 'BHR' }, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, qualified: false },
    ],
  };

  return (
    <div>
      {/* Group selector */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {letters.map((l) => (
          <button
            key={l}
            onClick={() => setActiveGroup(l)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors
              ${activeGroup === l
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
          >
            {l}
          </button>
        ))}
      </div>
      <GroupTable group={group} compact={compact} />
    </div>
  );
}
