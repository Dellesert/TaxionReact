import { useState, useEffect, useRef, useMemo } from 'react';
import { Poll } from '../types/poll.types';
import { Animated as RNAnimated } from 'react-native';
import { PollFilter, filterPollsByStatus } from '../utils/pollListHelpers';

interface UsePollListFiltersReturn {
  filter: PollFilter;
  searchQuery: string;
  isSearchVisible: boolean;
  isFilterMenuVisible: boolean;
  searchAnimation: RNAnimated.Value;
  filteredPolls: Poll[];
  setFilter: (filter: PollFilter) => void;
  setSearchQuery: (query: string) => void;
  setIsSearchVisible: (visible: boolean) => void;
  setIsFilterMenuVisible: (visible: boolean) => void;
}

/**
 * Custom hook for managing poll list filters and search
 */
export const usePollListFilters = (
  polls: Poll[],
  searchQuery: string
): UsePollListFiltersReturn => {
  const [filter, setFilter] = useState<PollFilter>('active');
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [isFilterMenuVisible, setIsFilterMenuVisible] = useState(false);
  const searchAnimation = useRef(new RNAnimated.Value(0)).current;

  // Animate search bar
  useEffect(() => {
    RNAnimated.timing(searchAnimation, {
      toValue: isSearchVisible ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isSearchVisible, searchAnimation]);

  // Filter polls (client-side filtering when no search query)
  const filteredPolls = useMemo(() => {
    if (searchQuery.trim()) {
      // When searching, show results as is (server-side filtered)
      return polls;
    }
    // Client-side filtering by status
    return filterPollsByStatus(polls, filter);
  }, [polls, filter, searchQuery]);

  return {
    filter,
    searchQuery: localSearchQuery,
    isSearchVisible,
    isFilterMenuVisible,
    searchAnimation,
    filteredPolls,
    setFilter,
    setSearchQuery: setLocalSearchQuery,
    setIsSearchVisible,
    setIsFilterMenuVisible,
  };
};
