import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Poll } from '../../types/poll.types';
import { useTheme } from '@shared/hooks/useTheme';
import { useAuthStore } from '@shared/store/authStore';
import { Avatar } from '@shared/components/common/Avatar';
import { DataTable, DataTableColumn } from '@shared/components/common/DataTable';
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

// ─── Helpers ─────────────────────────────────────────────────────

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return '#10B981';
    case 'closed': return '#6B7280';
    case 'draft': return '#F59E0B';
    case 'cancelled': return '#EF4444';
    default: return '#9CA3AF';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'active': return 'Активен';
    case 'closed': return 'Завершен';
    case 'draft': return 'Черновик';
    case 'cancelled': return 'Отменен';
    default: return status;
  }
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'single_choice': return 'radio-button-on';
    case 'multiple_choice': return 'checkbox';
    case 'rating': return 'star';
    case 'ranking': return 'list';
    case 'open_text': return 'text';
    default: return 'help-circle';
  }
};

const getTypeText = (type: string) => {
  switch (type) {
    case 'single_choice': return 'Один выбор';
    case 'multiple_choice': return 'Множественный';
    case 'rating': return 'Оценка';
    case 'ranking': return 'Ранжирование';
    case 'open_text': return 'Текст';
    default: return type;
  }
};

const getVisibilityIcon = (visibility: string) => {
  switch (visibility) {
    case 'public': return 'globe-outline';
    case 'department': return 'business-outline';
    case 'invite_only': return 'mail-outline';
    case 'private': return 'lock-closed-outline';
    default: return 'help-circle-outline';
  }
};

const getVisibilityColor = (visibility: string) => {
  switch (visibility) {
    case 'public': return '#3B82F6';
    case 'department': return '#8B5CF6';
    case 'invite_only': return '#F59E0B';
    case 'private': return '#6B7280';
    default: return '#9CA3AF';
  }
};

const formatDate = (dateString?: string) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// ─── Component ───────────────────────────────────────────────────

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

  const getVisibilityText = useCallback((poll: Poll) => {
    switch (poll.visibility) {
      case 'public': return 'Публичный';
      case 'department': return poll.department_name || 'Департамент';
      case 'invite_only': return 'Приглашенные';
      case 'private': return 'Приватный';
      default: return poll.visibility;
    }
  }, []);

  const getCreatorName = useCallback((poll: Poll) => {
    if (user && poll.created_by === user.id) return 'Я';
    if (!poll.creator) return poll.created_by ? `Пользователь #${poll.created_by}` : 'Неизвестно';
    return poll.creator.name || poll.creator.email || `Пользователь #${poll.created_by}`;
  }, [user]);

  const columns: DataTableColumn<Poll>[] = useMemo(() => [
    {
      key: 'title',
      title: 'Название',
      flex: 2.5,
      sortable: true,
      sortValue: (poll) => poll.title.toLowerCase(),
      render: (poll, theme) => (
        <Text style={[localStyles.cellText, { color: theme.text, fontWeight: '500' }]} numberOfLines={1}>
          {poll.title}
        </Text>
      ),
    },
    {
      key: 'status',
      title: 'Статус',
      flex: 1,
      sortable: true,
      sortValue: (poll) => poll.status,
      render: (poll) => (
        <View style={[localStyles.statusBadge, { backgroundColor: getStatusColor(poll.status) }]}>
          <Text style={localStyles.statusText}>{getStatusText(poll.status)}</Text>
        </View>
      ),
    },
    {
      key: 'type',
      title: 'Тип',
      flex: 1.3,
      render: (poll, theme) => (
        <>
          <Ionicons name={getTypeIcon(poll.type) as any} size={14} color={theme.primary} />
          <Text style={[localStyles.cellText, { color: theme.text }]} numberOfLines={1}>
            {getTypeText(poll.type)}
          </Text>
        </>
      ),
    },
    {
      key: 'visibility',
      title: 'Видимость',
      flex: 1.3,
      render: (poll, theme) => (
        <>
          <Ionicons name={getVisibilityIcon(poll.visibility) as any} size={12} color={getVisibilityColor(poll.visibility)} />
          <Text style={[localStyles.cellText, { color: theme.text }]} numberOfLines={1}>
            {getVisibilityText(poll)}
          </Text>
        </>
      ),
    },
    {
      key: 'stats',
      title: 'Голоса',
      width: 70,
      sortable: true,
      sortValue: (poll) => poll.total_voters || 0,
      render: (poll, theme) => (
        <>
          <Ionicons name="people-outline" size={14} color={theme.textSecondary} />
          <Text style={[localStyles.cellText, { color: theme.textSecondary }]}>
            {poll.total_voters || 0}
          </Text>
        </>
      ),
    },
    {
      key: 'deadline',
      title: 'Дедлайн',
      flex: 1.2,
      sortable: true,
      sortValue: (poll) => poll.end_time || 'zzzz',
      render: (poll, theme) => {
        if (poll.end_time && poll.status === 'active') {
          return (
            <>
              <Ionicons name="time-outline" size={14} color="#EF4444" />
              <Text style={[localStyles.cellText, { color: '#EF4444' }]}>
                {formatDate(poll.end_time)}
              </Text>
            </>
          );
        }
        return <Text style={[localStyles.cellText, { color: theme.textTertiary }]}>—</Text>;
      },
    },
    {
      key: 'creator',
      title: 'Автор',
      flex: 1.5,
      render: (poll, theme) => (
        <>
          <Avatar
            name={getCreatorName(poll)}
            imageUrl={poll.creator?.avatar}
            size={28}
          />
          <Text style={[localStyles.cellText, { color: theme.text }]} numberOfLines={1}>
            {getCreatorName(poll)}
          </Text>
        </>
      ),
    },
  ], [getVisibilityText, getCreatorName]);

  // Error state
  if (error) {
    return <PollListErrorState error={error} onRetry={onRetry} />;
  }

  // Loading state (initial)
  if (isLoading && !refreshing && polls.length === 0) {
    return (
      <View style={localStyles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  // Empty state
  if (polls.length === 0 && !isLoading) {
    return <PollListEmptyState />;
  }

  return (
    <DataTable<Poll>
      columns={columns}
      data={polls}
      keyExtractor={(poll) => String(poll.id)}
      onRowPress={onPollPress}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      renderAfterRows={
        isLoadingMore && hasMore ? (
          <View style={localStyles.loadMoreContainer}>
            <ActivityIndicator size="small" color={theme.primary} />
          </View>
        ) : undefined
      }
    />
  );
};

const localStyles = StyleSheet.create({
  cellText: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
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
