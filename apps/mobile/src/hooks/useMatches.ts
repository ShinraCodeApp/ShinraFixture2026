import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';

interface UseMatchesParams {
  group?: string;
  stage?: string;
  status?: string;
  date?: string;
  teamId?: string;
}

export function useMatches(params: UseMatchesParams = {}) {
  const queryString = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${v}`)
    .join('&');

  const { data: liveData, isLoading: liveLoading, refetch: refetchLive } = useQuery({
    queryKey: ['matches', 'live'],
    queryFn: async () => {
      const r = await apiService.get('/matches/live');
      return r.data.data ?? [];
    },
    refetchInterval: 30_000, // 30s for live
  });

  const { data: todayData, isLoading: todayLoading, refetch: refetchToday } = useQuery({
    queryKey: ['matches', 'today'],
    queryFn: async () => {
      const r = await apiService.get('/matches/today');
      return r.data.data ?? [];
    },
    refetchInterval: 60_000,
  });

  const { data: upcomingData, isLoading: upcomingLoading, refetch: refetchUpcoming } = useQuery({
    queryKey: ['matches', 'upcoming'],
    queryFn: async () => {
      const r = await apiService.get('/matches/upcoming?days=14');
      return r.data.data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  const { data: allData, isLoading: allLoading, refetch: refetchAll } = useQuery({
    queryKey: ['matches', 'all', queryString],
    queryFn: async () => {
      const r = await apiService.get(`/matches?limit=100${queryString ? '&' + queryString : ''}`);
      return r.data.data?.items ?? [];
    },
    staleTime: 2 * 60_000,
  });

  return {
    liveMatches: liveData ?? [],
    todayMatches: todayData ?? [],
    upcomingMatches: upcomingData ?? [],
    allMatches: allData ?? [],
    isLoading: liveLoading || todayLoading,
    refetch: () => { refetchLive(); refetchToday(); refetchUpcoming(); refetchAll(); },
  };
}

export function useLiveMatches() {
  const { data, isLoading } = useQuery({
    queryKey: ['matches', 'live'],
    queryFn: async () => {
      const r = await apiService.get('/matches/live');
      return r.data.data ?? [];
    },
    refetchInterval: 30_000,
  });

  return { liveMatches: data ?? [], isLoading };
}
