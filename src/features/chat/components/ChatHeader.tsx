import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@components/common/Avatar';
import { ConnectionStatus } from '@components/common/ConnectionStatus';
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
  }: Omit<ChatHeaderProps, 'displayAvatar' | 'onBackPress'>) => {
    const { theme } = useTheme();

    return (
      <TouchableOpacity
        onPress={onHeaderPress}
        activeOpacity={0.7}
        style={{ maxWidth: 220 }}
      >
        {isConnected ? (
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
            {isPrivateChat && statusText && (
              <Text
                style={{
                  fontSize: 12,
                  color: theme.textSecondary,
                  marginTop: 2,
                  maxWidth: '100%',
                }}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {statusText}
              </Text>
            )}
            {!isPrivateChat && membersText && (
              <Text
                style={{
                  fontSize: 12,
                  color: theme.textSecondary,
                  marginTop: 2,
                  maxWidth: '100%',
                }}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {membersText}
              </Text>
            )}
          </View>
        ) : (
          <ConnectionStatus compact />
        )}
      </TouchableOpacity>
    );
  },

  Right: ({
    displayAvatar,
    displayName,
    onHeaderPress,
  }: Pick<ChatHeaderProps, 'displayAvatar' | 'displayName' | 'onHeaderPress'>) => {
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
