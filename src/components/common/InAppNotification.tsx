/**
 * InAppNotification Component
 * Toast-уведомление, которое появляется сверху экрана при получении новых уведомлений
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';
import { Notification, NotificationType } from '@types/notification.types';
import { Avatar } from '@components/common/Avatar';

interface InAppNotificationProps {
  notification: Notification;
  onPress: () => void;
  onDismiss: () => void;
  duration?: number; // Длительность показа в мс (по умолчанию 4000)
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

// Цвета для разных типов уведомлений
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
      return '#EF4444'; // Red
    case 'reaction':
      return '#EC4899'; // Pink
    case 'system':
      return '#6B7280'; // Gray
    case 'reminder':
      return '#F59E0B'; // Amber (same as poll)
    default:
      return '#3B82F6';
  }
};

export const InAppNotification: React.FC<InAppNotificationProps> = ({
  notification,
  onPress,
  onDismiss,
  duration = 4000,
}) => {
  const { theme, isDark } = useTheme();
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Анимация появления
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 10,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Автоматическое скрытие через заданное время
    const timer = setTimeout(() => {
      dismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  const handlePress = () => {
    dismiss();
    setTimeout(() => {
      onPress();
    }, 300);
  };

  const iconColor = getNotificationColor(notification.type);
  const iconName = getNotificationIcon(notification.type);

  // Используем непрозрачный фон в зависимости от темы
  const backgroundColor = isDark ? '#1F2937' : '#FFFFFF';

  // Check if this is a grouped notification (multiple tasks)
  const isGrouped = notification.data?.task_ids && notification.data.task_ids.length > 1;
  const taskCount = notification.data?.task_count || notification.message_count;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: backgroundColor,
          borderLeftColor: iconColor,
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.content}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        {/* Avatar or Icon */}
        {notification.sender ? (
          <View style={styles.avatarWrapper}>
            <Avatar
              name={notification.sender.name}
              imageUrl={notification.sender.avatar_url}
              size={40}
            />
            <View style={[styles.badge, { backgroundColor }]}>
              <Ionicons name={iconName} size={10} color={iconColor} />
            </View>
            {/* Count badge for grouped notifications */}
            {isGrouped && taskCount && taskCount > 1 && (
              <View style={[styles.countBadge, { backgroundColor: iconColor }]}>
                <Text style={styles.countText}>{taskCount}</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
            <Ionicons name={iconName} size={24} color={iconColor} />
            {/* Count badge for grouped notifications without sender */}
            {isGrouped && taskCount && taskCount > 1 && (
              <View style={[styles.countBadgeIcon, { backgroundColor }]}>
                <Text style={[styles.countTextIcon, { color: iconColor }]}>{taskCount}</Text>
              </View>
            )}
          </View>
        )}

        {/* Content */}
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {notification.title}
          </Text>
          {notification.message && (
            <Text style={[styles.message, { color: theme.textSecondary }]} numberOfLines={2}>
              {notification.message}
            </Text>
          )}
        </View>

        {/* Close button */}
        <TouchableOpacity
          onPress={dismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.closeButton}
        >
          <Ionicons name="close" size={20} color={theme.textTertiary} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 10,
    left: 12,
    right: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 9999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  avatarWrapper: {
    position: 'relative',
    width: 40,
    height: 40,
    marginRight: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  badge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  countBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  countText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  countBadgeIcon: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  countTextIcon: {
    fontSize: 10,
    fontWeight: '700',
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
  },
  closeButton: {
    padding: 4,
  },
});
