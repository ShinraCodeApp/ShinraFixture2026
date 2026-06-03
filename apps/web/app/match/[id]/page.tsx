'use client';

import React, { useState } from 'react';
import { useParams, notFound } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, MapPin, Users, Clock } from 'lucide-react';
import dayjs from 'dayjs';
import { MainLayout } from '../../../components/layout/MainLayout';
import { MatchStatusBadge } from '../../../components/match/MatchStatusBadge';
import { ProbabilityBars } from '../../../components/match/ProbabilityBars';
import { EventTimeline } from '../../../components/match/EventTimeline';
import { MatchStatsChart } from '../../../components/match/MatchStatsChart';
import { AIAnalysisCard } from '../../../components/ai/AIAnalysisCard';
import { CommentSection } from '../../../components/community/CommentSection';
import { PredictionWidget } from '../../../components/predictions/PredictionWidget';
import { cn } from '../../../lib/utils';
import { apiClient } from '../../../lib/api';
import { useSocket } from '../../../hooks/useSocket';

type Tab = 'overview' | 'stats' | 'lineups' | 'predict' | 'comments';

export default function MatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const { data, isLoading, error } = useQuery({
    queryKey: ['match', id],
    queryFn: () => apiClient.get(`/matches/${id}`).then((r) => r.data.data),
    refetchInterval: (data) => (data?.status === 'LIVE' ? 30_000 : false),
  });

  // Subscribe to live updates
  useSocket(id, data?.status === 'LIVE');

  if (isLoading) {
    return (
      <MainLayout>
        <div className="animate-pulse">
          <div className="h-64 bg-slate-800" />
          <div className="container mx-auto px-4 py-8 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-gray-100 dark:bg-slate-800" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !data) return notFound();

  const match = data;
  const isLive = match.status === 'LIVE' || match.status === 'HALF_TIME';
  const isFinished = match.status === 'FINISHED';
  const isScheduled = match.status === 'SCHEDULED';

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: 'overview', label: 'Resumen' },
    { key: 'stats', label: 'Estadísticas' },
    { key: 'lineups', label: 'Alineaciones' },
    { key: 'predict', label: 'Pronosticar' },
    { key: 'comments', label: 'Comentarios' },
  ];

  return (
    <MainLayout>
      {/* Hero */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-800 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-2 mb-6 text-sm text-gray-400">
            <Link href="/fixture" className="hover:text-white transition-colors flex items-center gap-1">
              <ArrowLeft size={16} />
              Fixture
            </Link>
            <span>/</span>
            <span>{match.stage === 'GROUP' ? `Grupo ${match.group}` : match.stage.replace(/_/g, ' ')}</span>
          </div>

          {/* Teams & Score */}
          <div className="flex items-center justify-between gap-4 mb-6">
            {/* Home */}
            <Link href={`/teams/${match.homeTeam.id}`} className="flex-1 text-center group">
              <img
                src={match.homeTeam.flagUrl ?? '/placeholder-flag.png'}
                alt={match.homeTeam.name}
                className="w-20 h-20 rounded-full mx-auto mb-2 border-2 border-white/10 group-hover:border-primary-500 transition-colors"
              />
              <p className="font-bold text-lg">{match.homeTeam.shortName ?? match.homeTeam.name}</p>
              {match.homeTeam.fifaRanking && (
                <p className="text-xs text-gray-400">FIFA #{match.homeTeam.fifaRanking}</p>
              )}
            </Link>

            {/* Score Center */}
            <div className="text-center flex-shrink-0">
              <MatchStatusBadge status={match.status} minute={match.minute} />
              {isScheduled ? (
                <div className="mt-2">
                  <p className="text-4xl font-black">{dayjs(match.matchDate).format('HH:mm')}</p>
                  <p className="text-gray-400 text-sm">{dayjs(match.matchDate).format('D MMM YYYY')}</p>
                </div>
              ) : (
                <div className="flex items-center gap-4 mt-2">
                  <span className={cn('text-6xl font-black', isLive && 'text-red-400')}>
                    {match.homeScore ?? 0}
                  </span>
                  <span className="text-3xl text-gray-500">-</span>
                  <span className={cn('text-6xl font-black', isLive && 'text-red-400')}>
                    {match.awayScore ?? 0}
                  </span>
                </div>
              )}
              {match.homePenalties !== null && (
                <p className="text-sm text-gray-400">({match.homePenalties} - {match.awayPenalties}) pen.</p>
              )}
              <div className="flex items-center justify-center gap-1 mt-2 text-xs text-gray-400">
                <MapPin size={12} />
                {match.venue}, {match.city}
              </div>
            </div>

            {/* Away */}
            <Link href={`/teams/${match.awayTeam.id}`} className="flex-1 text-center group">
              <img
                src={match.awayTeam.flagUrl ?? '/placeholder-flag.png'}
                alt={match.awayTeam.name}
                className="w-20 h-20 rounded-full mx-auto mb-2 border-2 border-white/10 group-hover:border-primary-500 transition-colors"
              />
              <p className="font-bold text-lg">{match.awayTeam.shortName ?? match.awayTeam.name}</p>
              {match.awayTeam.fifaRanking && (
                <p className="text-xs text-gray-400">FIFA #{match.awayTeam.fifaRanking}</p>
              )}
            </Link>
          </div>

          {/* AI Win Probabilities */}
          {match.homeWinProb !== null && (
            <div className="max-w-lg mx-auto">
              <ProbabilityBars
                homeProb={match.homeWinProb ?? 0.4}
                drawProb={match.drawProb ?? 0.25}
                awayProb={match.awayWinProb ?? 0.35}
                homeName={match.homeTeam.shortName ?? match.homeTeam.name}
                awayName={match.awayTeam.shortName ?? match.awayTeam.name}
              />
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="border-t border-white/10">
          <div className="container mx-auto px-4">
            <div className="flex overflow-x-auto scrollbar-none">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                    activeTab === tab.key
                      ? 'border-primary-500 text-primary-400'
                      : 'border-transparent text-gray-400 hover:text-white'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="container mx-auto px-4 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <EventTimeline events={match.events ?? []} homeTeamId={match.homeTeamId} />
            {match.aiAnalysis && <AIAnalysisCard analysis={match.aiAnalysis} matchId={id} />}
          </div>
        )}

        {activeTab === 'stats' && match.stats && (
          <MatchStatsChart stats={match.stats} homeTeam={match.homeTeam} awayTeam={match.awayTeam} />
        )}

        {activeTab === 'predict' && isScheduled && (
          <PredictionWidget matchId={id} homeTeam={match.homeTeam} awayTeam={match.awayTeam} userPrediction={match.userPrediction} />
        )}

        {activeTab === 'comments' && (
          <CommentSection matchId={id} />
        )}
      </div>
    </MainLayout>
  );
}
