/**
 * In-App Notification Store
 * Управление toast-уведомлениями, которые появляются сверху экрана
 */

import { create } from 'zustand';
import { Notification } from '@types/notification.types';

interface InAppNotificationState {
  // State
  currentNotification: Notification | null;
  queue: Notification[];

  // Actions
  showNotification: (notification: Notification) => void;
  dismissNotification: () => void;
  clearQueue: () => void;
}

export const useInAppNotificationStore = create<InAppNotificationState>((set, get) => ({
  // Initial state
  currentNotification: null,
  queue: [],

  // Actions
  showNotification: (notification: Notification) => {
    const { currentNotification, queue } = get();

    if (currentNotification) {
      // Если уже показывается уведомление, добавляем в очередь
      set({ queue: [...queue, notification] });
    } else {
      // Показываем сразу
      set({ currentNotification: notification });
    }
  },

  dismissNotification: () => {
    const { queue } = get();

    if (queue.length > 0) {
      // Показываем следующее из очереди
      const [next, ...rest] = queue;
      set({ currentNotification: next, queue: rest });
    } else {
      // Очистка текущего уведомления
      set({ currentNotification: null });
    }
  },

  clearQueue: () => {
    set({ queue: [], currentNotification: null });
  },
}));
