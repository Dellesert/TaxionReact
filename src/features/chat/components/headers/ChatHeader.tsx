import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@shared/components/common/Avatar';
import { ConnectionStatus } from '@shared/components/common/ConnectionStatus';
import { useTheme } from '@shared/hooks/useTheme';

interface ChatHeaderProps {
  displayName: string;
  displayAvatar?: string;
  statusText?: string;
  membersText?: string;
  isPrivateChat: boolean;
  isConnected: boolean;
  onBackPress: () => void;
  onHeaderPress: () => void;
  isSavedChat?: boolean;
}

/**
 * Компонент шапки чата для навигации
 */
export const ChatHeader = {
  Left: ({ onBackPress }: { onBackPress: () => void }) => {
    const { theme } = useTheme();
    return (
      <TouchableOpacity
        onPress={onBackPress}
        style={{ marginLeft: 4 }}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-back" size={28} color={theme.primary} />
      </TouchableOpacity>
    );
  },

  Title: ({
    displayName,
    statusText,
    membersText,
    isPrivateChat,
    isConnected,
    onHeaderPress,
    isSavedChat,
  }: Omit<ChatHeaderProps, 'displayAvatar' | 'onBackPress'>) => {
    const { theme } = useTheme();

    // Determine what to show as subtitle
    let subtitle = '';
    if (!isConnected) {
      subtitle = 'Подключение...';
    } else if (statusText) {
      subtitle = statusText; // Show typing indicator or online status for both private and group chats
    } else if (!isPrivateChat && membersText) {
      subtitle = membersText; // Fallback to member count for group chats
    }

    // For saved chat, render non-interactive title
    if (isSavedChat) {
      return (
        <View style={{ alignItems: 'center', width: '100%', maxWidth: 220 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: '600',
              color: theme.text,
              maxWidth: '100%',
            }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {displayName}
          </Text>
        </View>
      );
    }

    return (
      <TouchableOpacity
        onPress={onHeaderPress}
        activeOpacity={0.7}
        style={{ maxWidth: 220 }}
      >
        <View style={{ alignItems: 'center', width: '100%' }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: '600',
              color: theme.text,
              maxWidth: '100%',
            }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {displayName}
          </Text>
          {subtitle && (
            <Text
              style={{
                fontSize: 12,
                color: !isConnected ? theme.textSecondary : theme.textSecondary,
                marginTop: 2,
                maxWidth: '100%',
              }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {subtitle}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  },

  Right: ({
    displayAvatar,
    displayName,
    onHeaderPress,
    isSavedChat,
  }: Pick<ChatHeaderProps, 'displayAvatar' | 'displayName' | 'onHeaderPress' | 'isSavedChat'>) => {
    // For saved chat, render non-interactive bookmark icon
    if (isSavedChat) {
      return (
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: '#3B82F6',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 0,
          }}
        >
          <Ionicons name="bookmark" size={18} color="#FFFFFF" />
        </View>
      );
    }

    return (
      <TouchableOpacity
        onPress={onHeaderPress}
        activeOpacity={0.7}
        style={{ marginRight: 0 }}
      >
        <Avatar
          imageUrl={displayAvatar}
          name={displayName}
          size={36}
        />
      </TouchableOpacity>
    );
  },
};
