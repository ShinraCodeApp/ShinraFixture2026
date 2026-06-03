'use client';

import React from 'react';
import Link from 'next/link';
import dayjs from 'dayjs';
import { useTodayMatches } from '../../hooks/useMatches';

function MatchSkeleton() {
  return (
    <div className="animate-pulse bg-gray-100 dark:bg-slate-800 rounded-2xl h-24" />
  );
}

export function TodayMatches() {
  const { todayMatches, isLoading } = useTodayMatches();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <MatchSkeleton key={i} />)}
      </div>
    );
  }

  if (!todayMatches.length) {
    return (
      <div className="bg-gray-50 dark:bg-slate-800 rounded-2xl p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">No hay partidos programados para hoy</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {todayMatches.map((match) => {
        const isLive = match.status === 'LIVE' || match.status === 'HALF_TIME';
        const isFinished = match.status === 'FINISHED';
        const isScheduled = match.status === 'SCHEDULED';

        return (
          <Link key={match.id} href={`/match/${match.id}`}>
            <div className={`bg-white dark:bg-slate-800 rounded-2xl p-4 border transition-all hover:shadow-md cursor-pointer
              ${isLive ? 'border-red-500/50 shadow-red-500/10 shadow-sm' : 'border-gray-100 dark:border-slate-700'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {match.stage === 'GROUP' ? `Grupo ${match.group}` : match.stage.replace(/_/g, ' ')}
                </span>
                {isLive && (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-red-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    {match.minute}′
                  </span>
                )}
                {isFinished && (
                  <span className="text-xs font-medium text-gray-400 dark:text-gray-500">FINAL</span>
                )}
                {isScheduled && (
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {dayjs(match.matchDate).format('HH:mm')}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1 flex items-center justify-between">
                  <span className="font-bold dark:text-white">{match.homeTeam.name}</span>
                  <span className={`text-2xl font-black ${isLive ? 'text-red-500' : 'dark:text-white'}`}>
                    {isScheduled ? '' : (match.homeScore ?? 0)}
                  </span>
                </div>
                <span className="text-gray-300 dark:text-slate-600 font-bold">-</span>
                <div className="flex-1 flex items-center justify-between flex-row-reverse">
                  <span className="font-bold dark:text-white">{match.awayTeam.name}</span>
                  <span className={`text-2xl font-black ${isLive ? 'text-red-500' : 'dark:text-white'}`}>
                    {isScheduled ? '' : (match.awayScore ?? 0)}
                  </span>
                </div>
              </div>

              {isScheduled && match.homeWinProb != null && (
                <div className="mt-2 flex gap-1 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-blue-500 rounded-l-full" style={{ width: `${(match.homeWinProb ?? 0) * 100}%` }} />
                  <div className="bg-gray-300 dark:bg-slate-600" style={{ width: `${(match.drawProb ?? 0) * 100}%` }} />
                  <div className="bg-red-500 rounded-r-full" style={{ width: `${(match.awayWinProb ?? 0) * 100}%` }} />
                </div>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
