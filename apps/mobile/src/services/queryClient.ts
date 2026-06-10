import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60_000,         // 5 min fresh
      gcTime: 24 * 60 * 60_000,      // 24h in cache (survives offline)
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,       // auto-refresh when connectivity returns
    },
    mutations: { retry: 0 },
  },
});

export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'shinra-query-cache',
  throttleTime: 3000,
});
