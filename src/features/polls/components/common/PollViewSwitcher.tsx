import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Poll } from '../../types/poll.types';
import { PollListContent } from '../lists/PollListContent';
import { PollTableView } from '../lists/PollTableView';

const STORAGE_KEY = '@poll_view_mode';

export type ViewMode = 'grid' | 'table';

interface PollViewSwitcherProps {
  polls: Poll[];
  isLoading: boolean;
  isLoadingMore: boolean;
  refreshing: boolean;
  error: string | null;
  hasMore: boolean;
  onPollPress: (poll: Poll) => void;
  onRefresh: () => void;
  onLoadMore: () => void;
  onRetry: () => void;
  onViewModeChange?: (mode: ViewMode) => void;
  viewMode?: ViewMode;
}

export const PollViewSwitcher: React.FC<PollViewSwitcherProps> = (props) => {
  const [internalViewMode, setInternalViewMode] = useState<ViewMode>('grid');

  // Use viewMode from props if provided, otherwise use internal state
  const viewMode = props.viewMode ?? internalViewMode;

  // Load saved view mode on mount (only if viewMode not provided via props)
  useEffect(() => {
    if (props.viewMode === undefined) {
      loadViewMode();
    }
  }, [props.viewMode]);

  const loadViewMode = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved && (saved === 'grid' || saved === 'table')) {
        setInternalViewMode(saved as ViewMode);
        props.onViewModeChange?.(saved as ViewMode);
      }
    } catch (error) {
      console.error('Failed to load view mode:', error);
    }
  };

  // Save to AsyncStorage when viewMode changes
  useEffect(() => {
    const saveViewMode = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, viewMode);
      } catch (error) {
        console.error('Failed to save view mode:', error);
      }
    };
    saveViewMode();
  }, [viewMode]);

  return (
    <View style={styles.container}>
      {/* Content based on view mode */}
      <View style={styles.content}>
        {viewMode === 'grid' && (
          <PollListContent
            polls={props.polls}
            isLoading={props.isLoading}
            isLoadingMore={props.isLoadingMore}
            refreshing={props.refreshing}
            error={props.error}
            hasMore={props.hasMore}
            onPollPress={props.onPollPress}
            onRefresh={props.onRefresh}
            onLoadMore={props.onLoadMore}
            onRetry={props.onRetry}
            isDesktop={true}
          />
        )}

        {viewMode === 'table' && (
          <PollTableView
            polls={props.polls}
            isLoading={props.isLoading}
            isLoadingMore={props.isLoadingMore}
            refreshing={props.refreshing}
            error={props.error}
            hasMore={props.hasMore}
            onPollPress={props.onPollPress}
            onRefresh={props.onRefresh}
            onLoadMore={props.onLoadMore}
            onRetry={props.onRetry}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
