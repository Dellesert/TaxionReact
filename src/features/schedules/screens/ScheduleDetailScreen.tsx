import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';

import { useTheme } from '@shared/hooks/useTheme';
import { Avatar } from '@shared/components/common/Avatar';
import { UserProfileModal } from '@shared/components/common/UserProfileModal';
import { getOrCreateDirectChat } from '@/features/chat/api/chat.api';
import { useScheduleDetails } from '../hooks/useScheduleDetails';
import { ScheduleWeekView } from '../components/ScheduleWeekView';
import { formatScheduleDate } from '../utils/scheduleHelpers';
import { getScheduleTypeColor } from '../utils/shiftColors';
import {
  SCHEDULE_TYPE_LABELS,
  VISIBILITY_LABELS,
  type ScheduleEntry,
} from '../types/schedule.types';
import type { ScheduleStackParamList } from '../navigation/types';

type RouteProps = RouteProp<ScheduleStackParamList, 'ScheduleDetail'>;

export const ScheduleDetailScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProps>();
  const { scheduleId } = route.params;

  const { schedule, entries, isLoading, isLoadingEntries, error, refresh } =
    useScheduleDetails(scheduleId);

  const [showProfileModal, setShowProfileModal] = React.useState(false);
  const [selectedUserId, setSelectedUserId] = React.useState<number | null>(null);

  const handleCreatorPress = useCallback(() => {
    if (schedule?.creator?.id) {
      setSelectedUserId(schedule.creator.id);
      setShowProfileModal(true);
    }
  }, [schedule?.creator?.id]);

  const handleOpenChat = useCallback(async (userId: number) => {
    try {
      const chat = await getOrCreateDirectChat(userId);
      setShowProfileModal(false);
      const rootNavigation = navigation.getParent();
      if (rootNavigation) {
        // @ts-ignore
        rootNavigation.navigate('Chats', {
          screen: 'Chat',
          params: { chatId: chat.id },
        });
      }
    } catch (error) {
      console.error('Failed to open chat:', error);
    }
  }, [navigation]);

  const handleEntryPress = useCallback((entry: ScheduleEntry) => {
    // TODO: Navigate to entry details or show modal
    console.log('Entry pressed:', entry);
  }, []);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  if (isLoading && !schedule) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error && !schedule) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.primary }]}
            onPress={refresh}
          >
            <Text style={styles.retryButtonText}>Повторить</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!schedule) return null;

  const typeColor = schedule.color || getScheduleTypeColor(schedule.type);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text
          style={[styles.headerTitle, { color: theme.text }]}
          numberOfLines={1}
        >
          {schedule.title}
        </Text>
        <TouchableOpacity style={styles.menuButton}>
          <Ionicons name="ellipsis-vertical" size={20} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isLoading || isLoadingEntries}
            onRefresh={refresh}
            tintColor={theme.primary}
          />
        }
      >
        {/* Schedule Info Card */}
        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: theme.backgroundSecondary,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={[styles.colorBar, { backgroundColor: typeColor }]} />

          <View style={styles.infoContent}>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
                Тип
              </Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>
                {SCHEDULE_TYPE_LABELS[schedule.type]}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
                Период
              </Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>
                {formatScheduleDate(schedule.start_date, 'dd.MM.yyyy')} —{' '}
                {formatScheduleDate(schedule.end_date, 'dd.MM.yyyy')}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
                Видимость
              </Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>
                {VISIBILITY_LABELS[schedule.visibility]}
              </Text>
            </View>

            {/* Creator Block */}
            {schedule.creator && (
              <TouchableOpacity
                style={[styles.creatorBlock, { borderTopColor: theme.border }]}
                onPress={handleCreatorPress}
                activeOpacity={0.7}
              >
                <Avatar
                  name={schedule.creator.name}
                  imageUrl={schedule.creator.avatar}
                  size={40}
                />
                <View style={styles.creatorInfo}>
                  <Text style={[styles.creatorName, { color: theme.text }]}>
                    {schedule.creator.name}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            )}

            {schedule.description && (
              <View style={styles.descriptionRow}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
                  Описание
                </Text>
                <Text style={[styles.description, { color: theme.text }]}>
                  {schedule.description}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Entries Section */}
        <View style={styles.entriesSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Записи ({entries.length})
            </Text>
            <TouchableOpacity
              style={[styles.addEntryButton, { borderColor: theme.primary }]}
            >
              <Ionicons name="add" size={18} color={theme.primary} />
              <Text style={[styles.addEntryText, { color: theme.primary }]}>
                Добавить
              </Text>
            </TouchableOpacity>
          </View>

          {isLoadingEntries ? (
            <View style={styles.entriesLoader}>
              <ActivityIndicator size="small" color={theme.primary} />
            </View>
          ) : entries.length > 0 ? (
            <ScheduleWeekView entries={entries} onEntryPress={handleEntryPress} />
          ) : (
            <View style={styles.emptyEntries}>
              <Ionicons
                name="document-outline"
                size={36}
                color={theme.textSecondary}
              />
              <Text
                style={[styles.emptyEntriesText, { color: theme.textSecondary }]}
              >
                Нет записей в этом графике
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <UserProfileModal
        visible={showProfileModal}
        userId={selectedUserId}
        onClose={() => {
          setShowProfileModal(false);
          setSelectedUserId(null);
        }}
        onOpenChat={handleOpenChat}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 8,
  },
  menuButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  infoCard: {
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  colorBar: {
    height: 4,
  },
  infoContent: {
    padding: 16,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 13,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  descriptionRow: {
    gap: 4,
    paddingTop: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  creatorBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: 1,
    gap: 12,
  },
  creatorInfo: {
    flex: 1,
    gap: 2,
  },
  creatorName: {
    fontSize: 15,
    fontWeight: '600',
  },
  creatorTime: {
    fontSize: 13,
  },
  entriesSection: {
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  addEntryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  addEntryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  entriesLoader: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyEntries: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyEntriesText: {
    fontSize: 14,
  },
});
