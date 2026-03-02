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
  Image as RNImage,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/hooks/useTheme';
import { useAnimationType } from '@shared/hooks/useAnimationType';
import { useChatStore } from '@shared/store/chatStore';
import { useAuthStore } from '@shared/store/authStore';
import { Chat } from '../../types/chat.types';
import { Avatar } from '@shared/components/common/Avatar';
import { FileTypeIcon } from '@shared/components/common/FileTypeIcon';
import { getChatDisplayName, getChatDisplayAvatar } from '../../utils/chatUtils';
import { stripFormatting } from '../../utils/formatting';
import { getSystemMessagePreview } from '../messages/SystemMessageBanner';
import { getThumbnailUrl } from '../../utils/thumbnail.utils';
import { decodeFileName } from '../../utils/file.utils';
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
  const animationType = useAnimationType('slide');
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

  const getSenderPrefix = (chat: Chat) => {
    if (!chat.last_message) return '';
    const msg = chat.last_message;
    if (msg.message_type === 'system') return '';
    const isCurrentUser = msg.sender_id === currentUser?.id;
    if (chat.type === 'saved') return '';
    if (chat.type === 'private') return isCurrentUser ? 'Вы: ' : '';
    if (isCurrentUser) return 'Вы: ';
    let senderName = '';
    if (msg.sender?.name) senderName = msg.sender.name;
    else if (msg.sender?.email) senderName = msg.sender.email.split('@')[0];
    else if (chat.members?.length) {
      const member = chat.members.find(m => m.user_id === msg.sender_id);
      if (member?.user) senderName = member.user.name || member.user.email?.split('@')[0] || '';
    }
    return `${senderName || 'Пользователь'}: `;
  };

  const getLastMessageText = (chat: Chat) => {
    if (!chat.last_message) return 'Нет сообщений';
    const msg = chat.last_message;
    if (msg.message_type === 'system') return getSystemMessagePreview(msg);
    const prefix = getSenderPrefix(chat);
    let text = stripFormatting(msg.content || '');
    const attachments = msg.attachments || (msg as any).files || [];
    if (!text && Array.isArray(attachments) && attachments.length > 0) {
      const count = attachments.length;
      const first = attachments[0];
      const fileType = first.file_type || first.mime_type || '';
      if (fileType.includes('image')) text = count === 1 ? 'Фото' : `${count} фото`;
      else if (fileType.includes('video')) text = count === 1 ? 'Видео' : `${count} видео`;
      else text = count === 1 && first.file_name ? decodeFileName(first.file_name) : count === 1 ? 'Файл' : `${count} файла`;
    }
    return prefix + (text || 'Нет сообщений');
  };

  const getChatMediaPreview = (chat: Chat): { type: 'image' | 'video' | 'file'; thumbUrl: string | null; fileName?: string } | null => {
    if (!chat.last_message) return null;
    const msg = chat.last_message;
    if (msg.message_type === 'system') return null;
    const attachments = msg.attachments || (msg as any).files || [];
    if (Array.isArray(attachments) && attachments.length > 0) {
      const first = attachments[0];
      const fileType = first.file_type || first.mime_type || '';
      const isImage = fileType.includes('image');
      const isVideo = fileType.includes('video');
      if (isImage || isVideo) {
        const url = getThumbnailUrl(first, 'small');
        return { type: isVideo ? 'video' : 'image', thumbUrl: url || null };
      }
      if (first.file_name) return { type: 'file', thumbUrl: null, fileName: first.file_name };
    }
    return null;
  };

  const renderChatItem = ({ item }: { item: Chat }) => {
    const displayName = getChatDisplayName(item, currentUser?.id);
    const avatarUrl = getChatDisplayAvatar(item, currentUser?.id);
    const isSavedChat = item.type === 'saved';
    const prefix = getSenderPrefix(item);
    const preview = getLastMessageText(item);
    const media = getChatMediaPreview(item);

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
          <View style={styles.previewContainer}>
            {item.last_message?.is_forwarded && (
              <Ionicons name="arrow-redo" size={14} color={theme.textTertiary} style={styles.previewIcon} />
            )}
            {(() => {
              if (media) {
                const textWithoutPrefix = prefix && preview.startsWith(prefix) ? preview.slice(prefix.length) : preview;
                return (
                  <>
                    {prefix ? <Text style={[styles.previewPrefix, { color: theme.textSecondary }]}>{prefix}</Text> : null}
                    {media.type === 'file' && media.fileName ? (
                      <FileTypeIcon fileName={media.fileName} size={16} />
                    ) : media.thumbUrl ? (
                      <Image source={{ uri: media.thumbUrl }} style={styles.mediaThumbnail} contentFit="cover" />
                    ) : (
                      <Ionicons name={media.type === 'video' ? 'videocam' : 'camera'} size={16} color={theme.textTertiary} />
                    )}
                    <Text style={[styles.lastMessage, { color: theme.textSecondary }]} numberOfLines={1}>{textWithoutPrefix}</Text>
                  </>
                );
              }
              return (
                <Text style={[styles.lastMessage, { color: theme.textSecondary }]} numberOfLines={1}>
                  {prefix ? <Text style={styles.previewPrefix}>{prefix}</Text> : null}
                  {prefix && preview.startsWith(prefix) ? preview.slice(prefix.length) : preview}
                </Text>
              );
            })()}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType={animationType}
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
              <RNImage source={{ uri: previewInfo.thumbnail }} style={styles.previewThumbnail} />
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
  previewContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  previewIcon: {
    marginTop: 1,
  },
  previewPrefix: {
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 0,
  },
  mediaThumbnail: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  lastMessage: {
    fontSize: 14,
    flex: 1,
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
