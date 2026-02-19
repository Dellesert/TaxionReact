/**
 * Hooks Index
 * Centralized export of all custom hooks
 */

export { useAuth } from './useAuth';
export { useNetworkStatus } from './useNetworkStatus';
export { useNetworkSync } from './useNetworkSync';
export { useCachedUser, useUserCacheActions } from './useCachedUser';

// Chat optimizations
export { useChatPrefetch, useListPrefetch, useScrollPrefetch } from './usePrefetch';
export { useOptimisticMessage, clearAllPendingMessages } from './useOptimisticMessage';

// Task optimizations
export { useTaskPrefetch, useTaskListPrefetch, getTaskFromCache, getSubtasksFromCache, clearAllTaskCache } from './useTaskPrefetch';
export { useOptimisticTask, clearAllPendingTaskOperations } from './useOptimisticTask';

// Poll optimizations
export { usePollPrefetch, usePollListPrefetch, getPollFromCache, clearAllPollCache } from './usePollPrefetch';
export { useOptimisticPoll, clearAllPendingPollOperations } from './useOptimisticPoll';

// Event/Calendar optimizations
export { useEventPrefetch, getEventFromCache, clearAllEventCache } from './useEventPrefetch';
export { useOptimisticEvent, clearAllPendingEventOperations } from './useOptimisticEvent';

// Password policy
export { usePasswordPolicy, prefetchPasswordPolicy, clearPasswordPolicyCache } from './usePasswordPolicy';

// Animation
export { useAnimationType } from './useAnimationType';
