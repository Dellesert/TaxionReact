import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@shared/hooks/useTheme';
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
}

export const PollViewSwitcher: React.FC<PollViewSwitcherProps> = (props) => {
  const { theme } = useTheme();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Load saved view mode on mount
  useEffect(() => {
    loadViewMode();
  }, []);

  const loadViewMode = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved && (saved === 'grid' || saved === 'table')) {
        setViewMode(saved as ViewMode);
      }
    } catch (error) {
      console.error('Failed to load view mode:', error);
    }
  };

  const saveViewMode = async (mode: ViewMode) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, mode);
      setViewMode(mode);
      props.onViewModeChange?.(mode);
    } catch (error) {
      console.error('Failed to save view mode:', error);
    }
  };

  const handleViewModeChange = (mode: ViewMode) => {
    saveViewMode(mode);
  };

  // Notify parent when viewMode is loaded
  useEffect(() => {
    props.onViewModeChange?.(viewMode);
  }, [viewMode]);

  const tabs = [
    { id: 'grid' as ViewMode, label: 'Сетка', icon: 'grid-outline' },
    { id: 'table' as ViewMode, label: 'Таблица', icon: 'reorder-four-outline' },
  ];

  return (
    <View style={styles.container}>
      {/* View Mode Tabs */}
      <View style={[styles.tabsContainer, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              viewMode === tab.id && [styles.activeTab, { borderBottomColor: theme.primary }],
            ]}
            onPress={() => handleViewModeChange(tab.id)}
          >
            <Ionicons
              name={tab.icon as any}
              size={20}
              color={viewMode === tab.id ? theme.primary : theme.textSecondary}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: viewMode === tab.id ? theme.primary : theme.textSecondary },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

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
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
});
