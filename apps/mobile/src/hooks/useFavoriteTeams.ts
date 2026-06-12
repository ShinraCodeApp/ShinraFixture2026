import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { apiService } from '../services/api';

export interface FavoriteTeamEntry {
  id: string;
  teamId: string;
  team: {
    id: string;
    name: string;
    shortName: string;
    code: string;
    flagUrl: string;
    shieldUrl?: string;
    region: string;
  };
}

export function useFavoriteTeams() {
  const qc = useQueryClient();
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);

  const { data: favorites = [] } = useQuery<FavoriteTeamEntry[]>({
    queryKey: ['favorite-teams'],
    queryFn: async () => (await apiService.get('/users/me/favorite-teams')).data.data,
    enabled: isAuthenticated,
    staleTime: 2 * 60_000,
  });

  const isFavorite = (teamId: string) => favorites.some((f) => f.teamId === teamId);

  const toggleMutation = useMutation({
    mutationFn: async (teamId: string) => {
      if (isFavorite(teamId)) {
        return apiService.get(`/users/teams/${teamId}/g-fav-remove`);
      } else {
        return apiService.get('/users/g-fav-add', { params: { teamId } });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['favorite-teams'] }),
  });

  return {
    favorites,
    isFavorite,
    toggle: (teamId: string) => toggleMutation.mutate(teamId),
    isPending: toggleMutation.isPending,
  };
}
