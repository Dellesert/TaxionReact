/**
 * Cache Maintenance
 * Granular pruning + automatic enforcement of cache limits.
 * Runs on app startup, foreground, and cache limit changes.
 */

import { useChatStore } from '@shared/store/chatStore';
import { useCalendarStore } from '@shared/store/calendarStore';
import { useUserStore } from '@shared/store/userStore';
import { usePollStore } from '@shared/store/pollStore';
import { useTaskStore } from '@shared/store/taskStore';
import { isNative } from '@shared/storage';

// ---- Limits ----

const MESSAGES_PER_CHAT_LIMIT = 50;
const CHATS_WITH_MESSAGES_LIMIT = 30;
const CALENDAR_RANGE_MAX_AGE_DAYS = 60;
const POLL_CACHE_LIMIT = 50;
const TASK_CACHE_LIMIT_PER_STATUS = 30;
const MAINTENANCE_THROTTLE_MS = 5 * 60 * 1000; // 5 minutes

// ---- Throttle state ----

let lastMaintenanceRun = 0;

// ---- Pruning functions ----

export function pruneMessages(): { chatsPruned: number; messagesRemoved: number } {
  const state = useChatStore.getState();
  const messages = state.messages;
  const allChats = state.chats;
  const activeChatId = state.activeChat?.id ?? state.selectedChatId;

  if (!messages || Object.keys(messages).length === 0) {
    return { chatsPruned: 0, messagesRemoved: 0 };
  }

  // Build recency map from all tabs
  const chatRecency = new Map<number, number>();
  const tabs = state.tabs;
  for (const tabData of Object.values(tabs)) {
    for (const chat of [...tabData.pinnedChats, ...tabData.regularChats]) {
      const ts = new Date(chat.updated_at).getTime();
      if (!chatRecency.has(chat.id) || ts > chatRecency.get(chat.id)!) {
        chatRecency.set(chat.id, ts);
      }
    }
  }
  for (const chat of allChats) {
    const ts = new Date(chat.updated_at).getTime();
    if (!chatRecency.has(chat.id) || ts > chatRecency.get(chat.id)!) {
      chatRecency.set(chat.id, ts);
    }
  }

  // Sort chat IDs with messages by recency (active chat always first)
  const chatIdsWithMessages = Object.keys(messages).map(Number);
  chatIdsWithMessages.sort((a, b) => {
    if (a === activeChatId) return -1;
    if (b === activeChatId) return 1;
    return (chatRecency.get(b) ?? 0) - (chatRecency.get(a) ?? 0);
  });

  const prunedMessages: Record<number, any[]> = {};
  let messagesRemoved = 0;
  let chatsPruned = 0;

  for (let i = 0; i < chatIdsWithMessages.length; i++) {
    const chatId = chatIdsWithMessages[i];
    const chatMessages = messages[chatId];
    if (!chatMessages || chatMessages.length === 0) continue;

    if (i < CHATS_WITH_MESSAGES_LIMIT) {
      // Keep this chat, but trim messages to last N
      if (chatMessages.length > MESSAGES_PER_CHAT_LIMIT) {
        prunedMessages[chatId] = chatMessages.slice(-MESSAGES_PER_CHAT_LIMIT);
        messagesRemoved += chatMessages.length - MESSAGES_PER_CHAT_LIMIT;
      } else {
        prunedMessages[chatId] = chatMessages;
      }
    } else {
      // Drop all messages for this chat
      messagesRemoved += chatMessages.length;
      chatsPruned++;
    }
  }

  if (messagesRemoved > 0 || chatsPruned > 0) {
    useChatStore.setState({ messages: prunedMessages });
  }

  return { chatsPruned, messagesRemoved };
}

function parseRangeKeyEndDate(key: string): Date | null {
  // Format: "YYYY-MM-DD_YYYY-MM-DD"
  if (key.includes('_') && !key.startsWith('month_')) {
    const endPart = key.split('_')[1];
    const d = new Date(endPart + 'T00:00:00');
    return isNaN(d.getTime()) ? null : d;
  }
  // Format: "month_YYYY-MM"
  if (key.startsWith('month_')) {
    const match = key.match(/^month_(\d{4})-(\d{2})$/);
    if (match) {
      const year = parseInt(match[1]);
      const month = parseInt(match[2]); // 1-based
      return new Date(year, month, 0); // last day of that month
    }
  }
  // Format: "YYYY-M" (0-based month)
  const match = key.match(/^(\d{4})-(\d{1,2})$/);
  if (match) {
    const year = parseInt(match[1]);
    const month = parseInt(match[2]); // 0-based
    return new Date(year, month + 1, 0); // last day of that month
  }
  return null; // Unknown format — keep it
}

export function pruneCalendarRanges(): number {
  const state = useCalendarStore.getState();
  const eventsByRange = state.eventsByRange;

  if (!eventsByRange || Object.keys(eventsByRange).length === 0) return 0;

  const cutoffMs = CALENDAR_RANGE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const prunedRanges: Record<string, any[]> = {};
  let removedCount = 0;

  for (const [key, events] of Object.entries(eventsByRange)) {
    const endDate = parseRangeKeyEndDate(key);
    if (endDate && now - endDate.getTime() > cutoffMs) {
      removedCount++;
      continue;
    }
    prunedRanges[key] = events;
  }

  if (removedCount > 0) {
    useCalendarStore.setState({ eventsByRange: prunedRanges });
  }

  return removedCount;
}

export function pruneExpiredUsers(): number {
  const state = useUserStore.getState();
  const usersById = state.usersById;
  const ttl = state.cacheTTL;

  if (!usersById || Object.keys(usersById).length === 0) return 0;

  const now = Date.now();
  const prunedUsers: Record<number, any> = {};
  let removedCount = 0;

  for (const [id, cached] of Object.entries(usersById)) {
    if (now - cached.cachedAt > ttl) {
      removedCount++;
    } else {
      prunedUsers[Number(id)] = cached;
    }
  }

  if (removedCount > 0) {
    useUserStore.setState({ usersById: prunedUsers });
  }

  return removedCount;
}

export function prunePolls(): number {
  const state = usePollStore.getState();
  const polls = state.polls;

  if (!polls || polls.length <= POLL_CACHE_LIMIT) return 0;

  const removed = polls.length - POLL_CACHE_LIMIT;
  usePollStore.setState({ polls: polls.slice(0, POLL_CACHE_LIMIT) });
  return removed;
}

export function pruneTasks(): number {
  const state = useTaskStore.getState();
  const tasksByStatus = state.tasksByStatus;
  let totalRemoved = 0;

  const prunedTasksByStatus = { ...tasksByStatus };
  for (const status of ['new', 'in_progress', 'review', 'done'] as const) {
    const tasks = prunedTasksByStatus[status];
    if (tasks && tasks.length > TASK_CACHE_LIMIT_PER_STATUS) {
      totalRemoved += tasks.length - TASK_CACHE_LIMIT_PER_STATUS;
      prunedTasksByStatus[status] = tasks.slice(0, TASK_CACHE_LIMIT_PER_STATUS);
    }
  }

  if (totalRemoved > 0) {
    useTaskStore.setState({ tasksByStatus: prunedTasksByStatus });
  }

  return totalRemoved;
}

// ---- Orchestrator ----

interface MaintenanceOptions {
  force?: boolean;
}

export async function runCacheMaintenance(options: MaintenanceOptions = {}): Promise<void> {
  const { force = false } = options;

  const now = Date.now();
  if (!force && now - lastMaintenanceRun < MAINTENANCE_THROTTLE_MS) {
    return;
  }
  lastMaintenanceRun = now;

  // Phase 1: Granular pruning (synchronous, cheap)
  const messagesResult = pruneMessages();
  const calendarResult = pruneCalendarRanges();
  const usersResult = pruneExpiredUsers();
  const pollsResult = prunePolls();
  const tasksResult = pruneTasks();

  const totalPruned =
    messagesResult.messagesRemoved +
    messagesResult.chatsPruned +
    calendarResult +
    usersResult +
    pollsResult +
    tasksResult;

  if (totalPruned > 0) {
    console.log('[CacheMaintenance] Pruned:', {
      messages: messagesResult,
      calendarRanges: calendarResult,
      expiredUsers: usersResult,
      polls: pollsResult,
      tasks: tasksResult,
    });
  }

  // Phase 2: Check size limit and enforce if needed
  try {
    const { getStorageSize, getCacheLimit, enforceCacheLimit } = await import(
      '@shared/storage'
    );
    const [storageInfo, cacheLimit] = await Promise.all([
      getStorageSize(),
      getCacheLimit(),
    ]);

    // Include video cache size on native
    let totalSize = storageInfo.totalSize;
    if (isNative) {
      try {
        const { getVideoCacheSize } = await import('@shared/utils/videoCache');
        const videoInfo = await getVideoCacheSize();
        totalSize += videoInfo.totalSize;
      } catch {}
    }

    if (totalSize > cacheLimit) {
      console.log(
        `[CacheMaintenance] Over limit (${(totalSize / 1024 / 1024).toFixed(1)}MB / ${(cacheLimit / 1024 / 1024).toFixed(1)}MB), enforcing...`,
      );
      await enforceCacheLimit();
    }
  } catch (e) {
    console.warn('[CacheMaintenance] Size check error:', e);
  }
}
