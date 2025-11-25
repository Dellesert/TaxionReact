/**
 * SharePollModal
 * Модалка для выбора чата, в который будет отправлен опрос
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
import { useNotification } from '@shared/contexts/NotificationContext';
import { useChatStore } from '@shared/store/chatStore';
import { useAuthStore } from '@shared/store/authStore';
import { Chat } from '@/types/chat.types';
import { Poll } from '../types/poll.types';

interface SharePollModalProps {
  visible: boolean;
  onClose: () => void;
  poll: Poll;
  onShare: (chatId: number) => Promise<void>;
}

const SharePollModal: React.FC<SharePollModalProps> = ({
  visible,
  onClose,
  poll,
  onShare,
}) => {
  const { theme } = useTheme();
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

      showSuccess('Опрос отправлен в чат');
      onClose();
    } catch (error: any) {
      console.error('Failed to share poll:', error);
      showError(error.message || 'Не удалось отправить опрос');
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
    pollInfo: {
      backgroundColor: theme.card,
      padding: 16,
      marginHorizontal: 16,
      marginTop: 12,
      borderRadius: 12,
      borderLeftWidth: 3,
      borderLeftColor: theme.primary,
    },
    pollTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 4,
    },
    pollQuestion: {
      fontSize: 13,
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
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} disabled={isSending}>
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Поделиться опросом</Text>
        </View>

        {/* Poll Preview */}
        <View style={styles.pollInfo}>
          <Text style={styles.pollTitle} numberOfLines={2}>
            {poll.title}
          </Text>
          {poll.question && (
            <Text style={styles.pollQuestion} numberOfLines={2}>
              {poll.question}
            </Text>
          )}
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

export default SharePollModal;
