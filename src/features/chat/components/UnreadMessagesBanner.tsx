/**
 * UnreadMessagesBanner Component
 * Баннер, отображаемый над первым непрочитанным сообщением
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';

interface UnreadMessagesBannerProps {
  unreadCount: number;
}

export const UnreadMessagesBanner: React.FC<UnreadMessagesBannerProps> = ({ unreadCount }) => {
  const { theme } = useTheme();

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: theme.background, // 15 = ~8% opacity
      borderColor: theme.textTertiary + 45,
    },
    text: {
      color: theme.textSecondary,
    },
  });

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <Text style={[styles.text, dynamicStyles.text]}>
        {unreadCount} {unreadCount === 1 ? 'непрочитанное сообщение' : 'непрочитанных сообщений'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '50%',
    margin: 'auto',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderRadius: 12,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#d3d3d3ff',
    opacity: 0.3,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    marginHorizontal: 12,
    textTransform: 'uppercase',
  },
});
