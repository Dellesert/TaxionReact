import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';
import { useChatStore } from '@store/chatStore';
import { Chat, Message } from '@types/chat.types';
import { Avatar } from '@components/common/Avatar';
import { getChatDisplayName, getChatDisplayAvatar } from '@utils/chatUtils';

interface ForwardMessageModalProps {
  visible: boolean;
  message: Message | null;
  onClose: () => void;
  onForward: (chatId: number) => void;
}

export const ForwardMessageModal: React.FC<ForwardMessageModalProps> = ({
  visible,
  message,
  onClose,
  onForward,
}) => {
  const { theme } = useTheme();
  const chats = useChatStore((state) => state.chats);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredChats, setFilteredChats] = useState<Chat[]>([]);
  const [isForwarding, setIsForwarding] = useState(false);

  useEffect(() => {
    if (visible) {
      // Фильтруем чаты по поисковому запросу
      const filtered = chats.filter((chat) => {
        const displayName = getChatDisplayName(chat).toLowerCase();
        return displayName.includes(searchQuery.toLowerCase());
      });
      setFilteredChats(filtered);
    } else {
      setSearchQuery('');
      setIsForwarding(false);
    }
  }, [visible, chats, searchQuery]);

  const handleForward = async (chatId: number) => {
    setIsForwarding(true);
    try {
      await onForward(chatId);
      onClose();
    } catch (error) {
      console.error('Failed to forward message:', error);
    } finally {
      setIsForwarding(false);
    }
  };

  const renderChatItem = ({ item }: { item: Chat }) => {
    const displayName = getChatDisplayName(item);
    const avatarUrl = getChatDisplayAvatar(item);

    return (
      <TouchableOpacity
        style={[styles.chatItem, { backgroundColor: theme.backgroundSecondary }]}
        onPress={() => handleForward(item.id)}
        disabled={isForwarding}
      >
        <Avatar imageUrl={avatarUrl} name={displayName} size={48} />
        <View style={styles.chatInfo}>
          <Text style={[styles.chatName, { color: theme.text }]} numberOfLines={1}>
            {displayName}
          </Text>
          {item.last_message && (
            <Text style={[styles.lastMessage, { color: theme.textSecondary }]} numberOfLines={1}>
              {item.last_message.content}
            </Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
          {/* Заголовок */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <Text style={[styles.title, { color: theme.text }]}>Переслать сообщение</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Превью пересылаемого сообщения */}
          {message && (
            <View style={[styles.messagePreview, { backgroundColor: theme.backgroundSecondary, borderLeftColor: theme.primary }]}>
              <Ionicons name="arrow-redo-outline" size={16} color={theme.primary} />
              <Text style={[styles.previewText, { color: theme.text }]} numberOfLines={2}>
                {message.content}
              </Text>
            </View>
          )}

          {/* Поиск */}
          <View style={[styles.searchContainer, { backgroundColor: theme.backgroundSecondary }]}>
            <Ionicons name="search" size={20} color={theme.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Поиск чатов..."
              placeholderTextColor={theme.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Список чатов */}
          <FlatList
            data={filteredChats}
            renderItem={renderChatItem}
            keyExtractor={(item) => String(item.id)}
            style={styles.chatList}
            contentContainerStyle={styles.chatListContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubbles-outline" size={48} color={theme.textSecondary} />
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  {searchQuery ? 'Чаты не найдены' : 'Нет доступных чатов'}
                </Text>
              </View>
            }
          />

          {isForwarding && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    height: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  messagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
  },
  previewText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
  },
  chatList: {
    flex: 1,
  },
  chatListContent: {
    paddingHorizontal: 16,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  chatInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
