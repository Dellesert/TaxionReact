/**
 * Cache Warming Hook
 * Прогрев кэша при старте приложения для мгновенного отображения данных
 */

import { useEffect, useRef, useCallback } from 'react';
import { InteractionManager } from 'react-native';
import { useChatStore } from '@shared/store/chatStore';
import { useTaskStore } from '@shared/store/taskStore';
import { usePollStore } from '@shared/store/pollStore';
import { useUserStore } from '@shared/store/userStore';
import { useCalendarStore } from '@shared/store/calendarStore';
import { useScheduleCacheStore } from '@shared/store/scheduleCacheStore';
import { useAbsenceStore } from '@/features/absences/store/absenceStore';
import { isNative } from '@shared/storage';
import { isElectron } from '@shared/utils/platform';

// Приоритеты загрузки (чем меньше, тем раньше)
const WARM_PRIORITY = {
  chats: 1,      // Чаты - самое важное, грузим первыми
  tasks: 2,      // Задачи - второй приоритет
  unreadCount: 3, // Счётчик непрочитанных
  polls: 4,      // Опросы
  users: 5,      // Профили пользователей (кэшируются отдельно)
  calendar: 6,   // Календарь - текущий месяц
  schedules: 7,  // Графики - текущий месяц
  absences: 8,   // Нерабочие дни - текущий год
} as const;

/**
 * Создать ключ кэша для диапазона дат (формат YYYY-MM-DD_YYYY-MM-DD)
 */
const createRangeKey = (startDate: Date, endDate: Date): string => {
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return `${fmt(startDate)}_${fmt(endDate)}`;
};

interface WarmingResult {
  feature: keyof typeof WARM_PRIORITY;
  success: boolean;
  duration: number;
  itemsLoaded?: number;
}

interface UseCacheWarmingOptions {
  /** Включить прогрев (по умолчанию true на native) */
  enabled?: boolean;
  /** Задержка перед началом прогрева (мс) */
  delay?: number;
  /** Загружать данные параллельно или последовательно */
  parallel?: boolean;
  /** Callback после завершения прогрева */
  onComplete?: (results: WarmingResult[]) => void;
  /** Callback при ошибке */
  onError?: (error: Error, feature: string) => void;
}

/**
 * Хук для прогрева кэша при старте приложения
 * Загружает критичные данные в фоне после рендера UI
 */
export const useCacheWarming = (options: UseCacheWarmingOptions = {}) => {
  const {
    enabled = isNative,
    delay = 100,
    parallel = true,
    onComplete,
    onError,
  } = options;

  const isWarmingRef = useRef(false);
  const hasWarmedRef = useRef(false);
  const resultsRef = useRef<WarmingResult[]>([]);

  // Store selectors - проверяем есть ли уже данные в кэше
  const chatTabs = useChatStore((state) => state.tabs);
  const tasksByStatus = useTaskStore((state) => state.tasksByStatus);
  const polls = usePollStore((state) => state.polls);

  // Store actions
  const loadTabData = useChatStore((state) => state.loadTabData);
  const loadUnreadCount = useChatStore((state) => state.loadUnreadCount);
  const setTasksForStatus = useTaskStore((state) => state.setTasksForStatus);
  const setPolls = usePollStore((state) => state.setPolls);

  /**
   * Проверить, нужен ли прогрев для фичи
   */
  const needsWarming = useCallback((feature: keyof typeof WARM_PRIORITY): boolean => {
    switch (feature) {
      case 'chats': {
        // Проверяем есть ли чаты в любом табе
        const hasChats = chatTabs.all.pinnedChats.length > 0 || chatTabs.all.regularChats.length > 0;
        const needsWarm = !hasChats;
        if (!needsWarm) {
        }
        return needsWarm;
      }
      case 'tasks': {
        // Проверяем есть ли задачи в любом статусе
        const taskCounts = Object.entries(tasksByStatus || {}).map(([status, arr]) => `${status}:${arr?.length || 0}`);
        const hasTasks = Object.values(tasksByStatus || {}).some(arr => arr && arr.length > 0);
        const needsWarm = !hasTasks;
        if (!needsWarm) {
        }
        return needsWarm;
      }
      case 'polls': {
        const needsWarm = !polls || polls.length === 0;
        if (!needsWarm) {
        }
        return needsWarm;
      }
      case 'unreadCount':
        return true; // Всегда обновляем
      case 'calendar':
        return true; // Всегда загружаем свежие данные календаря
      case 'schedules':
        return true; // Всегда загружаем свежие графики
      case 'absences':
        return true; // Всегда загружаем свежие нерабочие дни
      case 'users':
        return false; // Пользователи кэшируются по запросу
      default:
        return false;
    }
  }, [chatTabs, tasksByStatus, polls]);

  /**
   * Прогреть чаты
   */
  const warmChats = useCallback(async (): Promise<WarmingResult> => {
    const start = Date.now();
    try {
      await loadTabData('all');
      const tabs = useChatStore.getState().tabs;
      const itemsLoaded = tabs.all.pinnedChats.length + tabs.all.regularChats.length;
      return {
        feature: 'chats',
        success: true,
        duration: Date.now() - start,
        itemsLoaded,
      };
    } catch (error) {
      onError?.(error as Error, 'chats');
      return { feature: 'chats', success: false, duration: Date.now() - start };
    }
  }, [loadTabData, onError]);

  /**
   * Прогреть задачи
   */
  const warmTasks = useCallback(async (): Promise<WarmingResult> => {
    const start = Date.now();
    try {
      const taskApi = await import('@/features/tasks/api/task.api');

      // Загружаем все статусы параллельно
      const statuses = ['new', 'in_progress', 'review', 'done'] as const;
      const results = await Promise.all(
        statuses.map(status => taskApi.getTasksByStatus(status, 10, 0))
      );

      // Обновляем store
      let totalItems = 0;
      results.forEach((response, index) => {
        const tasks = response.data || [];
        setTasksForStatus(statuses[index], tasks, response.total || 0);
        totalItems += tasks.length;
      });

      return {
        feature: 'tasks',
        success: true,
        duration: Date.now() - start,
        itemsLoaded: totalItems,
      };
    } catch (error) {
      onError?.(error as Error, 'tasks');
      return { feature: 'tasks', success: false, duration: Date.now() - start };
    }
  }, [setTasksForStatus, onError]);

  /**
   * Прогреть опросы
   */
  const warmPolls = useCallback(async (): Promise<WarmingResult> => {
    const start = Date.now();
    try {
      const pollApi = await import('@/features/polls/api/poll.api');
      const response = await pollApi.getPolls(10, 0);
      const pollsList = response.data || [];

      setPolls(pollsList, response.total || 0);

      return {
        feature: 'polls',
        success: true,
        duration: Date.now() - start,
        itemsLoaded: pollsList.length,
      };
    } catch (error) {
      onError?.(error as Error, 'polls');
      return { feature: 'polls', success: false, duration: Date.now() - start };
    }
  }, [setPolls, onError]);

  /**
   * Прогреть счётчик непрочитанных
   */
  const warmUnreadCount = useCallback(async (): Promise<WarmingResult> => {
    const start = Date.now();
    try {
      await loadUnreadCount();
      return {
        feature: 'unreadCount',
        success: true,
        duration: Date.now() - start,
      };
    } catch (error) {
      onError?.(error as Error, 'unreadCount');
      return { feature: 'unreadCount', success: false, duration: Date.now() - start };
    }
  }, [loadUnreadCount, onError]);

  /**
   * Прогреть календарь (текущий месяц)
   */
  const warmCalendar = useCallback(async (): Promise<WarmingResult> => {
    const start = Date.now();
    try {
      const calendarApi = await import('@/features/calendar/api/calendar.api');

      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const rangeKey = createRangeKey(startDate, endDate);

      const startISO = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}T00:00:00Z`;
      const endISO = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}T23:59:59Z`;

      const response = await calendarApi.getEvents({ start: startISO, end: endISO }, 100, 0);
      useCalendarStore.getState().setEventsForRange(rangeKey, response.events);

      return {
        feature: 'calendar',
        success: true,
        duration: Date.now() - start,
        itemsLoaded: response.events.length,
      };
    } catch (error) {
      onError?.(error as Error, 'calendar');
      return { feature: 'calendar', success: false, duration: Date.now() - start };
    }
  }, [onError]);

  /**
   * Прогреть графики (текущий месяц)
   */
  const warmSchedules = useCallback(async (): Promise<WarmingResult> => {
    const start = Date.now();
    try {
      const { scheduleApi } = await import('@/features/schedules/api/schedule.api');

      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const startStr = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, '0')}-${String(firstDay.getDate()).padStart(2, '0')}`;
      const endStr = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
      const rangeKey = `${startStr}_${endStr}`;

      const response = await scheduleApi.getSchedules(
        { start_date: startStr, end_date: endStr },
        { limit: 20, offset: 0 }
      );
      useScheduleCacheStore.getState().setSchedulesForRange(rangeKey, response.schedules);

      return {
        feature: 'schedules',
        success: true,
        duration: Date.now() - start,
        itemsLoaded: response.schedules.length,
      };
    } catch (error) {
      onError?.(error as Error, 'schedules');
      return { feature: 'schedules', success: false, duration: Date.now() - start };
    }
  }, [onError]);

  /**
   * Прогреть нерабочие дни (текущий год)
   */
  const warmAbsences = useCallback(async (): Promise<WarmingResult> => {
    const start = Date.now();
    try {
      const { absenceApi } = await import('@/features/absences/api/absence.api');

      const year = new Date().getFullYear();
      const response = await absenceApi.getAbsences(
        { sort_order: 'asc', start_date: `${year}-01-01`, end_date: `${year}-12-31` },
        { offset: 0, limit: 20 }
      );

      useAbsenceStore.setState({
        absences: response.absences,
        total: response.total,
        hasMore: response.absences.length === 20,
        filters: { sort_order: 'asc', start_date: `${year}-01-01`, end_date: `${year}-12-31` },
      });

      return {
        feature: 'absences',
        success: true,
        duration: Date.now() - start,
        itemsLoaded: response.absences.length,
      };
    } catch (error) {
      onError?.(error as Error, 'absences');
      return { feature: 'absences', success: false, duration: Date.now() - start };
    }
  }, [onError]);

  /**
   * Выполнить прогрев кэша
   */
  const warmCache = useCallback(async () => {
    if (!enabled || isWarmingRef.current || hasWarmedRef.current) {
      return;
    }

    isWarmingRef.current = true;
    resultsRef.current = [];

    const startTime = Date.now();

    // Определяем какие фичи нужно прогреть
    const featuresToWarm: Array<{
      feature: keyof typeof WARM_PRIORITY;
      warmFn: () => Promise<WarmingResult>;
    }> = [];

    if (needsWarming('chats')) {
      featuresToWarm.push({ feature: 'chats', warmFn: warmChats });
    }
    if (needsWarming('tasks')) {
      featuresToWarm.push({ feature: 'tasks', warmFn: warmTasks });
    }
    if (needsWarming('unreadCount')) {
      featuresToWarm.push({ feature: 'unreadCount', warmFn: warmUnreadCount });
    }
    if (needsWarming('polls')) {
      featuresToWarm.push({ feature: 'polls', warmFn: warmPolls });
    }
    if (needsWarming('calendar')) {
      featuresToWarm.push({ feature: 'calendar', warmFn: warmCalendar });
    }
    if (needsWarming('schedules')) {
      featuresToWarm.push({ feature: 'schedules', warmFn: warmSchedules });
    }
    if (needsWarming('absences')) {
      featuresToWarm.push({ feature: 'absences', warmFn: warmAbsences });
    }

    // Сортируем по приоритету
    featuresToWarm.sort((a, b) => WARM_PRIORITY[a.feature] - WARM_PRIORITY[b.feature]);

    if (featuresToWarm.length === 0) {
      hasWarmedRef.current = true;
      isWarmingRef.current = false;
      return;
    }

    try {
      let results: WarmingResult[];

      if (parallel) {
        // Параллельная загрузка (быстрее, но больше нагрузка)
        results = await Promise.all(featuresToWarm.map(f => f.warmFn()));
      } else {
        // Последовательная загрузка (медленнее, но меньше нагрузка)
        results = [];
        for (const { warmFn } of featuresToWarm) {
          const result = await warmFn();
          results.push(result);
        }
      }

      resultsRef.current = results;

      const totalDuration = Date.now() - startTime;
      const successCount = results.filter(r => r.success).length;
      const totalItems = results.reduce((sum, r) => sum + (r.itemsLoaded || 0), 0);


      hasWarmedRef.current = true;
      onComplete?.(results);

      // Run cache maintenance after warming (delayed to let UI settle)
      setTimeout(() => {
        import('@shared/utils/cacheMaintenance')
          .then(({ runCacheMaintenance }) => runCacheMaintenance())
          .catch((e) => console.warn('[CacheWarming] Maintenance error:', e));
      }, 2000);
    } catch (error) {
      console.error('[CacheWarming] Failed:', error);
    } finally {
      isWarmingRef.current = false;
    }
  }, [
    enabled,
    parallel,
    needsWarming,
    warmChats,
    warmTasks,
    warmPolls,
    warmUnreadCount,
    warmCalendar,
    warmSchedules,
    warmAbsences,
    onComplete,
  ]);

  /**
   * Запустить прогрев после рендера UI
   */
  const startWarming = useCallback(() => {
    if (!enabled) return;

    // Ждём завершения анимаций и рендера
    InteractionManager.runAfterInteractions(() => {
      setTimeout(() => {
        warmCache();
      }, delay);
    });
  }, [enabled, delay, warmCache]);

  /**
   * Сбросить флаг прогрева (для повторного запуска)
   */
  const resetWarming = useCallback(() => {
    hasWarmedRef.current = false;
    resultsRef.current = [];
  }, []);

  return {
    startWarming,
    resetWarming,
    isWarming: isWarmingRef.current,
    hasWarmed: hasWarmedRef.current,
    results: resultsRef.current,
  };
};

/**
 * Провайдер для автоматического прогрева при авторизации
 */
export const useCacheWarmingOnAuth = (isAuthenticated: boolean) => {
  const { startWarming, resetWarming } = useCacheWarming({
    enabled: isNative || isElectron(),
    delay: 300, // Небольшая задержка после авторизации
    parallel: true,
    onComplete: (results) => {
      const failed = results.filter(r => !r.success);
      if (failed.length > 0) {
        console.warn('[CacheWarming] Some features failed to warm:',
          failed.map(f => f.feature).join(', '));
      }
    },
  });

  const prevAuthRef = useRef(isAuthenticated);

  useEffect(() => {
    // Запускаем прогрев когда пользователь авторизовался
    if (isAuthenticated && !prevAuthRef.current) {
      startWarming();
    }

    // Сбрасываем при выходе
    if (!isAuthenticated && prevAuthRef.current) {
      resetWarming();
    }

    prevAuthRef.current = isAuthenticated;
  }, [isAuthenticated, startWarming, resetWarming]);
};

export default useCacheWarming;
