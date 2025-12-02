/**
 * Chat Desktop Header
 * Заголовок чата для desktop режима
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { Avatar } from '@shared/components/common/Avatar';

interface ChatDesktopHeaderProps {
  chatName: string;
  chatAvatar?: string;
  statusText?: string;
  onSettingsPress?: () => void;
}

export const ChatDesktopHeader: React.FC<ChatDesktopHeaderProps> = ({
  chatName,
  chatAvatar,
  statusText,
  onSettingsPress,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundSecondary, borderBottomColor: theme.border }]}>
      <View style={styles.content}>
        {/* Avatar */}
        <Avatar name={chatName} imageUrl={chatAvatar} size={40} />

        {/* Chat info */}
        <View style={styles.info}>
          <Text style={[styles.chatName, { color: theme.text }]} numberOfLines={1}>
            {chatName}
          </Text>
          {statusText && (
            <Text style={[styles.statusText, { color: theme.textSecondary }]} numberOfLines={1}>
              {statusText}
            </Text>
          )}
        </View>

        {/* Settings button */}
        {onSettingsPress && (
          <TouchableOpacity
            onPress={onSettingsPress}
            style={styles.settingsButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="settings-outline" size={24} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  statusText: {
    fontSize: 13,
  },
  settingsButton: {
    padding: 8,
  },
});
