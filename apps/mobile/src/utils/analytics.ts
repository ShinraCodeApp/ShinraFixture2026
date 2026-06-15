import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { apiService } from '../services/api';

const QUEUE_KEY = '@shinra_analytics_queue';
const MAX_QUEUE = 20;

export type AnalyticsEvent =
  | 'app_open'
  | 'screen_view'
  | 'prediction_made'
  | 'prediction_won'
  | 'duel_created'
  | 'duel_accepted'
  | 'bracket_saved'
  | 'share_app'
  | 'share_ranking'
  | 'rating_shown'
  | 'rating_tapped'
  | 'notification_tapped'
  | 'quiniela_joined'
  | 'friend_added';

interface EventPayload {
  event: AnalyticsEvent;
  properties?: Record<string, any>;
  ts: number;
}

let flushTimeout: ReturnType<typeof setTimeout> | null = null;

export async function track(event: AnalyticsEvent, properties?: Record<string, any>) {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    const queue: EventPayload[] = raw ? JSON.parse(raw) : [];
    queue.push({ event, properties, ts: Date.now() });
    // Keep only last MAX_QUEUE events to avoid unbounded growth
    const trimmed = queue.slice(-MAX_QUEUE);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(trimmed));
  } catch {}

  // Debounce flush: send after 3s of inactivity
  if (flushTimeout) clearTimeout(flushTimeout);
  flushTimeout = setTimeout(flush, 3000);
}

async function flush() {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return;
    const queue: EventPayload[] = JSON.parse(raw);
    if (!queue.length) return;

    await apiService.post('/analytics/events', {
      events: queue,
      platform: Platform.OS,
    });

    await AsyncStorage.removeItem(QUEUE_KEY);
  } catch {
    // Silent fail — analytics should never break the app
  }
}

// Call on app foreground to flush any pending events
export function flushAnalytics() {
  flush();
}
