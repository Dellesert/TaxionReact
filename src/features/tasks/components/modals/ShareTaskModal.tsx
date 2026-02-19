/**
 * ShareTaskModal
 * Модалка для выбора чата, в который будет отправлена задача
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { useAnimationType } from '@shared/hooks/useAnimationType';
import { useNotification } from '@shared/contexts/NotificationContext';
import { useChatStore } from '@shared/store/chatStore';
import { useAuthStore } from '@shared/store/authStore';
import { Chat } from '@/features/chat/types/chat.types';
import { Task } from '../../types/task.types';

interface ShareTaskModalProps {
  visible: boolean;
  onClose: () => void;
  task: Task;
  onShare: (chatId: number) => Promise<void>;
}

const ShareTaskModal: React.FC<ShareTaskModalProps> = ({
  visible,
  onClose,
  task,
  onShare,
}) => {
  const { theme } = useTheme();
  const animationType = useAnimationType('slide');
  const { showSuccess, showError } = useNotification();
  const { chats, loadChats } = useChatStore();
  const currentUser = useAuthStore((state) => state.user);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (visible) {
      loadChatList();
    }
  }, [visible]);

  const loadChatList = async () => {
    try {
      setIsLoading(true);
      await loadChats();
    } catch (error) {
      console.error('Failed to load chats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShareToChat = async (chatId: number) => {
    try {
      setIsSending(true);
      await onShare(chatId);

      showSuccess('Задача отправлена в чат');
      onClose();
    } catch (error: any) {
      console.error('Failed to share task:', error);
      showError(error.message || 'Не удалось отправить задачу');
    } finally {
      setIsSending(false);
    }
  };

  const getChatName = (chat: Chat) => {
    if (chat.name) return chat.name;

    // Для личных чатов показываем имя собеседника
    if (chat.type === 'private' && chat.members && currentUser) {
      const otherMember = chat.members.find(m => m.user_id !== currentUser.id);
      return otherMember?.user?.name || 'Неизвестный пользователь';
    }

    return 'Чат без названия';
  };

  const getChatAvatar = (chat: Chat) => {
    if (chat.type === 'private' && chat.members && currentUser) {
      const otherMember = chat.members.find(m => m.user_id !== currentUser.id);
      const name = otherMember?.user?.name || '?';
      const words = name.split(' ');
      if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }

    const name = chat.name || 'G';
    return name.substring(0, 2).toUpperCase();
  };

  const getPriorityColor = () => {
    switch (task.priority) {
      case 'critical':
        return '#DC2626';
      case 'high':
        return '#EA580C';
      case 'medium':
        return '#CA8A04';
      case 'low':
        return '#16A34A';
      default:
        return theme.textSecondary;
    }
  };

  const getPriorityText = () => {
    switch (task.priority) {
      case 'critical':
        return 'Критический';
      case 'high':
        return 'Высокий';
      case 'medium':
        return 'Средний';
      case 'low':
        return 'Низкий';
      default:
        return '';
    }
  };

  const renderChatItem = ({ item }: { item: Chat }) => {
    return (
      <TouchableOpacity
        style={[styles.chatItem, { backgroundColor: theme.card, borderBottomColor: theme.border }]}
        onPress={() => handleShareToChat(item.id)}
        disabled={isSending}
      >
        <View style={[styles.chatAvatar, { backgroundColor: theme.primary + '20' }]}>
          <Text style={[styles.chatAvatarText, { color: theme.primary }]}>
            {getChatAvatar(item)}
          </Text>
        </View>

        <View style={styles.chatInfo}>
          <Text style={[styles.chatName, { color: theme.text }]} numberOfLines={1}>
            {getChatName(item)}
          </Text>
          {item.type === 'group' && (
            <Text style={[styles.chatMembers, { color: theme.textSecondary }]}>
              {item.member_count || item.members?.length || 0} участников
            </Text>
          )}
        </View>

        <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
      </TouchableOpacity>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.background,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    closeButton: {
      padding: 4,
    },
    headerTitle: {
      flex: 1,
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      marginLeft: 12,
    },
    taskInfo: {
      backgroundColor: theme.card,
      padding: 16,
      marginHorizontal: 16,
      marginTop: 12,
      borderRadius: 12,
      borderLeftWidth: 3,
      borderLeftColor: getPriorityColor(),
    },
    taskTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 4,
    },
    taskDescription: {
      fontSize: 13,
      color: theme.textSecondary,
      marginBottom: 8,
    },
    taskMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaText: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textSecondary,
      textTransform: 'uppercase',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.backgroundSecondary,
    },
    chatItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
    },
    chatAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chatAvatarText: {
      fontSize: 18,
      fontWeight: '600',
    },
    chatInfo: {
      flex: 1,
      marginLeft: 12,
    },
    chatName: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 2,
    },
    chatMembers: {
      fontSize: 13,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
      color: theme.textSecondary,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 48,
    },
    emptyText: {
      fontSize: 16,
      color: theme.textTertiary,
      marginTop: 16,
    },
    sendingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    sendingText: {
      marginTop: 12,
      fontSize: 14,
      color: '#FFFFFF',
      fontWeight: '600',
    },
  });

  return (
    <Modal
      visible={visible}
      animationType={animationType}
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} disabled={isSending}>
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Поделиться задачей</Text>
        </View>

        {/* Task Preview */}
        <View style={styles.taskInfo}>
          <Text style={styles.taskTitle} numberOfLines={2}>
            {task.title}
          </Text>
          {task.description && (
            <Text style={styles.taskDescription} numberOfLines={2}>
              {task.description}
            </Text>
          )}
          <View style={styles.taskMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="flag" size={12} color={getPriorityColor()} />
              <Text style={[styles.metaText, { color: getPriorityColor() }]}>
                {getPriorityText()}
              </Text>
            </View>
            {task.due_date && (
              <View style={styles.metaItem}>
                <Ionicons name="calendar" size={12} color={theme.textSecondary} />
                <Text style={styles.metaText}>
                  {new Date(task.due_date).toLocaleDateString('ru-RU')}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Section Title */}
        <Text style={styles.sectionTitle}>Выберите чат</Text>

        {/* Chat List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={styles.loadingText}>Загрузка чатов...</Text>
          </View>
        ) : chats.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color={theme.border} />
            <Text style={styles.emptyText}>Нет доступных чатов</Text>
          </View>
        ) : (
          <FlatList
            data={chats}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderChatItem}
          />
        )}

        {/* Sending Overlay */}
        {isSending && (
          <View style={styles.sendingOverlay}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.sendingText}>Отправка...</Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

export default ShareTaskModal;
