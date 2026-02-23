import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
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

  // Smooth view transition state
  const [displayedViewMode, setDisplayedViewMode] = useState<ViewMode>(viewMode);
  const [viewTransitioning, setViewTransitioning] = useState(false);
  const skipTransition = useRef(true);

  // Enable transitions after initial load
  useEffect(() => {
    const timer = setTimeout(() => { skipTransition.current = false; }, 400);
    return () => clearTimeout(timer);
  }, []);

  // Animate view mode change on web
  useEffect(() => {
    if (viewMode === displayedViewMode) return;
    if (Platform.OS === 'web' && !skipTransition.current) {
      setViewTransitioning(true);
      const timer = setTimeout(() => {
        setDisplayedViewMode(viewMode);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setViewTransitioning(false);
          });
        });
      }, 150);
      return () => clearTimeout(timer);
    } else {
      setDisplayedViewMode(viewMode);
    }
  }, [viewMode, displayedViewMode]);

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
      <View style={[
        styles.content,
        Platform.OS === 'web' && styles.viewTransition,
        viewTransitioning && styles.viewTransitionFadeOut,
      ]}>
        {displayedViewMode === 'grid' && (
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

        {displayedViewMode === 'table' && (
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
  viewTransition: {
    ...Platform.select({
      web: {
        transition: 'opacity 0.15s ease-in-out',
      },
    }),
  } as any,
  viewTransitionFadeOut: {
    opacity: 0,
  },
});
