import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Poll } from '@/types/poll.types';
import { useTheme } from '@hooks/useTheme';
import { useAuthStore } from '@store/authStore';
import { usePollListData } from '@hooks/usePollListData';
import { usePollListFilters } from '@hooks/usePollListFilters';
import { PollStackParamList } from '@navigation/types';
import CreatePollModal from '@components/poll/CreatePollModal';
import EditPollModal from '@components/poll/EditPollModal';
import { PollListHeader } from '@screens/poll/components/PollListHeader';
import { PollListContent } from '@screens/poll/components/PollListContent';
import { PollFilterMenu } from '@screens/poll/components/PollFilterMenu';
import { canUserCreatePoll, filterPollsByStatus } from '@utils/pollListHelpers';

type PollListScreenNavigationProp = NativeStackNavigationProp<
  PollStackParamList,
  'PollList'
>;

const PollListScreen: React.FC = () => {
  const navigation = useNavigation<PollListScreenNavigationProp>();
  const { theme } = useTheme();
  const currentUser = useAuthStore((state) => state.user);

  // Local state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPollId, setEditingPollId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const isFirstMount = useRef(true);

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
    refreshing,
    error,
    canLoadMore,
    lastLoadedCount,
    loadPolls,
    handleRefresh,
    handleLoadMore,
  } = usePollListData(filter, searchQuery);

  // Permissions
  const canCreatePoll = canUserCreatePoll(currentUser?.role);

  // Client-side filtered polls
  const displayedPolls = searchQuery.trim()
    ? polls
    : filterPollsByStatus(polls, filter);

  // Load polls on mount and filter change
  useEffect(() => {
    loadPolls();
  }, [filter]);

  // Reload polls when search query changes (with debounce)
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    const timer = setTimeout(() => {
      loadPolls();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Auto-load more polls if filtered results are too few
  useEffect(() => {
    const filtered = filterPollsByStatus(polls, filter);

    if (
      filtered.length < 10 &&
      hasMore &&
      !isLoading &&
      !isLoadingMore &&
      canLoadMore
    ) {
      console.log(`📊 Filtered polls (${filtered.length}) < 10, loading more...`);
      handleLoadMore();
    }
  }, [polls, filter, hasMore, isLoading, isLoadingMore, canLoadMore]);

  // Reload polls when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (polls.length > 0) {
        lastLoadedCount.current = polls.length;
        loadPolls(false, polls.length);
      } else {
        loadPolls();
      }
    }, [filter])
  );

  // Handlers
  const handlePollPress = (poll: Poll) => {
    console.log('Poll pressed:', poll.id);
    navigation.navigate('PollDetail', { pollId: poll.id });
  };

  const handleCreatePoll = () => {
    console.log('Create new poll');
    setShowCreateModal(true);
  };

  const handlePollCreated = () => {
    loadPolls();
  };

  const handlePollUpdated = () => {
    loadPolls();
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
          canLoadMore={canLoadMore}
          onPollPress={handlePollPress}
          onRefresh={handleRefresh}
          onLoadMore={handleLoadMore}
          onRetry={() => loadPolls()}
        />
      </View>

      {/* Filter Menu */}
      <PollFilterMenu
        visible={isFilterMenuVisible}
        currentFilter={filter}
        onClose={() => setIsFilterMenuVisible(false)}
        onFilterSelect={setFilter}
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
