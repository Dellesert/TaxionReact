/**
 * Differential Sync Hook
 * Синхронизирует только изменённые данные с сервером
 * Использует updated_since параметр API для получения только обновлённых записей
 */

import { useCallback, useRef } from 'react';
import { useChatStore } from '@shared/store/chatStore';
import { useTaskStore } from '@shared/store/taskStore';
import { usePollStore } from '@shared/store/pollStore';
import { getLastSyncISO, setLastSyncTime, clearSyncMetadata } from '@shared/storage/syncMetadata';
import { isNative } from '@shared/storage';

interface SyncResult {
  feature: 'chats' | 'tasks' | 'polls';
  success: boolean;
  duration: number;
  updated: number;
  deleted: number;
  isFullSync: boolean;
}

interface UseDifferentialSyncOptions {
  /** Включить дифференциальную синхронизацию (по умолчанию true на native) */
  enabled?: boolean;
  /** Callback после синхронизации */
  onComplete?: (results: SyncResult[]) => void;
  /** Callback при ошибке */
  onError?: (error: Error, feature: string) => void;
}

/**
 * Хук для дифференциальной синхронизации данных
 * Загружает только изменённые записи с момента последней синхронизации
 */
export const useDifferentialSync = (options: UseDifferentialSyncOptions = {}) => {
  const { enabled = isNative, onComplete, onError } = options;

  const isSyncingRef = useRef(false);
  const resultsRef = useRef<SyncResult[]>([]);

  // Store actions
  const mergeChats = useChatStore((state) => state.mergeChats);
  const removeChats = useChatStore((state) => state.removeChats);
  const mergeTasks = useTaskStore((state) => state.mergeTasks);
  const removeTasks = useTaskStore((state) => state.removeTasks);
  const mergePolls = usePollStore((state) => state.mergePolls);
  const removePolls = usePollStore((state) => state.removePolls);

  /**
   * Синхронизировать чаты
   */
  const syncChats = useCallback(async (): Promise<SyncResult> => {
    const start = Date.now();
    const lastSync = await getLastSyncISO('chats');
    const isFullSync = !lastSync;

    try {
      const chatApi = await import('@/features/chat/api/chat.api');

      // Загружаем чаты с updated_since параметром
      const response = await chatApi.getChats(100, 0, undefined, lastSync);

      // Если это sync-ответ с deleted_ids
      const syncData = response as any;
      if (syncData.deleted_ids && Array.isArray(syncData.deleted_ids)) {
        // Удаляем удалённые чаты
        if (syncData.deleted_ids.length > 0 && removeChats) {
          removeChats(syncData.deleted_ids);
        }
      }

      // Мержим обновлённые чаты
      const chats = syncData.data || syncData.chats || [];
      if (chats.length > 0 && mergeChats) {
        mergeChats(chats);
      }

      // Сохраняем время синхронизации
      const serverTime = syncData.server_time
        ? new Date(syncData.server_time).getTime()
        : Date.now();
      await setLastSyncTime('chats', serverTime);

      return {
        feature: 'chats',
        success: true,
        duration: Date.now() - start,
        updated: chats.length,
        deleted: syncData.deleted_ids?.length || 0,
        isFullSync,
      };
    } catch (error) {
      console.error('[DiffSync] Chats sync failed:', error);
      onError?.(error as Error, 'chats');
      return {
        feature: 'chats',
        success: false,
        duration: Date.now() - start,
        updated: 0,
        deleted: 0,
        isFullSync,
      };
    }
  }, [mergeChats, removeChats, onError]);

  /**
   * Синхронизировать задачи
   */
  const syncTasks = useCallback(async (): Promise<SyncResult> => {
    const start = Date.now();
    const lastSync = await getLastSyncISO('tasks');
    const isFullSync = !lastSync;

    try {
      const taskApi = await import('@/features/tasks/api/task.api');

      // Загружаем все статусы параллельно
      const statuses = ['new', 'in_progress', 'review', 'done'] as const;
      const responses = await Promise.all(
        statuses.map(status => taskApi.getTasksByStatus(status, 50, 0, undefined, lastSync))
      );

      let totalUpdated = 0;
      let totalDeleted = 0;
      let serverTime = Date.now();

      for (let i = 0; i < responses.length; i++) {
        const response = responses[i] as any;
        const status = statuses[i];

        // Если это sync-ответ с deleted_ids
        if (response.deleted_ids && Array.isArray(response.deleted_ids)) {
          if (response.deleted_ids.length > 0 && removeTasks) {
            removeTasks(response.deleted_ids, status);
          }
          totalDeleted += response.deleted_ids.length;
        }

        // Мержим обновлённые задачи
        const tasks = response.data || [];
        if (tasks.length > 0 && mergeTasks) {
          mergeTasks(tasks, status);
        }
        totalUpdated += tasks.length;

        // Используем server_time из последнего ответа
        if (response.server_time) {
          serverTime = new Date(response.server_time).getTime();
        }
      }

      // Сохраняем время синхронизации
      await setLastSyncTime('tasks', serverTime);

      return {
        feature: 'tasks',
        success: true,
        duration: Date.now() - start,
        updated: totalUpdated,
        deleted: totalDeleted,
        isFullSync,
      };
    } catch (error) {
      console.error('[DiffSync] Tasks sync failed:', error);
      onError?.(error as Error, 'tasks');
      return {
        feature: 'tasks',
        success: false,
        duration: Date.now() - start,
        updated: 0,
        deleted: 0,
        isFullSync,
      };
    }
  }, [mergeTasks, removeTasks, onError]);

  /**
   * Синхронизировать опросы
   */
  const syncPolls = useCallback(async (): Promise<SyncResult> => {
    const start = Date.now();
    const lastSync = await getLastSyncISO('polls');
    const isFullSync = !lastSync;

    try {
      const pollApi = await import('@/features/polls/api/poll.api');

      // Загружаем опросы с updated_since параметром
      const response = await pollApi.getPolls(undefined, 50, 0, lastSync);

      // Если это sync-ответ с deleted_ids
      const syncData = response as any;
      if (syncData.deleted_ids && Array.isArray(syncData.deleted_ids)) {
        // Удаляем удалённые опросы
        if (syncData.deleted_ids.length > 0 && removePolls) {
          removePolls(syncData.deleted_ids);
        }
      }

      // Мержим обновлённые опросы
      const polls = syncData.data || syncData.polls || [];
      if (polls.length > 0 && mergePolls) {
        mergePolls(polls);
      }

      // Сохраняем время синхронизации
      const serverTime = syncData.server_time
        ? new Date(syncData.server_time).getTime()
        : Date.now();
      await setLastSyncTime('polls', serverTime);

      return {
        feature: 'polls',
        success: true,
        duration: Date.now() - start,
        updated: polls.length,
        deleted: syncData.deleted_ids?.length || 0,
        isFullSync,
      };
    } catch (error) {
      console.error('[DiffSync] Polls sync failed:', error);
      onError?.(error as Error, 'polls');
      return {
        feature: 'polls',
        success: false,
        duration: Date.now() - start,
        updated: 0,
        deleted: 0,
        isFullSync,
      };
    }
  }, [mergePolls, removePolls, onError]);

  /**
   * Выполнить полную дифференциальную синхронизацию
   */
  const syncAll = useCallback(async (): Promise<SyncResult[]> => {
    if (!enabled || isSyncingRef.current) {
      return [];
    }

    isSyncingRef.current = true;
    resultsRef.current = [];

    const startTime = Date.now();

    try {
      // Синхронизируем все фичи параллельно
      const results = await Promise.all([
        syncChats(),
        syncTasks(),
        syncPolls(),
      ]);

      resultsRef.current = results;

      const totalDuration = Date.now() - startTime;
      const successCount = results.filter(r => r.success).length;
      const totalUpdated = results.reduce((sum, r) => sum + r.updated, 0);
      const totalDeleted = results.reduce((sum, r) => sum + r.deleted, 0);

      onComplete?.(results);
      return results;
    } catch (error) {
      console.error('[DiffSync] Sync failed:', error);
      return [];
    } finally {
      isSyncingRef.current = false;
    }
  }, [enabled, syncChats, syncTasks, syncPolls, onComplete]);

  /**
   * Сбросить метаданные синхронизации (для принудительной полной синхронизации)
   */
  const resetSync = useCallback(async () => {
    await clearSyncMetadata();
  }, []);

  return {
    syncAll,
    syncChats,
    syncTasks,
    syncPolls,
    resetSync,
    isSyncing: isSyncingRef.current,
    results: resultsRef.current,
  };
};

export default useDifferentialSync;
