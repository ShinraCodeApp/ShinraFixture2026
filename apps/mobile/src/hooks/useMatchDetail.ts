import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService, createWebSocketConnection } from '../services/api';

export function useMatchDetail(matchId: string) {
  const queryClient = useQueryClient();
  const socketRef = useRef<any>(null);

  const { data: match, isLoading, error, refetch } = useQuery({
    queryKey: ['match', matchId],
    queryFn: async () => {
      const r = await apiService.get(`/matches/${matchId}`);
      return r.data.data;
    },
    staleTime: 30_000,
    // Poll every 30s during live matches so events appear even without Socket.IO
    refetchInterval: (query) => {
      const status = (query.state.data as any)?.status;
      return status === 'LIVE' || status === 'HALF_TIME' ? 30_000 : false;
    },
  });

  // Connect to WebSocket for live matches
  useEffect(() => {
    if (!match || (match.status !== 'LIVE' && match.status !== 'HALF_TIME')) return;

    const socket = createWebSocketConnection(matchId);
    socketRef.current = socket;

    socket.emit('join-match', matchId);

    socket.on('match:score', (data: { homeScore: number; awayScore: number; minute: number }) => {
      queryClient.setQueryData(['match', matchId], (old: any) => ({
        ...old,
        homeScore: data.homeScore,
        awayScore: data.awayScore,
        minute: data.minute,
      }));
    });

    socket.on('match:event', (event: any) => {
      queryClient.setQueryData(['match', matchId], (old: any) => ({
        ...old,
        events: [...(old?.events ?? []), event],
      }));
    });

    socket.on('match:status', (data: { status: string }) => {
      queryClient.setQueryData(['match', matchId], (old: any) => ({
        ...old,
        status: data.status,
      }));
    });

    return () => {
      socket.emit('leave-match', matchId);
      socket.disconnect();
    };
  }, [matchId, match?.status]);

  return { match, isLoading, error, refetch };
}
