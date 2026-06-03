'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';

export interface Team {
  id: string;
  name: string;
  shortName: string;
  code: string;
  flagUrl?: string;
}

export interface Match {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  homeScore?: number | null;
  awayScore?: number | null;
  matchDate: string;
  status: string;
  minute?: number | null;
  stage: string;
  group?: string | null;
  venue?: string;
  city?: string;
  homeWinProb?: number | null;
  drawProb?: number | null;
  awayWinProb?: number | null;
}

async function fetchMatches(params: Record<string, string>) {
  const query = new URLSearchParams(params).toString();
  const res = await apiClient.get(`/matches?${query}`);
  return (res.data?.data ?? []) as Match[];
}

export function useLiveMatches() {
  const { data: liveMatches = [], isLoading } = useQuery({
    queryKey: ['matches', 'live'],
    queryFn: () => fetchMatches({ status: 'LIVE', limit: '10' }),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
  return { liveMatches, isLoading };
}

export function useTodayMatches() {
  const today = new Date().toISOString().split('T')[0];
  const { data: todayMatches = [], isLoading } = useQuery({
    queryKey: ['matches', 'today'],
    queryFn: () => fetchMatches({ date: today, limit: '20' }),
    staleTime: 60_000,
  });
  return { todayMatches, isLoading };
}

export function useUpcomingMatches(limit = 10) {
  const { data: upcomingMatches = [], isLoading } = useQuery({
    queryKey: ['matches', 'upcoming', limit],
    queryFn: () => fetchMatches({ status: 'SCHEDULED', limit: String(limit) }),
    staleTime: 5 * 60_000,
  });
  return { upcomingMatches, isLoading };
}

export function useAllMatches(group?: string) {
  const params: Record<string, string> = { limit: '100' };
  if (group) params.group = group;

  const { data: matches = [], isLoading } = useQuery({
    queryKey: ['matches', 'all', group],
    queryFn: () => fetchMatches(params),
    staleTime: 2 * 60_000,
  });
  return { matches, isLoading };
}
