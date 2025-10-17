import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Poll, PollStatus } from '@types/poll.types';
import { PollItem } from '@components/poll/PollItem';
import { mockGetPolls, isMockMode } from '@utils/mockData';

type PollFilter = 'all' | 'active' | 'closed';

const PollListScreen: React.FC = () => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<PollFilter>('all');

  useEffect(() => {
    loadPolls();
  }, []);

  const loadPolls = async () => {
    try {
      setIsLoading(true);
      if (isMockMode()) {
        const mockPolls = await mockGetPolls();
        setPolls(mockPolls);
      }
    } catch (error) {
      console.error('Failed to load polls:', error);
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
    // TODO: Navigate to poll detail/vote screen
  };

  const handleCreatePoll = () => {
    console.log('Create new poll');
    // TODO: Navigate to create poll screen
  };

  const filteredPolls = polls.filter((poll) => {
    if (filter === 'all') return true;
    return poll.status === filter;
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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Опросы</Text>
        <TouchableOpacity onPress={handleCreatePoll} style={styles.createButton}>
          <Ionicons name="add" size={26} color="#ff0000ff" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="bar-chart-outline" size={24} color="#E94444" />
          <Text style={styles.statValue}>{polls.length}</Text>
          <Text style={styles.statLabel}>Всего</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="pulse-outline" size={24} color="#10B981" />
          <Text style={styles.statValue}>{activeCount}</Text>
          <Text style={styles.statLabel}>Активных</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="checkmark-done-outline" size={24} color="#3B82F6" />
          <Text style={styles.statValue}>{votedCount}</Text>
          <Text style={styles.statLabel}>Проголосовал</Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        {filterButtons.map((btn, index) => (
          <TouchableOpacity
            key={btn.key}
            onPress={() => setFilter(btn.key)}
            style={[
              styles.filterButton,
              filter === btn.key && styles.filterButtonActive,
              index > 0 && styles.filterButtonMargin,
            ]}
          >
            <Ionicons
              name={btn.icon as any}
              size={16}
              color={filter === btn.key ? 'white' : '#6B7280'}
            />
            <Text
              style={[
                styles.filterButtonText,
                filter === btn.key && styles.filterButtonTextActive,
              ]}
            >
              {btn.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Polls List */}
      {filteredPolls.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="bar-chart-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>Нет опросов</Text>
          <Text style={styles.emptySubtitle}>
            Создайте первый опрос для вашей команды
          </Text>
        </View>
      ) : (
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  createButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterButtonActive: {
    backgroundColor: '#E94444',
    borderColor: '#E94444',
  },
  filterButtonMargin: {
    marginLeft: 8,
  },
  filterButtonText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 16,
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
});

export default PollListScreen;
