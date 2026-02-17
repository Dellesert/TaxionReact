import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { StatusBar, setStatusBarStyle } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Poll, PollStatus } from '../types/poll.types';
import { useTheme } from '@shared/hooks/useTheme';
import { useAuthStore } from '@shared/store/authStore';
import { useIsWideScreen } from '@shared/hooks/useIsWideScreen';
import { useTitleBarControlsIntegration } from '@shared/hooks/useTitleBarControlsIntegration';
import { usePollListData } from '../hooks/usePollListData';
import { usePollListFilters } from '../hooks/usePollListFilters';
import { PollStackParamList } from '@navigation/types';
import CreatePollModal from '../components/modals/CreatePollModal';
import EditPollModal from '../components/modals/EditPollModal';
import { PollListHeader } from '../components/headers/PollListHeader';
import { PollListContent } from '../components/lists/PollListContent';
import { PollViewSwitcher } from '../components/common/PollViewSwitcher';
import { PollFilterMenu } from '../components/common/PollFilterMenu';
import { TitleBarPollControls, PollViewMode } from '../components/common/TitleBarPollControls';
import { TitleBarViewSwitcher, ViewOption } from '@shared/components/common/TitleBarViewSwitcher';
import { canUserCreatePoll, filterPollsByStatus } from '../utils/pollListHelpers';

type PollListScreenNavigationProp = NativeStackNavigationProp<
  PollStackParamList,
  'PollList'
>;

const PollListScreen: React.FC = () => {
  const navigation = useNavigation<PollListScreenNavigationProp>();
  const { theme, isDark } = useTheme();
  const currentUser = useAuthStore((state) => state.user);
  const isDesktop = useIsWideScreen();

  // Reset status bar style when screen gains focus (fixes white status bar after visiting Profile)
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'ios') {
        setStatusBarStyle(isDark ? 'light' : 'dark');
      }
    }, [isDark])
  );

  // Local state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPollId, setEditingPollId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterButtonPosition, setFilterButtonPosition] = useState<{ x: number; y: number; width: number; height: number } | undefined>();
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
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

  // Check if running in Electron
  const isElectron = Platform.OS === 'web' && typeof window !== 'undefined' && window.electron;

  // Check if filter is active (not default 'all')
  const hasActiveFilters = filter !== 'all';

  // Handler for creating poll (defined early for TitleBar integration)
  const handleCreatePoll = useCallback(() => {
    setShowCreateModal(true);
  }, []);


  // View options for TitleBar switcher
  const pollViewOptions: ViewOption<PollViewMode>[] = useMemo(() => [
    { value: 'grid', icon: 'grid-outline', label: 'Сетка' },
    { value: 'table', icon: 'list-outline', label: 'Таблица' },
  ], []);

  // TitleBar left controls - view switcher
  const titleBarLeftControls = useMemo(() => {
    if (!isElectron || !isDesktop) return null;
    return (
      <TitleBarViewSwitcher
        options={pollViewOptions}
        value={viewMode}
        onChange={setViewMode}
      />
    );
  }, [isElectron, isDesktop, pollViewOptions, viewMode]);

  // TitleBar right controls - filters, create
  const titleBarRightControls = useMemo(() => {
    if (!isElectron || !isDesktop) return null;
    return (
      <TitleBarPollControls
        hasActiveFilters={hasActiveFilters}
        onFilterToggle={() => setIsFilterMenuVisible(!isFilterMenuVisible)}
        onFilterButtonLayout={setFilterButtonPosition}
        canCreatePoll={canCreatePoll}
        onNewPoll={handleCreatePoll}
      />
    );
  }, [isElectron, isDesktop, hasActiveFilters, isFilterMenuVisible, canCreatePoll, handleCreatePoll]);

  // Integrate controls with TitleBar in Electron
  useTitleBarControlsIntegration({
    pageTitle: 'Опросы',
    leftControls: titleBarLeftControls,
    rightControls: titleBarRightControls,
    enabled: isElectron && isDesktop,
  });

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

  // Handler for back navigation
  const handleGoBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.card }]}
      edges={['left', 'right']}
    >
      {Platform.OS === 'ios' && <StatusBar style={isDark ? 'light' : 'dark'} />}
      {/* Header - скрываем для Electron desktop, так как контролы уже в TitleBar */}
      {!(isElectron && isDesktop) && (
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
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onGoBack={navigation.canGoBack() ? handleGoBack : undefined}
        />
      )}

      {/* Content */}
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        {isDesktop ? (
          <PollViewSwitcher
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
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        ) : (
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
            isDesktop={false}
          />
        )}
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
