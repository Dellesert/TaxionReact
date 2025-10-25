import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Poll, PollStatus } from '../../types/poll.types';
import { PollItem } from '@components/poll/PollItem';
import { PollSkeleton } from '@components/poll/PollSkeleton';
import * as pollApi from '@api/poll.api';
import { useTheme } from '@hooks/useTheme';
import { useAuthStore } from '@store/authStore';
import { PollStackParamList } from '@navigation/types';

type PollFilter = 'all' | 'active' | 'closed';
type PollListScreenNavigationProp = StackNavigationProp<PollStackParamList, 'PollList'>;

const PollListScreen: React.FC = () => {
  const navigation = useNavigation<PollListScreenNavigationProp>();
  const { theme } = useTheme();
  const currentUser = useAuthStore((state) => state.user);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<PollFilter>('all');
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadPolls();
  }, [filter]); // Reload when filter changes

  // Reload polls when screen is focused (e.g., after creating a new poll)
  useFocusEffect(
    useCallback(() => {
      loadPolls();
    }, [filter])
  );

  const loadPolls = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const filters = filter !== 'all' ? { status: filter as PollStatus } : undefined;
      const loadedPolls = await pollApi.getPolls(filters);
      setPolls(loadedPolls);
    } catch (error: any) {
      console.error('Failed to load polls:', error);
      setError(error.message || 'Failed to load polls');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPolls();
    setRefreshing(false);
  };

  const handlePollPress = (poll: Poll) => {
    console.log('Poll pressed:', poll.id);
    navigation.navigate('PollDetail', { pollId: poll.id });
  };

  const handleCreatePoll = () => {
    console.log('Create new poll');
    navigation.navigate('CreatePoll');
  };

  // Check if user can create polls (manager or admin)
  const canCreatePoll = currentUser?.role === 'manager' || currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft} />
          <Text style={[styles.headerTitle, { color: theme.text }]}>Опросы</Text>
          {canCreatePoll ? (
            <TouchableOpacity onPress={handleCreatePoll} style={styles.createButton}>
              <Text style={[styles.addButtonText, { color: theme.primary }]}>+</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.headerLeft} />
          )}
        </View>

        {/* Search Bar */}
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

        {/* Status Tabs */}
        <View style={styles.tabsContainer}>
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
                onPress={() => setFilter(tab.key)}
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
      </View>

      {/* Error */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#E94444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadPolls}>
            <Text style={styles.retryButtonText}>Попробовать снова</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading with skeletons */}
      {isLoading && !refreshing && polls.length === 0 ? (
        <View style={{ flex: 1, paddingTop: 8 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <PollSkeleton key={i} />
          ))}
        </View>
      ) : (
        <>
          {/* Polls List */}
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
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 0,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    width: 40,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  createButton: {
    paddingHorizontal: 4,
  },
  addButtonText: {
    fontSize: 38,
    fontWeight: '200',
    lineHeight: 38,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  tabsContainer: {
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
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
    fontWeight: '500',
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
});

export default PollListScreen;
