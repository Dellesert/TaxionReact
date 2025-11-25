/**
 * NotificationItem Component
 * Компонент для отображения одного уведомления
 */

import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Notification, NotificationType } from '@types/notification.types';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useTheme } from '@shared/hooks/useTheme';
import { Avatar } from '@components/common/Avatar';
import { Swipeable } from 'react-native-gesture-handler';

interface NotificationItemProps {
  notification: Notification;
  onPress?: (notification: Notification) => void;
  onMarkAsRead?: (id: number) => void;
  onDelete?: (id: number) => void;
}

// Иконки для разных типов уведомлений
const getNotificationIcon = (type: NotificationType): keyof typeof Ionicons.glyphMap => {
  switch (type) {
    case 'message':
      return 'chatbubble';
    case 'task':
      return 'checkmark-circle';
    case 'event':
      return 'calendar';
    case 'poll':
      return 'bar-chart';
    case 'mention':
      return 'at';
    case 'reaction':
      return 'heart';
    case 'system':
      return 'information-circle';
    case 'reminder':
      return 'alarm';
    default:
      return 'notifications';
  }
};

// Цвета для разных типов
const getNotificationColor = (type: NotificationType): string => {
  switch (type) {
    case 'message':
      return '#3B82F6'; // Blue
    case 'task':
      return '#10B981'; // Green
    case 'event':
      return '#8B5CF6'; // Purple
    case 'poll':
      return '#F59E0B'; // Amber
    case 'mention':
      return '#EC4899'; // Pink
    case 'reaction':
      return '#EF4444'; // Red
    case 'system':
      return '#6B7280'; // Gray
    case 'reminder':
      return '#F59E0B'; // Amber (same as poll)
    default:
      return '#3B82F6';
  }
};

// Фоновые цвета для непрочитанных (светлая тема)
const getBackgroundColorLight = (type: NotificationType, isRead: boolean): string => {
  if (isRead) {
    return '#FFFFFF';
  }

  switch (type) {
    case 'message':
      return '#EFF6FF'; // Blue-50
    case 'task':
      return '#ECFDF5'; // Green-50
    case 'event':
      return '#F5F3FF'; // Purple-50
    case 'poll':
      return '#FFFBEB'; // Amber-50
    case 'mention':
      return '#FDF2F8'; // Pink-50
    case 'reaction':
      return '#FEF2F2'; // Red-50
    case 'system':
      return '#F9FAFB'; // Gray-50
    case 'reminder':
      return '#FFFBEB'; // Amber-50 (same as poll)
    default:
      return '#EFF6FF';
  }
};

// Фоновые цвета для непрочитанных (темная тема)
const getBackgroundColorDark = (type: NotificationType, isRead: boolean): string => {
  if (isRead) {
    return '#1F2937';
  }

  switch (type) {
    case 'message':
      return '#1E3A8A'; // Blue-900
    case 'task':
      return '#064E3B'; // Green-900
    case 'event':
      return '#4C1D95'; // Purple-900
    case 'poll':
      return '#78350F'; // Amber-900
    case 'mention':
      return '#831843'; // Pink-900
    case 'reaction':
      return '#7F1D1D'; // Red-900
    case 'system':
      return '#374151'; // Gray-700
    case 'reminder':
      return '#78350F'; // Amber-900 (same as poll)
    default:
      return '#1E3A8A';
  }
};

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onPress,
  onMarkAsRead,
  onDelete,
}) => {
  const { theme, isDark } = useTheme();
  const swipeableRef = useRef<Swipeable>(null);
  const iconName = getNotificationIcon(notification.type);
  const iconColor = getNotificationColor(notification.type);
  const backgroundColor = isDark
    ? getBackgroundColorDark(notification.type, notification.is_read)
    : getBackgroundColorLight(notification.type, notification.is_read);

  const handlePress = () => {
    if (!notification.is_read && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
    onPress?.(notification);
  };

  const handleDelete = () => {
    onDelete?.(notification.id);
  };

  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
    locale: ru,
  });

  // Check if this is a grouped notification (multiple tasks)
  const isGrouped = notification.data?.task_ids && notification.data.task_ids.length > 1;
  const taskCount = notification.data?.task_count || notification.message_count;

  const renderRightActions = () => {
    return (
      <View style={styles.swipeAction}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={24} color="#FFFFFF" />
          <Text style={styles.deleteButtonText}>Удалить</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={onDelete ? renderRightActions : undefined}
      overshootRight={false}
      friction={2}
    >
      <TouchableOpacity
        style={[styles.container, { backgroundColor, borderBottomColor: theme.border }]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
      <View style={styles.content}>
        {/* Avatar with badge */}
        {notification.sender ? (
          <View style={styles.avatarWrapper}>
            <Avatar
              name={notification.sender.name}
              imageUrl={notification.sender.avatar_url}
              size={48}
            />
            <View style={[styles.badge, { backgroundColor: theme.background }]}>
              <Ionicons name={iconName} size={12} color={iconColor} />
            </View>
            {/* Count badge for grouped notifications */}
            {isGrouped && taskCount && taskCount > 1 && (
              <View style={[styles.countBadge, { backgroundColor: iconColor }]}>
                <Text style={styles.countText}>{taskCount}</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.iconContainer, { backgroundColor: iconColor }]}>
            <Ionicons name={iconName} size={24} color="#FFFFFF" />
            {/* Count badge for grouped notifications without sender */}
            {isGrouped && taskCount && taskCount > 1 && (
              <View style={[styles.countBadgeIcon, { backgroundColor: theme.background }]}>
                <Text style={[styles.countTextIcon, { color: iconColor }]}>{taskCount}</Text>
              </View>
            )}
          </View>
        )}

        {/* Контент */}
        <View style={styles.textContainer}>
          <Text
            style={[
              styles.title,
              { color: theme.text },
              !notification.is_read && styles.unreadTitle,
            ]}
            numberOfLines={2}
          >
            {notification.title}
          </Text>
          <Text style={[styles.message, { color: theme.textSecondary }]} numberOfLines={3}>
            {notification.message}
          </Text>
          <Text style={[styles.time, { color: theme.textTertiary }]}>{timeAgo}</Text>
        </View>

        {/* Индикатор непрочитанного */}
        {!notification.is_read && <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />}
      </View>
      </TouchableOpacity>
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  avatarWrapper: {
    position: 'relative',
    width: 48,
    height: 48,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  unreadTitle: {
    fontWeight: '600',
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  time: {
    fontSize: 11,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
    marginTop: 6,
  },
  badge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  countText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  countBadgeIcon: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  countTextIcon: {
    fontSize: 11,
    fontWeight: '700',
  },
  swipeAction: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});

export default NotificationItem;
