import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
  Platform,
  Keyboard,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/hooks/useTheme';
import { useChatStore } from '@shared/store/chatStore';
import { useAuthStore } from '@shared/store/authStore';
import { Chat } from '../../types/chat.types';
import { Avatar } from '@shared/components/common/Avatar';
import { getChatDisplayName, getChatDisplayAvatar } from '../../utils/chatUtils';
import { fileApi } from '@/api/fileApi';
import type { ShareIntent } from 'expo-share-intent';

interface ShareIntentModalProps {
  visible: boolean;
  shareIntent: ShareIntent | null;
  onClose: () => void;
  onSent: (chatId: number, chatName: string) => void;
}

export const ShareIntentModal: React.FC<ShareIntentModalProps> = ({
  visible,
  shareIntent,
  onClose,
  onSent,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const chats = useChatStore((state) => state.chats);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const currentUser = useAuthStore((state) => state.user);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredChats, setFilteredChats] = useState<Chat[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const effectiveInsetsBottom = (Platform.OS === 'ios' && isKeyboardVisible) ? 0 : insets.bottom;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setIsKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (visible) {
      const filtered = chats.filter((chat) => {
        const displayName = getChatDisplayName(chat, currentUser?.id).toLowerCase();
        return displayName.includes(searchQuery.toLowerCase());
      });
      setFilteredChats(filtered);
    } else {
      setSearchQuery('');
      setIsSending(false);
    }
  }, [visible, chats, searchQuery, currentUser]);

  const getPreviewInfo = useCallback(() => {
    if (!shareIntent) return null;

    const files = shareIntent.files || [];
    const text = shareIntent.text || '';
    const webUrl = shareIntent.webUrl || '';

    if (files.length > 0) {
      const imageFiles = files.filter((f) => f.mimeType?.startsWith('image/'));
      const videoFiles = files.filter((f) => f.mimeType?.startsWith('video/'));
      const otherFiles = files.filter(
        (f) => !f.mimeType?.startsWith('image/') && !f.mimeType?.startsWith('video/')
      );

      const parts: string[] = [];
      if (imageFiles.length > 0) parts.push(`${imageFiles.length} фото`);
      if (videoFiles.length > 0) parts.push(`${videoFiles.length} видео`);
      if (otherFiles.length > 0) parts.push(`${otherFiles.length} файл(ов)`);

      return {
        icon: imageFiles.length > 0 ? 'image-outline' as const : 'document-outline' as const,
        text: parts.join(', ') + (text ? `\n${text}` : ''),
        thumbnail: imageFiles[0]?.path,
      };
    }

    if (webUrl) {
      return {
        icon: 'link-outline' as const,
        text: webUrl,
        thumbnail: null,
      };
    }

    if (text) {
      return {
        icon: 'text-outline' as const,
        text,
        thumbnail: null,
      };
    }

    return null;
  }, [shareIntent]);

  const handleSendToChat = async (chat: Chat) => {
    if (!shareIntent || isSending) return;

    const chatId = chat.id;
    const chatName = getChatDisplayName(chat, currentUser?.id);

    setIsSending(true);
    try {
      const files = shareIntent.files || [];
      const text = shareIntent.text || '';
      const webUrl = shareIntent.webUrl || '';

      let fileIds: number[] = [];

      // Upload files if present
      if (files.length > 0) {
        const uploadPromises = files.map(async (file) => {
          const uploadResult = await fileApi.uploadFile(
            {
              uri: file.path,
              name: file.fileName || 'shared_file',
              type: file.mimeType || 'application/octet-stream',
            },
            undefined,
            undefined,
            true
          );
          return uploadResult.id;
        });
        fileIds = await Promise.all(uploadPromises);
      }

      // Build message content
      let content = '';
      if (webUrl) {
        content = webUrl;
      } else if (text) {
        content = text;
      }

      // Send message
      await sendMessage(chatId, content, undefined, fileIds.length > 0 ? fileIds : undefined);

      onSent(chatId, chatName);
    } catch (error) {
      console.error('[ShareIntent] Failed to send:', error);
      setIsSending(false);
    }
  };

  const previewInfo = getPreviewInfo();

  const renderChatItem = ({ item }: { item: Chat }) => {
    const displayName = getChatDisplayName(item, currentUser?.id);
    const avatarUrl = getChatDisplayAvatar(item, currentUser?.id);
    const isSavedChat = item.type === 'saved';

    return (
      <TouchableOpacity
        style={[styles.chatItem, { backgroundColor: theme.backgroundSecondary }]}
        onPress={() => handleSendToChat(item)}
        disabled={isSending}
      >
        {isSavedChat ? (
          <View style={styles.savedChatAvatar}>
            <Ionicons name="bookmark" size={24} color="#FFFFFF" />
          </View>
        ) : (
          <Avatar imageUrl={avatarUrl} name={displayName} size={48} />
        )}
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
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border, paddingTop: Platform.OS === 'android' ? 16 + insets.top : 16 }]}>
          <Text style={[styles.title, { color: theme.text }]}>Отправить в чат</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* Preview */}
        {previewInfo && (
          <View style={[styles.preview, { backgroundColor: theme.backgroundSecondary, borderLeftColor: theme.primary }]}>
            {previewInfo.thumbnail ? (
              <Image source={{ uri: previewInfo.thumbnail }} style={styles.previewThumbnail} />
            ) : (
              <Ionicons name={previewInfo.icon} size={20} color={theme.primary} />
            )}
            <Text style={[styles.previewText, { color: theme.text }]} numberOfLines={3}>
              {previewInfo.text}
            </Text>
          </View>
        )}

        {/* Search */}
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

        {/* Chat list */}
        <FlatList
          data={filteredChats}
          renderItem={renderChatItem}
          keyExtractor={(item) => String(item.id)}
          style={styles.chatList}
          contentContainerStyle={[styles.chatListContent, { paddingBottom: 16 + effectiveInsetsBottom }]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={48} color={theme.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                {searchQuery ? 'Чаты не найдены' : 'Нет доступных чатов'}
              </Text>
            </View>
          }
        />

        {isSending && (
          <View style={styles.loadingOverlay}>
            <View style={[styles.loadingBox, { backgroundColor: theme.background }]}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.loadingText, { color: theme.text }]}>Отправка...</Text>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
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
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
  },
  previewThumbnail: {
    width: 40,
    height: 40,
    borderRadius: 6,
  },
  previewText: {
    fontSize: 14,
    marginLeft: 10,
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
  savedChatAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
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
  loadingBox: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
