import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Animated as RNAnimated,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Poll, PollStatus } from '../../types/poll.types';
import { PollItem } from '@components/poll/PollItem';
import { PollSkeleton } from '@components/poll/PollSkeleton';
import { ScreenHeader } from '@components/common/ScreenHeader';
import * as pollApi from '@api/poll.api';
import { useTheme } from '@hooks/useTheme';
import { useAuthStore } from '@store/authStore';
import { PollStackParamList } from '@navigation/types';
import CreatePollModal from '@components/poll/CreatePollModal';
import EditPollModal from '@components/poll/EditPollModal';

type PollFilter = 'all' | 'active' | 'closed';
type PollListScreenNavigationProp = StackNavigationProp<PollStackParamList, 'PollList'>;

const SCREEN_WIDTH = Dimensions.get('window').width;
const POLLS_PER_PAGE = 20;

const PollListScreen: React.FC = () => {
  const navigation = useNavigation<PollListScreenNavigationProp>();
  const { theme } = useTheme();
  const currentUser = useAuthStore((state) => state.user);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<PollFilter>('all');
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPollId, setEditingPollId] = useState<number | null>(null);

  // Animation for search
  const searchAnimation = useRef(new RNAnimated.Value(0)).current;

  // Animation for tab transitions (slide with Reanimated)
  const translateX = useSharedValue(0);
  const isSwipingHorizontally = useSharedValue(false);
  const currentTabIndex = useSharedValue(0); // Track current tab index

  useEffect(() => {
    loadPolls();
  }, [filter]); // Reload when filter changes

  useEffect(() => {
    RNAnimated.timing(searchAnimation, {
      toValue: isSearchVisible ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isSearchVisible]);

  // Reload polls when screen is focused (e.g., after creating a new poll)
  useFocusEffect(
    useCallback(() => {
      loadPolls();
    }, [filter])
  );

  const loadPolls = async (append: boolean = false) => {
    try {
      if (!append) {
        setIsLoading(true);
      }
      setError(null);
      const filters = filter !== 'all' ? { status: filter as PollStatus } : undefined;
      const offset = append ? polls.length : 0;
      const response = await pollApi.getPolls(filters, POLLS_PER_PAGE, offset);

      if (append) {
        setPolls([...polls, ...response.polls]);
      } else {
        setPolls(response.polls);
      }
      setTotal(response.total);
      setHasMore(response.hasMore);
    } catch (error: any) {
      console.error('Failed to load polls:', error);
      setError(error.message || 'Failed to load polls');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPolls(false);
    setRefreshing(false);
  };

  const handleLoadMore = async () => {
    if (!hasMore || isLoadingMore) return;

    setIsLoadingMore(true);
    await loadPolls(true);
    setIsLoadingMore(false);
  };

  const handlePollPress = (poll: Poll) => {
    // Block poll press if currently swiping horizontally
    if (isSwipingHorizontally.value) {
      return;
    }
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

  // Swipe gesture to switch tabs (iOS only)
  const filterTabsOrder: PollFilter[] = ['all', 'active', 'closed'];

  const switchToFilter = (newFilter: PollFilter) => {
    setFilter(newFilter);
    // Animate to the new tab position on iOS
    if (Platform.OS === 'ios') {
      const newIndex = filterTabsOrder.indexOf(newFilter);
      currentTabIndex.value = newIndex;
      translateX.value = withTiming(-newIndex * SCREEN_WIDTH, { duration: 300 });
    }
  };

  const resetSwipeFlag = () => {
    setTimeout(() => {
      isSwipingHorizontally.value = false;
    }, 100);
  };

  // Initialize translateX based on active filter
  useEffect(() => {
    if (Platform.OS === 'ios') {
      const currentIndex = filterTabsOrder.indexOf(filter);
      currentTabIndex.value = currentIndex;
      translateX.value = -currentIndex * SCREEN_WIDTH;
    }
  }, []);

  const swipeGesture = Gesture.Pan()
    .enabled(Platform.OS === 'ios')
    .maxPointers(1)
    .onBegin(() => {
      'worklet';
      isSwipingHorizontally.value = false;
    })
    .onUpdate((event) => {
      'worklet';
      // Detect if this is a horizontal swipe
      const absX = Math.abs(event.translationX);
      const absY = Math.abs(event.translationY);

      // If horizontal movement is dominant, follow it
      if (absX > absY || absX > 3) {
        isSwipingHorizontally.value = true;
        // Calculate base position for current tab using shared value
        const baseOffset = -currentTabIndex.value * SCREEN_WIDTH;
        // Follow finger movement from base position
        translateX.value = baseOffset + event.translationX;
      }
    })
    .onEnd((event) => {
      'worklet';
      const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3; // 30% of screen width
      const VELOCITY_THRESHOLD = 500;
      const currentIndex = currentTabIndex.value;

      const shouldSwitchTab = Math.abs(event.translationX) > SWIPE_THRESHOLD || Math.abs(event.velocityX) > VELOCITY_THRESHOLD;

      let targetIndex = currentIndex;

      if (shouldSwitchTab && event.translationX > 0 && currentIndex > 0) {
        // Swipe right - go to previous tab
        targetIndex = currentIndex - 1;
      } else if (shouldSwitchTab && event.translationX < 0 && currentIndex < 2) {
        // Swipe left - go to next tab (max index is 2)
        targetIndex = currentIndex + 1;
      }

      // Animate to target tab
      const targetOffset = -targetIndex * SCREEN_WIDTH;
      translateX.value = withTiming(targetOffset, {
        duration: 250,
      }, () => {
        // Update current tab index after animation completes
        currentTabIndex.value = targetIndex;
      });

      // Update active filter if changed
      if (targetIndex !== currentIndex) {
        runOnJS(setFilter)(filterTabsOrder[targetIndex]);
      }

      // Reset swipe flag
      runOnJS(resetSwipeFlag)();
    });

  // Animated style for content - horizontal container with all tabs
  const animatedContentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // Check if user can create polls (department_head or admin)
  const canCreatePoll = currentUser?.role === 'department_head' || currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  const filteredPolls = polls.filter((poll) => {
    // Filter by status
    const statusMatch = filter === 'all' || poll.status === filter;

    // Filter by search query
    const searchLower = searchQuery.toLowerCase().trim();
    const searchMatch = !searchLower ||
      poll.title.toLowerCase().includes(searchLower) ||
      poll.description?.toLowerCase().includes(searchLower) ||
      poll.category?.toLowerCase().includes(searchLower);

    return statusMatch && searchMatch;
  });

  const filterButtons: { key: PollFilter; label: string; icon: string }[] = [
    { key: 'all', label: 'Все', icon: 'apps-outline' },
    { key: 'active', label: 'Активные', icon: 'play-circle-outline' },
    { key: 'closed', label: 'Завершены', icon: 'checkmark-circle-outline' },
  ];

  // Stats
  const activeCount = polls.filter((p) => p.status === 'active').length;
  const votedCount = polls.filter((p) => p.user_has_voted).length;

  // Render a single tab content
  const renderFilterContent = (filterKey: PollFilter) => {
    const tabPolls = polls.filter((poll) => {
      const statusMatch = filterKey === 'all' || poll.status === filterKey;
      const searchLower = searchQuery.toLowerCase().trim();
      const searchMatch = !searchLower ||
        poll.title.toLowerCase().includes(searchLower) ||
        poll.description?.toLowerCase().includes(searchLower) ||
        poll.category?.toLowerCase().includes(searchLower);
      return statusMatch && searchMatch;
    });

    return (
      <View key={filterKey} style={{ width: SCREEN_WIDTH, height: '100%' }}>
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color="#E94444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadPolls}>
              <Text style={styles.retryButtonText}>Попробовать снова</Text>
            </TouchableOpacity>
          </View>
        )}

        {isLoading && !refreshing && polls.length === 0 ? (
          <View style={{ flex: 1, paddingTop: 8 }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <PollSkeleton key={i} />
            ))}
          </View>
        ) : (
          <>
            {tabPolls.length === 0 && !error ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="bar-chart-outline" size={64} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>Нет опросов</Text>
                <Text style={styles.emptySubtitle}>
                  Создайте первый опрос для вашей команды
                </Text>
              </View>
            ) : !error && (
              <FlatList
                data={tabPolls}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => <PollItem poll={item} onPress={handlePollPress} />}
                contentContainerStyle={styles.listContent}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
                ListFooterComponent={
                  hasMore ? (
                    <View style={styles.loadMoreContainer}>
                      <TouchableOpacity
                        style={[styles.loadMoreButton, { backgroundColor: theme.backgroundTertiary }]}
                        onPress={handleLoadMore}
                        disabled={isLoadingMore}
                      >
                        {isLoadingMore ? (
                          <ActivityIndicator size="small" color={theme.primary} />
                        ) : (
                          <>
                            <Ionicons name="chevron-down" size={20} color={theme.primary} />
                            <Text style={[styles.loadMoreText, { color: theme.primary }]}>
                              Ещё {total - polls.length}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  ) : null
                }
              />
            )}
          </>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.card }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <ScreenHeader
        title="Опросы"
        customContent={
          <>
            <View style={styles.headerRow}>
              <View style={styles.headerLeft} />
              <Text style={[styles.headerTitle, { color: theme.text }]}>Опросы</Text>
              <View style={[styles.headerRight, styles.headerActions]}>
                {/* Search Button */}
                <TouchableOpacity
                  onPress={() => setIsSearchVisible(!isSearchVisible)}
                  style={styles.iconButton}
                >
                  <Ionicons name={isSearchVisible ? "close" : "search"} size={24} color={theme.error} />
                </TouchableOpacity>

                {/* Add Button */}
                {canCreatePoll && (
                  <TouchableOpacity onPress={handleCreatePoll} style={styles.iconButton}>
                    <Ionicons name="add" size={30} color={theme.primary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Animated Search Input */}
            <RNAnimated.View
              style={[
                styles.animatedSearchContainer,
                {
                  height: searchAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 48],
                  }),
                  opacity: searchAnimation,
                  marginBottom: searchAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 12],
                  }),
                },
              ]}
            >
              <View style={[styles.searchContainer, { backgroundColor: theme.backgroundTertiary }]}>
                <Ionicons name="search" size={20} color={theme.textTertiary} />
                <TextInput
                  style={[styles.searchInput, { color: theme.text }]}
                  placeholder="Поиск..."
                  placeholderTextColor={theme.inputPlaceholder}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={20} color={theme.textTertiary} />
                  </TouchableOpacity>
                )}
              </View>
            </RNAnimated.View>

            {/* Status Tabs */}
            <View style={[styles.tabsContainer, { borderTopColor: theme.border }]}>
              {filterButtons.map((tab) => {
                const count = tab.key === 'all' ? polls.length : tab.key === 'active' ? activeCount : polls.filter(p => p.status === 'closed').length;
                const isActive = filter === tab.key;
                const tabColor = tab.key === 'all' ? '#E94444' : tab.key === 'active' ? '#10B981' : '#6B7280';
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[
                      styles.tab,
                      isActive && { ...styles.tabActive, borderBottomColor: tabColor },
                    ]}
                    onPress={() => switchToFilter(tab.key)}
                  >
                    <View style={styles.tabContent}>
                      <Text
                        style={[
                          styles.tabLabel,
                          { color: theme.textSecondary },
                          isActive && { ...styles.tabLabelActive, color: tabColor },
                        ]}
                      >
                        {tab.label}
                      </Text>
                      {count > 0 && (
                        <Text
                          style={[
                            styles.tabCount,
                            {
                              backgroundColor: isActive ? tabColor : theme.backgroundTertiary,
                              color: isActive ? '#FFFFFF' : theme.textTertiary,
                            },
                          ]}
                        >
                          {count}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        }
      />

      {/* Content container with horizontal tabs (iOS) or single tab (Android) */}
      <View style={{ flex: 1, backgroundColor: theme.background, overflow: 'hidden' }}>
        <GestureDetector gesture={swipeGesture}>
          <Animated.View style={[styles.horizontalTabsContainer, animatedContentStyle]}>
            {Platform.OS === 'ios' ? (
              // Render all tabs side by side for iOS swipe
              filterTabsOrder.map((filterKey) => renderFilterContent(filterKey))
            ) : (
              // Render only active tab for Android
              renderFilterContent(filter)
            )}
          </Animated.View>
        </GestureDetector>
      </View>

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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    width: 100,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 100,
    justifyContent: 'flex-end',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconButton: {
    padding: 4,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  animatedSearchContainer: {
    overflow: 'hidden',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginTop: 0,
    paddingTop: 4,
    borderTopWidth: 1,
    borderBottomWidth: 0,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: 'transparent',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabLabelActive: {
    fontWeight: '700',
  },
  tabCount: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 22,
    textAlign: 'center',
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 120, // Для iOS с учетом tab bar
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#E94444',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  horizontalTabsContainer: {
    flexDirection: 'row',
    width: SCREEN_WIDTH * 3, // 3 tabs
    height: '100%',
  },
  loadMoreContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    gap: 6,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default PollListScreen;
