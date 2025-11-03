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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
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
  const [filter, setFilter] = useState<PollFilter>('active');
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPollId, setEditingPollId] = useState<number | null>(null);
  const [isFilterMenuVisible, setIsFilterMenuVisible] = useState(false);

  // Animation for search
  const searchAnimation = useRef(new RNAnimated.Value(0)).current;

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

  const filterOptions: { key: PollFilter; label: string }[] = [
    { key: 'all', label: 'Все' },
    { key: 'active', label: 'Активные' },
    { key: 'closed', label: 'Завершенные' },
  ];

  // Stats
  const activeCount = polls.filter((p) => p.status === 'active').length;
  const votedCount = polls.filter((p) => p.user_has_voted).length;


  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.card }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <ScreenHeader
        title="Опросы"
        customContent={
          <>
            <View style={styles.headerRow}>
              <View style={[styles.headerLeft, styles.headerActions]}>
                {/* Filter Button with indicator */}
                <TouchableOpacity
                  onPress={() => setIsFilterMenuVisible(!isFilterMenuVisible)}
                  style={styles.iconButton}
                >
                  <Ionicons name="filter" size={24} color={theme.error} />
                  {filter !== 'active' && <View style={styles.filterIndicator} />}
                </TouchableOpacity>
              </View>

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
          </>
        }
      />

      {/* Content */}
      <View style={{ flex: 1, backgroundColor: theme.background }}>
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
            {filteredPolls.length === 0 && !error ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="bar-chart-outline" size={64} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>Нет опросов</Text>
                <Text style={styles.emptySubtitle}>
                  Создайте первый опрос для вашей команды
                </Text>
              </View>
            ) : !error && (
              <FlatList
                data={filteredPolls}
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

      {/* Filter Menu Dropdown */}
      {isFilterMenuVisible && (
        <Modal
          visible={isFilterMenuVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setIsFilterMenuVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setIsFilterMenuVisible(false)}
          >
            <View style={[styles.filterMenu, { backgroundColor: theme.card }]}>
              {filterOptions.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.filterMenuItem,
                    filter === option.key && styles.filterMenuItemActive,
                  ]}
                  onPress={() => {
                    setFilter(option.key);
                    setIsFilterMenuVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.filterMenuItemText,
                      { color: theme.text },
                      filter === option.key && { color: theme.primary, fontWeight: '600' },
                    ]}
                  >
                    {option.label}
                  </Text>
                  {filter === option.key && (
                    <Ionicons name="checkmark" size={20} color={theme.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      )}

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
  filterIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E94444',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  filterMenu: {
    position: 'absolute',
    top: 60,
    left: 16,
    minWidth: 180,
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  filterMenuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 8,
  },
  filterMenuItemActive: {
    backgroundColor: 'rgba(233, 68, 68, 0.1)',
  },
  filterMenuItemText: {
    fontSize: 15,
    fontWeight: '500',
  },
});

export default PollListScreen;
