import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '@hooks/useTheme';
import { useNotification } from '@contexts/NotificationContext';
import * as pollApi from '@api/poll.api';
import { PollVoter, PollVotersList } from '@/types/poll.types';
import Avatar from '@/components/common/Avatar';

type PollStackParamList = {
  PollList: undefined;
  PollDetail: { pollId: number };
  EditPoll: { pollId: number };
  PollVoters: { pollId: number };
};

type PollVotersScreenRouteProp = RouteProp<PollStackParamList, 'PollVoters'>;
type PollVotersScreenNavigationProp = StackNavigationProp<PollStackParamList, 'PollVoters'>;

type ViewMode = 'users' | 'options';

const PollVotersScreen: React.FC = () => {
  const navigation = useNavigation<PollVotersScreenNavigationProp>();
  const route = useRoute<PollVotersScreenRouteProp>();
  const { theme } = useTheme();
  const { showError } = useNotification();

  const [votersData, setVotersData] = useState<PollVotersList | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('users');

  useEffect(() => {
    loadVoters();
  }, [route.params.pollId]);

  const loadVoters = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await pollApi.getPollVoters(route.params.pollId);
      setVotersData(data);
    } catch (error: any) {
      console.error('Failed to load voters:', error);
      setError(error.message || 'Не удалось загрузить список проголосовавших');

      // Show error for access denied
      if (error.message?.includes('access denied') || error.message?.includes('доступ')) {
        showError('У вас нет прав для просмотра списка проголосовавших');
        navigation.goBack();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Группировка пользователей по вариантам
  const votersByOption = useMemo(() => {
    if (!votersData) return {};

    const grouped: { [option: string]: PollVoter[] } = {};

    votersData.voters.forEach(voter => {
      if (voter.options && voter.options.length > 0) {
        voter.options.forEach(option => {
          if (!grouped[option]) {
            grouped[option] = [];
          }
          grouped[option].push(voter);
        });
      }
    });

    return grouped;
  }, [votersData]);

  const renderVoterItem = ({ item }: { item: PollVoter }) => (
    <View style={[styles.voterItem, { backgroundColor: theme.backgroundSecondary }]}>
      <View style={styles.voterHeader}>
        <Avatar
          name={item.user_name}
          imageUrl={item.avatar}
          size={48}
        />
        <View style={styles.voterInfo}>
          <Text style={[styles.voterName, { color: theme.text }]}>
            {item.user_name}
          </Text>
          {item.position && (
            <Text style={[styles.voterEmail, { color: theme.textSecondary }]}>
              {item.position}
            </Text>
          )}
        </View>
      </View>

      {item.options && item.options.length > 0 && (
        <View style={styles.voterChoices}>
          <Text style={[styles.choicesLabel, { color: theme.textSecondary }]}>
            Выбрано:
          </Text>
          <View style={styles.choicesRow}>
            {item.options.map((option, index) => (
              <View key={index} style={[styles.choiceChip, { backgroundColor: theme.primary + '15' }]}>
                <Text style={[styles.choiceText, { color: theme.primary }]}>
                  {option}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {item.comment && (
        <View style={styles.voterComment}>
          <Text style={[styles.commentLabel, { color: theme.textSecondary }]}>
            Комментарий:
          </Text>
          <Text style={[styles.commentText, { color: theme.text }]}>
            {item.comment}
          </Text>
        </View>
      )}

      <Text style={[styles.votedDate, { color: theme.textSecondary }]}>
        Проголосовал: {new Date(item.voted_at).toLocaleString('ru-RU')}
      </Text>
    </View>
  );

  const renderCompactVoterItem = (voter: PollVoter) => (
    <View key={voter.user_id} style={styles.compactVoterItem}>
      <Avatar
        name={voter.user_name}
        imageUrl={voter.avatar}
        size={32}
      />
      <View style={styles.compactVoterInfo}>
        <Text style={[styles.compactVoterName, { color: theme.text }]}>
          {voter.user_name}
        </Text>
        {voter.comment && (
          <Text style={[styles.compactVoterComment, { color: theme.textSecondary }]} numberOfLines={1}>
            {voter.comment}
          </Text>
        )}
      </View>
    </View>
  );

  const renderOptionGroup = (option: string, voters: PollVoter[]) => (
    <View key={option} style={[styles.optionGroup, { backgroundColor: theme.backgroundSecondary }]}>
      <View style={[styles.optionHeader, { borderBottomColor: theme.border }]}>
        <Text style={[styles.optionTitle, { color: theme.text }]}>{option}</Text>
        <View style={[styles.optionBadge, { backgroundColor: theme.primary + '20' }]}>
          <Text style={[styles.optionBadgeText, { color: theme.primary }]}>
            {voters.length}
          </Text>
        </View>
      </View>
      <View style={styles.optionVotersList}>
        {voters.map(voter => renderCompactVoterItem(voter))}
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadVoters}>
            <Text style={styles.retryButtonText}>Попробовать снова</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Кто проголосовал</Text>
      </View>

      {votersData && votersData.voters.length > 0 ? (
        <>
          <View style={[styles.controls, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
            <View style={styles.summary}>
              <Text style={[styles.summaryText, { color: theme.textSecondary }]}>
                Всего проголосовало: {votersData.total_voters}
              </Text>
            </View>

            <View style={[styles.viewModeSwitch, { backgroundColor: theme.backgroundSecondary }]}>
              <TouchableOpacity
                style={[
                  styles.viewModeButton,
                  viewMode === 'users' && { backgroundColor: theme.primary },
                ]}
                onPress={() => setViewMode('users')}
              >
                <Ionicons
                  name="people"
                  size={18}
                  color={viewMode === 'users' ? '#FFFFFF' : theme.textSecondary}
                />
                <Text
                  style={[
                    styles.viewModeButtonText,
                    { color: viewMode === 'users' ? '#FFFFFF' : theme.textSecondary },
                  ]}
                >
                  Пользователи
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.viewModeButton,
                  viewMode === 'options' && { backgroundColor: theme.primary },
                ]}
                onPress={() => setViewMode('options')}
              >
                <Ionicons
                  name="list"
                  size={18}
                  color={viewMode === 'options' ? '#FFFFFF' : theme.textSecondary}
                />
                <Text
                  style={[
                    styles.viewModeButtonText,
                    { color: viewMode === 'options' ? '#FFFFFF' : theme.textSecondary },
                  ]}
                >
                  По вариантам
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {viewMode === 'users' ? (
            <FlatList
              data={votersData.voters}
              renderItem={renderVoterItem}
              keyExtractor={(item) => item.user_id.toString()}
              contentContainerStyle={styles.list}
            />
          ) : (
            <ScrollView contentContainerStyle={styles.list}>
              {Object.entries(votersByOption).map(([option, voters]) =>
                renderOptionGroup(option, voters)
              )}
            </ScrollView>
          )}
        </>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color="#9CA3AF" />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Пока никто не проголосовал
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  controls: {
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
  },
  summary: {
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  viewModeSwitch: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 4,
  },
  viewModeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 6,
  },
  viewModeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  list: {
    padding: 16,
  },
  voterItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  voterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  voterInfo: {
    flex: 1,
    marginLeft: 12,
  },
  voterName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  voterEmail: {
    fontSize: 13,
  },
  voterChoices: {
    marginTop: 8,
    marginBottom: 8,
  },
  choicesLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  choicesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  choiceChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  choiceText: {
    fontSize: 13,
    fontWeight: '500',
  },
  voterComment: {
    marginTop: 8,
    marginBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  commentLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  votedDate: {
    fontSize: 12,
    marginTop: 4,
  },
  // Compact voter item (for options view)
  compactVoterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  compactVoterInfo: {
    flex: 1,
    marginLeft: 10,
  },
  compactVoterName: {
    fontSize: 14,
    fontWeight: '500',
  },
  compactVoterComment: {
    fontSize: 12,
    marginTop: 2,
  },
  // Option group styles
  optionGroup: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  optionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 12,
  },
  optionBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  optionVotersList: {
    paddingVertical: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginTop: 12,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default PollVotersScreen;
