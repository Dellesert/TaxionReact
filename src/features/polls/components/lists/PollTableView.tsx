import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Poll } from '../../types/poll.types';
import { useTheme } from '@shared/hooks/useTheme';
import { useAuthStore } from '@shared/store/authStore';
import { Avatar } from '@shared/components/common/Avatar';
import { PollListEmptyState } from '../states/PollListEmptyState';
import { PollListErrorState } from '../states/PollListErrorState';

interface PollTableViewProps {
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

export const PollTableView: React.FC<PollTableViewProps> = ({
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
  const { user } = useAuthStore();

  // Hover state for rows (web only)
  const [hoveredRowId, setHoveredRowId] = useState<number | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#10B981';
      case 'closed':
        return '#6B7280';
      case 'draft':
        return '#F59E0B';
      case 'cancelled':
        return '#EF4444';
      default:
        return '#9CA3AF';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Активен';
      case 'closed':
        return 'Завершен';
      case 'draft':
        return 'Черновик';
      case 'cancelled':
        return 'Отменен';
      default:
        return status;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'single_choice':
        return 'radio-button-on';
      case 'multiple_choice':
        return 'checkbox';
      case 'rating':
        return 'star';
      case 'ranking':
        return 'list';
      case 'open_text':
        return 'text';
      default:
        return 'help-circle';
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'single_choice':
        return 'Один выбор';
      case 'multiple_choice':
        return 'Множественный';
      case 'rating':
        return 'Оценка';
      case 'ranking':
        return 'Ранжирование';
      case 'open_text':
        return 'Текст';
      default:
        return type;
    }
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return 'globe-outline';
      case 'department':
        return 'business-outline';
      case 'invite_only':
        return 'mail-outline';
      case 'private':
        return 'lock-closed-outline';
      default:
        return 'help-circle-outline';
    }
  };

  const getVisibilityText = (poll: Poll) => {
    switch (poll.visibility) {
      case 'public':
        return 'Публичный';
      case 'department':
        return poll.department_name || 'Департамент';
      case 'invite_only':
        return 'Приглашенные';
      case 'private':
        return 'Приватный';
      default:
        return poll.visibility;
    }
  };

  const getVisibilityColor = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return '#3B82F6';
      case 'department':
        return '#8B5CF6';
      case 'invite_only':
        return '#F59E0B';
      case 'private':
        return '#6B7280';
      default:
        return '#9CA3AF';
    }
  };

  const getCreatorName = (poll: Poll) => {
    // Check if creator is current user
    if (user && poll.created_by === user.id) {
      return 'Я';
    }

    if (!poll.creator) {
      return poll.created_by ? `Пользователь #${poll.created_by}` : 'Неизвестно';
    }
    return poll.creator.name || poll.creator.email || `Пользователь #${poll.created_by}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Error state
  if (error) {
    return <PollListErrorState error={error} onRetry={onRetry} />;
  }

  // Loading state (initial)
  if (isLoading && !refreshing && polls.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  // Empty state
  if (polls.length === 0 && !isLoading) {
    return <PollListEmptyState />;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={[styles.tableContainer, { borderColor: theme.border, backgroundColor: theme.card }]}>
          {/* Header */}
          <View style={[styles.headerRow, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            <View style={[styles.headerCell, styles.titleColumn]}>
              <Text style={[styles.headerText, { color: theme.text }]}>Название</Text>
            </View>

            <View style={[styles.headerCell, styles.statusColumn]}>
              <Text style={[styles.headerText, { color: theme.text }]}>Статус</Text>
            </View>

            <View style={[styles.headerCell, styles.typeColumn]}>
              <Text style={[styles.headerText, { color: theme.text }]}>Тип</Text>
            </View>

            <View style={[styles.headerCell, styles.visibilityColumn]}>
              <Text style={[styles.headerText, { color: theme.text }]}>Видимость</Text>
            </View>

            <View style={[styles.headerCell, styles.statsColumn]}>
              <Text style={[styles.headerText, { color: theme.text }]}>Голоса</Text>
            </View>

            <View style={[styles.headerCell, styles.dateColumn]}>
              <Text style={[styles.headerText, { color: theme.text }]}>Дедлайн</Text>
            </View>

            <View style={[styles.headerCell, styles.creatorColumn]}>
              <Text style={[styles.headerText, { color: theme.text }]}>Автор</Text>
            </View>
          </View>

          {/* Body */}
          {polls.map((poll, index) => {
            const isHovered = hoveredRowId === poll.id;
            const isEvenRow = index % 2 === 0;
            const isLastRow = index === polls.length - 1;

            return (
              <TouchableOpacity
                key={poll.id}
                style={[
                  styles.row,
                  {
                    backgroundColor: isEvenRow ? theme.card : 'transparent',
                    borderBottomColor: theme.border,
                  },
                  isLastRow && { borderBottomWidth: 0 },
                  isHovered && { backgroundColor: theme.primary + '12' },
                ]}
                onPress={() => onPollPress(poll)}
                // @ts-ignore - web-only props
                onMouseEnter={Platform.OS === 'web' ? () => setHoveredRowId(poll.id) : undefined}
                onMouseLeave={Platform.OS === 'web' ? () => setHoveredRowId(null) : undefined}
              >
                {/* Title Column */}
                <View style={[styles.cell, styles.titleColumn]}>
                  <Text style={[styles.cellText, { color: theme.text, fontWeight: '500' }]} numberOfLines={1}>
                    {poll.title}
                  </Text>
                </View>

                {/* Status Column */}
                <View style={[styles.cell, styles.statusColumn]}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(poll.status) }]}>
                    <Text style={styles.statusText}>{getStatusText(poll.status)}</Text>
                  </View>
                </View>

                {/* Type Column */}
                <View style={[styles.cell, styles.typeColumn]}>
                  <View style={styles.typeContainer}>
                    <Ionicons name={getTypeIcon(poll.type) as any} size={14} color={theme.primary} />
                    <Text style={[styles.cellText, { color: theme.text }]}>
                      {getTypeText(poll.type)}
                    </Text>
                  </View>
                </View>

                {/* Visibility Column */}
                <View style={[styles.cell, styles.visibilityColumn]}>
                  <View style={styles.visibilityBadge}>
                    <Ionicons name={getVisibilityIcon(poll.visibility) as any} size={12} color={getVisibilityColor(poll.visibility)} />
                    <Text style={[styles.cellText, { color: theme.text }]}>
                      {getVisibilityText(poll)}
                    </Text>
                  </View>
                </View>

                {/* Stats Column */}
                <View style={[styles.cell, styles.statsColumn]}>
                  <View style={styles.statItem}>
                    <Ionicons name="people-outline" size={14} color={theme.textSecondary} />
                    <Text style={[styles.cellText, { color: theme.text }]}>
                      {poll.total_voters || 0}
                    </Text>
                  </View>
                </View>

                {/* Deadline Column */}
                <View style={[styles.cell, styles.dateColumn]}>
                  {poll.end_time && poll.status === 'active' ? (
                    <View style={styles.deadlineContainer}>
                      <Ionicons name="time-outline" size={14} color="#EF4444" />
                      <Text style={[styles.cellText, { color: '#EF4444' }]}>
                        {formatDate(poll.end_time)}
                      </Text>
                    </View>
                  ) : (
                    <Text style={[styles.cellText, { color: theme.textSecondary }]}>—</Text>
                  )}
                </View>

                {/* Creator Column */}
                <View style={[styles.cell, styles.creatorColumn]}>
                  <View style={styles.creatorContainer}>
                    <Avatar
                      name={getCreatorName(poll)}
                      imageUrl={poll.creator?.avatar}
                      size={22}
                    />
                    <Text style={[styles.cellText, { color: theme.text }]} numberOfLines={1}>
                      {getCreatorName(poll)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Load More Indicator */}
        {isLoadingMore && hasMore && (
          <View style={styles.loadMoreContainer}>
            <ActivityIndicator size="small" color={theme.primary} />
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  tableContainer: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    padding: 8,
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    ...(Platform.OS === 'web' && {
      position: 'sticky',
      top: 0,
      zIndex: 10,
    }),
  },
  headerCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    opacity: 0.7,
  },
  titleColumn: {
    flex: 3,
    minWidth: 200,
  },
  statusColumn: {
    flex: 1,
    minWidth: 100,
  },
  typeColumn: {
    flex: 1.2,
    minWidth: 120,
  },
  visibilityColumn: {
    flex: 1.2,
    minWidth: 120,
  },
  statsColumn: {
    flex: 0.8,
    minWidth: 80,
  },
  dateColumn: {
    flex: 1,
    minWidth: 100,
  },
  creatorColumn: {
    flex: 1,
    minWidth: 100,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    minHeight: 40,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
    }),
  },
  cell: {
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 13,
    lineHeight: 18,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  visibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deadlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  creatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadMoreContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
