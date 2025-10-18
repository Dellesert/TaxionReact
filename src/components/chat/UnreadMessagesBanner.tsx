/**
 * UnreadMessagesBanner Component
 * Баннер, отображаемый над первым непрочитанным сообщением
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@hooks/useTheme';

interface UnreadMessagesBannerProps {
  unreadCount: number;
}

export const UnreadMessagesBanner: React.FC<UnreadMessagesBannerProps> = ({ unreadCount }) => {
  const { theme } = useTheme();

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: theme.primary + '15', // 15 = ~8% opacity
      borderColor: theme.primary,
    },
    text: {
      color: theme.primary,
    },
  });

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <View style={styles.line} />
      <Text style={[styles.text, dynamicStyles.text]}>
        {unreadCount} {unreadCount === 1 ? 'непрочитанное сообщение' : 'непрочитанных сообщений'}
      </Text>
      <View style={styles.line} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#E94444',
    opacity: 0.3,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    marginHorizontal: 12,
    textTransform: 'uppercase',
  },
});
