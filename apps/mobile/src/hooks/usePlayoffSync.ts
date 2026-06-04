import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { logger } from '../utils/logger';

interface PlayoffSlot {
  code: string;
  slot: string;
  resolved: boolean;
  team: string;
  flagUrl: string;
}

// Auto-syncs playoff results when the app opens and there are pending slots
export function usePlayoffSync() {
  const queryClient = useQueryClient();

  const { data: playoffs } = useQuery<PlayoffSlot[]>({
    queryKey: ['wc2026-playoffs'],
    queryFn: async () => {
      const r = await apiService.get('/tournaments/wc2026/playoffs');
      return r.data.data ?? [];
    },
    staleTime: 60_000 * 30, // check every 30 min
  });

  useEffect(() => {
    if (!playoffs) return;

    const hasPending = playoffs.some((p) => !p.resolved);
    if (!hasPending) return;

    // There are pending play-off slots — trigger sync
    const sync = async () => {
      try {
        const r = await apiService.post('/tournaments/wc2026/playoffs/sync', {});
        const { updated } = r.data.data;

        if (updated.length > 0) {
          logger.info(`Playoffs updated: ${updated.join(', ')}`);
          // Invalidate queries so team lists refresh
          queryClient.invalidateQueries({ queryKey: ['teams'] });
          queryClient.invalidateQueries({ queryKey: ['matches'] });
          queryClient.invalidateQueries({ queryKey: ['wc2026-playoffs'] });
        }
      } catch {
        // Sync failed (no internet or API unavailable) — silent fail
      }
    };

    sync();
  }, [playoffs]);

  return { playoffs, pendingCount: playoffs?.filter((p) => !p.resolved).length ?? 0 };
}
