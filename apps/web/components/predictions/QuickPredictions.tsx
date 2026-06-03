'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import { useUpcomingMatches } from '../../hooks/useMatches';
import type { Match } from '../../hooks/useMatches';

function PredictionCard({ match }: { match: Match }) {
  const qc = useQueryClient();
  const [home, setHome] = useState('');
  const [away, setAway] = useState('');
  const [saved, setSaved] = useState(false);

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      await apiClient.post('/predictions', {
        matchId: match.id,
        homeScore: parseInt(home),
        awayScore: parseInt(away),
      });
    },
    onSuccess: () => {
      setSaved(true);
      qc.invalidateQueries({ queryKey: ['predictions'] });
    },
  });

  const canSubmit = home !== '' && away !== '' && !isNaN(+home) && !isNaN(+away);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700 min-w-[220px]">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
        {match.stage === 'GROUP' ? `Grupo ${match.group}` : match.stage}
      </p>

      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 text-center">
          <p className="text-sm font-bold dark:text-white">{match.homeTeam.code}</p>
        </div>
        <span className="text-gray-300 dark:text-slate-600 font-bold text-xs">vs</span>
        <div className="flex-1 text-center">
          <p className="text-sm font-bold dark:text-white">{match.awayTeam.code}</p>
        </div>
      </div>

      {saved ? (
        <div className="bg-green-50 dark:bg-green-950/30 rounded-xl p-3 text-center">
          <p className="text-green-600 dark:text-green-400 font-bold text-sm">
            ✓ {home} - {away}
          </p>
          <p className="text-xs text-green-500/70 mt-0.5">Pronóstico guardado</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="20"
              value={home}
              onChange={(e) => setHome(e.target.value)}
              placeholder="0"
              className="flex-1 text-center border border-gray-200 dark:border-slate-600 rounded-lg py-2 text-lg font-bold dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <span className="text-gray-400 font-bold">-</span>
            <input
              type="number"
              min="0"
              max="20"
              value={away}
              onChange={(e) => setAway(e.target.value)}
              placeholder="0"
              className="flex-1 text-center border border-gray-200 dark:border-slate-600 rounded-lg py-2 text-lg font-bold dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <button
            onClick={() => mutate()}
            disabled={!canSubmit || isPending}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white font-bold py-2 rounded-xl text-sm transition-colors"
          >
            {isPending ? 'Guardando...' : 'Pronosticar'}
          </button>
        </div>
      )}

      {match.homeWinProb != null && (
        <div className="mt-3 flex justify-between text-xs text-gray-400">
          <span>{Math.round((match.homeWinProb ?? 0) * 100)}%</span>
          <span>{Math.round((match.drawProb ?? 0) * 100)}%</span>
          <span>{Math.round((match.awayWinProb ?? 0) * 100)}%</span>
        </div>
      )}
    </div>
  );
}

export function QuickPredictions() {
  const { upcomingMatches, isLoading } = useUpcomingMatches(8);

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-gray-100 dark:bg-slate-800 rounded-2xl h-40 min-w-[220px]" />
        ))}
      </div>
    );
  }

  if (!upcomingMatches.length) {
    return (
      <div className="bg-gray-50 dark:bg-slate-800 rounded-2xl p-8 text-center">
        <p className="text-gray-400">No hay partidos próximos para pronosticar</p>
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
      {upcomingMatches.map((match) => (
        <PredictionCard key={match.id} match={match} />
      ))}
    </div>
  );
}
