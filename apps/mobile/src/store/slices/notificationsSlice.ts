import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  data?: Record<string, string>;
}

interface NotificationsState {
  notifications: AppNotification[];
  unreadCount: number;
}

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: { notifications: [], unreadCount: 0 } as NotificationsState,
  reducers: {
    setNotifications(state, action: PayloadAction<{ items: AppNotification[]; unread: number }>) {
      state.notifications = action.payload.items;
      state.unreadCount = action.payload.unread;
    },
    addNotification(state, action: PayloadAction<AppNotification>) {
      state.notifications.unshift(action.payload);
      if (!action.payload.isRead) state.unreadCount += 1;
    },
    markRead(state, action: PayloadAction<string>) {
      const n = state.notifications.find((n) => n.id === action.payload);
      if (n && !n.isRead) { n.isRead = true; state.unreadCount = Math.max(0, state.unreadCount - 1); }
    },
    markAllRead(state) {
      state.notifications.forEach((n) => { n.isRead = true; });
      state.unreadCount = 0;
    },
  },
});

export const { setNotifications, addNotification, markRead, markAllRead } = notificationsSlice.actions;
export default notificationsSlice.reducer;
