import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@shared/components/common/Avatar';
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
  onSearchPress?: () => void;
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
        style={{ marginLeft: Platform.OS === 'ios' ? -2 : 10 }}
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
    onSearchPress,
    isSavedChat,
  }: Pick<ChatHeaderProps, 'displayAvatar' | 'displayName' | 'onHeaderPress' | 'onSearchPress' | 'isSavedChat'>) => {
    const { theme } = useTheme();

    // For saved chat, render non-interactive bookmark icon with search
    if (isSavedChat) {
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {onSearchPress && (
            <TouchableOpacity
              onPress={onSearchPress}
              activeOpacity={0.7}
              style={{ padding: 4 }}
            >
              <Ionicons name="search" size={22} color={theme.primary} />
            </TouchableOpacity>
          )}
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: '#3B82F6',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="bookmark" size={18} color="#FFFFFF" />
          </View>
        </View>
      );
    }

    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {onSearchPress && (
          <TouchableOpacity
            onPress={onSearchPress}
            activeOpacity={0.7}
            style={{ padding: 4 }}
          >
            <Ionicons name="search" size={22} color={theme.primary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={onHeaderPress}
          activeOpacity={0.7}
        >
          <Avatar
            imageUrl={displayAvatar}
            name={displayName}
            size={36}
          />
        </TouchableOpacity>
      </View>
    );
  },
};
