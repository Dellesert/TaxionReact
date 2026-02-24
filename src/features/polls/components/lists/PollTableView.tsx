import React, { useState, useCallback } from 'react';
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
  const { theme, isDark } = useTheme();
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

  // Render empty state
  const renderEmpty = useCallback(() => {
    if (isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      );
    }
    return <PollListEmptyState />;
  }, [isLoading, theme]);

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
    <View style={[styles.listCard, { backgroundColor: isDark ? theme.card : '#FFFFFF', borderColor: theme.border }]}>
      {/* Table Header */}
      <View style={[styles.tableHeaderRow, { borderColor: theme.border }]}>
        <Text style={[styles.tableHeaderCell, styles.colTitle, { color: theme.textSecondary }]}>Название</Text>
        <Text style={[styles.tableHeaderCell, styles.colStatus, { color: theme.textSecondary }]}>Статус</Text>
        <Text style={[styles.tableHeaderCell, styles.colType, { color: theme.textSecondary }]}>Тип</Text>
        <Text style={[styles.tableHeaderCell, styles.colVisibility, { color: theme.textSecondary }]}>Видимость</Text>
        <Text style={[styles.tableHeaderCell, styles.colStats, { color: theme.textSecondary }]}>Голоса</Text>
        <Text style={[styles.tableHeaderCell, styles.colDate, { color: theme.textSecondary }]}>Дедлайн</Text>
        <Text style={[styles.tableHeaderCell, styles.colCreator, { color: theme.textSecondary }]}>Автор</Text>
      </View>

      {/* Table Body */}
      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.tableScrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {polls.length === 0 ? (
          renderEmpty()
        ) : (
          polls.map((poll) => {
            const isHovered = hoveredRowId === poll.id;

            return (
              <TouchableOpacity
                key={poll.id}
                style={[
                  styles.tableRow,
                  { borderColor: theme.border, backgroundColor: isDark ? theme.card : '#FFFFFF' },
                  isHovered && { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' },
                ]}
                onPress={() => onPollPress(poll)}
                activeOpacity={0.7}
                // @ts-ignore - web only
                onMouseEnter={Platform.OS === 'web' ? () => setHoveredRowId(poll.id) : undefined}
                // @ts-ignore - web only
                onMouseLeave={Platform.OS === 'web' ? () => setHoveredRowId(null) : undefined}
              >
                {/* Title */}
                <View style={[styles.tableCell, styles.colTitle]}>
                  <Text style={[styles.tableCellText, { color: theme.text, fontWeight: '500' }]} numberOfLines={1}>
                    {poll.title}
                  </Text>
                </View>

                {/* Status */}
                <View style={[styles.tableCell, styles.colStatus]}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(poll.status) }]}>
                    <Text style={styles.statusText}>{getStatusText(poll.status)}</Text>
                  </View>
                </View>

                {/* Type */}
                <View style={[styles.tableCell, styles.colType]}>
                  <Ionicons name={getTypeIcon(poll.type) as any} size={14} color={theme.primary} />
                  <Text style={[styles.tableCellText, { color: theme.text }]} numberOfLines={1}>
                    {getTypeText(poll.type)}
                  </Text>
                </View>

                {/* Visibility */}
                <View style={[styles.tableCell, styles.colVisibility]}>
                  <Ionicons name={getVisibilityIcon(poll.visibility) as any} size={12} color={getVisibilityColor(poll.visibility)} />
                  <Text style={[styles.tableCellText, { color: theme.text }]} numberOfLines={1}>
                    {getVisibilityText(poll)}
                  </Text>
                </View>

                {/* Stats */}
                <View style={[styles.tableCell, styles.colStats]}>
                  <Ionicons name="people-outline" size={14} color={theme.textSecondary} />
                  <Text style={[styles.tableCellText, { color: theme.textSecondary }]}>
                    {poll.total_voters || 0}
                  </Text>
                </View>

                {/* Deadline */}
                <View style={[styles.tableCell, styles.colDate]}>
                  {poll.end_time && poll.status === 'active' ? (
                    <>
                      <Ionicons name="time-outline" size={14} color="#EF4444" />
                      <Text style={[styles.tableCellText, { color: '#EF4444' }]}>
                        {formatDate(poll.end_time)}
                      </Text>
                    </>
                  ) : (
                    <Text style={[styles.tableCellText, { color: theme.textTertiary }]}>—</Text>
                  )}
                </View>

                {/* Creator */}
                <View style={[styles.tableCell, styles.colCreator]}>
                  <Avatar
                    name={getCreatorName(poll)}
                    imageUrl={poll.creator?.avatar}
                    size={28}
                  />
                  <Text style={[styles.tableCellText, { color: theme.text }]} numberOfLines={1}>
                    {getCreatorName(poll)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

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
  // Card container matching absence listCard style
  listCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    margin: 16,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      // @ts-ignore - web only
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    }),
  },
  // Table header row
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  tableHeaderCell: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    lineHeight: 16,
  },
  tableScrollContent: {
    flexGrow: 1,
  },
  // Table row
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    ...(Platform.OS === 'web' ? {
      // @ts-ignore - web only
      cursor: 'pointer',
      transitionProperty: 'background-color',
      transitionDuration: '0.2s',
    } : {}),
  },
  // Table cell
  tableCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 12,
  },
  tableCellText: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  // Column widths
  colTitle: {
    flex: 2.5,
  },
  colStatus: {
    flex: 1,
  },
  colType: {
    flex: 1.3,
  },
  colVisibility: {
    flex: 1.3,
  },
  colStats: {
    width: 70,
    justifyContent: 'center',
  },
  colDate: {
    flex: 1.2,
  },
  colCreator: {
    flex: 1.5,
  },
  // Status badge
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
  },
  // States
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
    minWidth: '100%',
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
