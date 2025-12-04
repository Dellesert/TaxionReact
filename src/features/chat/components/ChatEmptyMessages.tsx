import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

/**
 * Empty state placeholder for chat with no messages
 */
export const ChatEmptyMessages: React.FC = () => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: theme.backgroundTertiary }]}>
        <Ionicons name="chatbubbles-outline" size={48} color={theme.textTertiary} />
      </View>
      <Text style={[styles.title, { color: theme.text }]}>
        Сообщений пока нет
      </Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        Отправьте первое сообщение, чтобы начать беседу
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 100, // Space for input at bottom
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
