import { useState, useCallback, useEffect, useRef } from 'react';
import type { TaskFilter } from '../utils/taskListHelpers';
import { buildTaskFilters } from '../utils/taskListHelpers';

export interface UseTaskListFiltersReturn {
  searchQuery: string;
  filter: TaskFilter;
  isSearchVisible: boolean;
  isFilterMenuVisible: boolean;
  setSearchQuery: (query: string) => void;
  setFilter: (filter: TaskFilter) => void;
  toggleSearch: () => void;
  toggleFilterMenu: () => void;
  closeFilterMenu: () => void;
  buildFilters: (userId: number | undefined) => Record<string, any>;
}

/**
 * Hook for managing task list filters and search
 */
export const useTaskListFilters = (
  onFilterChange: () => void
): UseTaskListFiltersReturn => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [isFilterMenuVisible, setIsFilterMenuVisible] = useState(false);
  const isFirstMount = useRef(true);

  // Trigger reload when filters change (with debounce)
  useEffect(() => {
    // Skip first mount to avoid double loading
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    const timer = setTimeout(() => {
      onFilterChange();
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, filter]);

  const toggleSearch = useCallback(() => {
    setIsSearchVisible(prev => !prev);
  }, []);

  const toggleFilterMenu = useCallback(() => {
    setIsFilterMenuVisible(prev => !prev);
  }, []);

  const closeFilterMenu = useCallback(() => {
    setIsFilterMenuVisible(false);
  }, []);

  const buildFilters = useCallback((userId: number | undefined) => {
    return buildTaskFilters(filter, searchQuery, userId);
  }, [filter, searchQuery]);

  return {
    searchQuery,
    filter,
    isSearchVisible,
    isFilterMenuVisible,
    setSearchQuery,
    setFilter,
    toggleSearch,
    toggleFilterMenu,
    closeFilterMenu,
    buildFilters,
  };
};
