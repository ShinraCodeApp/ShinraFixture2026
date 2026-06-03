'use client';

import React from 'react';
import Link from 'next/link';
import type { Match } from '../../hooks/useMatches';

interface Props {
  matches: Match[];
}

export function LiveMatchesBanner({ matches }: Props) {
  if (!matches.length) return null;

  return (
    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
      {matches.map((match) => (
        <Link
          key={match.id}
          href={`/match/${match.id}`}
          className="flex-shrink-0 bg-white/10 backdrop-blur-sm border border-red-500/30 rounded-xl px-5 py-3 hover:bg-white/20 transition-colors"
        >
          <div className="flex items-center gap-4 text-white">
            <div className="text-center min-w-[60px]">
              <p className="text-xs text-white/60 font-medium">{match.homeTeam.code}</p>
              <p className="text-xl font-black">{match.homeScore ?? 0}</p>
            </div>
            <div className="text-center">
              <span className="text-xs font-bold text-red-400 bg-red-500/20 px-2 py-0.5 rounded-full">
                {match.minute}′
              </span>
            </div>
            <div className="text-center min-w-[60px]">
              <p className="text-xs text-white/60 font-medium">{match.awayTeam.code}</p>
              <p className="text-xl font-black">{match.awayScore ?? 0}</p>
            </div>
          </div>
          <p className="text-xs text-white/40 text-center mt-1 truncate max-w-[160px]">
            {match.venue}
          </p>
        </Link>
      ))}
    </div>
  );
}
