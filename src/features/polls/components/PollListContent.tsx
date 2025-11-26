import React from 'react';
import { View, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Poll } from '../types/poll.types';
import { PollItem } from '../components/PollItem';
import { PollSkeleton } from '../components/PollSkeleton';
import { useTheme } from '@shared/hooks/useTheme';
import { PollListEmptyState } from './PollListEmptyState';
import { PollListErrorState } from './PollListErrorState';

interface PollListContentProps {
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
}

export const PollListContent: React.FC<PollListContentProps> = ({
  polls,
  isLoading,
  isLoadingMore,
  refreshing,
  error,
  hasMore,
  onPollPress,
  onRefresh,
  onLoadMore,
  onRetry,
}) => {
  const { theme } = useTheme();
  const [canLoadMore, setCanLoadMore] = React.useState(false);

  // Reset canLoadMore when new data is loading
  React.useEffect(() => {
    if (isLoading) {
      setCanLoadMore(false);
    }
  }, [isLoading]);

  // Enable load more after initial load completes
  React.useEffect(() => {
    if (!isLoading && !isLoadingMore && polls.length > 0) {
      // Wait a bit before allowing load more to prevent immediate trigger
      const timer = setTimeout(() => setCanLoadMore(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, isLoadingMore, polls.length]);

  // Error state
  if (error) {
    return <PollListErrorState error={error} onRetry={onRetry} />;
  }

  // Loading state (initial)
  if (isLoading && !refreshing && polls.length === 0) {
    return (
      <View style={{ flex: 1, paddingTop: 8 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <PollSkeleton key={i} />
        ))}
      </View>
    );
  }

  // Empty state
  if (polls.length === 0 && !isLoading) {
    return <PollListEmptyState />;
  }

  // List
  return (
    <FlashList
      data={polls}
      keyExtractor={(item) => item.id.toString()}
      estimatedItemSize={150}
      renderItem={({ item }) => <PollItem poll={item} onPress={onPollPress} />}
      contentContainerStyle={styles.listContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      onEndReached={() => {
        if (hasMore && !isLoadingMore && !isLoading && canLoadMore) {
          onLoadMore();
        }
      }}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        isLoadingMore && hasMore ? (
          <View style={styles.loadMoreContainer}>
            <ActivityIndicator size="small" color={theme.primary} />
          </View>
        ) : null
      }
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingTop: 8,
    paddingBottom: 120,
  },
  loadMoreContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
