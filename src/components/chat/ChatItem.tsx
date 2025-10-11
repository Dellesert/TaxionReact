import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Chat } from '@types/chat.types';
import { Avatar } from '@components/common/Avatar';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';

interface ChatItemProps {
  chat: Chat;
  onPress: (chat: Chat) => void;
}

export const ChatItem: React.FC<ChatItemProps> = ({ chat, onPress }) => {
  const getChatName = () => {
    return chat.name || 'Unnamed Chat';
  };

  const getChatAvatar = () => {
    return chat.avatar || chat.avatar_url;
  };

  const getLastMessagePreview = () => {
    if (!chat.last_message) return 'Нет сообщений';
    return chat.last_message.content || 'Нет сообщений';
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(chat)}
      activeOpacity={0.7}
    >
      <Avatar
        imageUrl={getChatAvatar()}
        name={getChatName()}
        size={50}
      />

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>
            {getChatName()}
          </Text>
          {chat.last_message && (
            <Text style={styles.time}>
              {formatDistanceToNow(new Date(chat.last_message.created_at), {
                addSuffix: false,
                locale: ru,
              })}
            </Text>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.preview} numberOfLines={1}>
            {getLastMessagePreview()}
          </Text>

          <View style={styles.badges}>
            {chat.is_muted && (
              <Ionicons name="notifications-off" size={16} color="#9CA3AF" style={styles.muteIcon} />
            )}
            {chat.unread_count > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>
                  {chat.unread_count > 99 ? '99+' : chat.unread_count}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  time: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  preview: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  muteIcon: {
    marginRight: 4,
  },
  unreadBadge: {
    backgroundColor: '#E94444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
