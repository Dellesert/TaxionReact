import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Poll, PollStatus } from '../types/poll.types';
import { useTheme } from '@shared/hooks/useTheme';
import { useAuthStore } from '@shared/store/authStore';
import { useIsWideScreen } from '@shared/hooks/useIsWideScreen';
import { usePollListData } from '../hooks/usePollListData';
import { usePollListFilters } from '../hooks/usePollListFilters';
import { PollStackParamList } from '@navigation/types';
import CreatePollModal from '../components/CreatePollModal';
import EditPollModal from '../components/EditPollModal';
import { PollListHeader } from '../components/PollListHeader';
import { PollListContent } from '../components/PollListContent';
import { PollFilterMenu } from '../components/PollFilterMenu';
import { canUserCreatePoll, filterPollsByStatus } from '../utils/pollListHelpers';

type PollListScreenNavigationProp = NativeStackNavigationProp<
  PollStackParamList,
  'PollList'
>;

const PollListScreen: React.FC = () => {
  const navigation = useNavigation<PollListScreenNavigationProp>();
  const { theme } = useTheme();
  const currentUser = useAuthStore((state) => state.user);
  const isDesktop = useIsWideScreen();

  // Local state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPollId, setEditingPollId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterButtonPosition, setFilterButtonPosition] = useState<{ x: number; y: number; width: number; height: number } | undefined>();
  const [refreshing, setRefreshing] = useState(false);
  const isFirstRender = useRef(true);

  // Custom hooks
  const {
    filter,
    isSearchVisible,
    isFilterMenuVisible,
    searchAnimation,
    setFilter,
    setIsSearchVisible,
    setIsFilterMenuVisible,
  } = usePollListFilters([], searchQuery);

  const {
    polls,
    hasMore,
    isLoading,
    isLoadingMore,
    error,
    loadPolls,
    handleRefresh,
    handleLoadMore,
  } = usePollListData();

  // Permissions
  const canCreatePoll = canUserCreatePoll(currentUser?.role);

  // Server returns polls with vote priority (un-voted first, voted last)
  // We need to load enough data to show all polls matching the filter
  const getFilters = useCallback(() => {
    if (filter === 'all') {
      return undefined; // No status filter - show all polls
    }
    if (filter === 'active') {
      // Active polls include both 'active' and 'draft' statuses
      return { status: ['active', 'draft'] as PollStatus[] };
    }
    if (filter === 'closed') {
      // Closed polls include 'closed', 'archived', and 'cancelled' statuses
      return { status: ['closed', 'archived', 'cancelled'] as PollStatus[] };
    }
    // Fallback for any other filter values
    return { status: filter as PollStatus };
  }, [filter]);

  // Server already filters by status, no need for client-side filtering
  const displayedPolls = polls;

  // Load polls on mount
  useEffect(() => {
    loadPolls(getFilters(), searchQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload when filter or search changes (skip first render)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timer = setTimeout(() => {
      loadPolls(getFilters(), searchQuery);
    }, searchQuery ? 500 : 0); // Debounce only for search

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, searchQuery]);

  // Handlers
  const handlePollPress = (poll: Poll) => {
    navigation.navigate('PollDetail', { pollId: poll.id });
  };

  const handleCreatePoll = () => {
    setShowCreateModal(true);
  };

  const handlePollCreated = () => {
    loadPolls(getFilters(), searchQuery);
  };

  const handlePollUpdated = () => {
    loadPolls(getFilters(), searchQuery);
  };

  const handleRefreshWrapper = async () => {
    setRefreshing(true);
    await handleRefresh(getFilters(), searchQuery);
    setRefreshing(false);
  };

  const handleLoadMoreWrapper = () => {
    handleLoadMore(getFilters(), searchQuery);
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
  };

  const handleSearchClear = () => {
    setSearchQuery('');
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.card }]}
      edges={['top', 'left', 'right']}
    >
      {/* Header */}
      <PollListHeader
        filter={filter}
        searchQuery={searchQuery}
        isSearchVisible={isSearchVisible}
        canCreatePoll={canCreatePoll}
        searchAnimation={searchAnimation}
        onSearchToggle={() => setIsSearchVisible(!isSearchVisible)}
        onSearchChange={handleSearchChange}
        onSearchClear={handleSearchClear}
        onFilterPress={() => setIsFilterMenuVisible(!isFilterMenuVisible)}
        onCreatePress={handleCreatePoll}
        onFilterButtonLayout={setFilterButtonPosition}
        isDesktop={isDesktop}
      />

      {/* Content */}
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <PollListContent
          polls={displayedPolls}
          isLoading={isLoading}
          isLoadingMore={isLoadingMore}
          refreshing={refreshing}
          error={error}
          hasMore={hasMore}
          onPollPress={handlePollPress}
          onRefresh={handleRefreshWrapper}
          onLoadMore={handleLoadMoreWrapper}
          onRetry={() => loadPolls(getFilters(), searchQuery)}
          isDesktop={isDesktop}
        />
      </View>

      {/* Filter Menu */}
      <PollFilterMenu
        visible={isFilterMenuVisible}
        currentFilter={filter}
        onClose={() => setIsFilterMenuVisible(false)}
        onFilterSelect={setFilter}
        buttonPosition={filterButtonPosition}
      />

      {/* Create Poll Modal */}
      <CreatePollModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onPollCreated={handlePollCreated}
      />

      {/* Edit Poll Modal */}
      {editingPollId && (
        <EditPollModal
          visible={showEditModal}
          pollId={editingPollId}
          onClose={() => {
            setShowEditModal(false);
            setEditingPollId(null);
          }}
          onPollUpdated={handlePollUpdated}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default PollListScreen;
