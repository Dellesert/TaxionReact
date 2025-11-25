/**
 * Empty Messages State Component
 * Пустое состояние для чата без сообщений
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';

interface EmptyMessagesStateProps {
  chatName?: string;
}

export const EmptyMessagesState: React.FC<EmptyMessagesStateProps> = ({ chatName }) => {
  const { theme } = useTheme();

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: theme.background,
    },
    title: {
      color: theme.text,
    },
    subtitle: {
      color: theme.textSecondary,
    },
  });

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <Ionicons name="chatbubbles-outline" size={64} color={theme.border} />
      <Text style={[styles.title, dynamicStyles.title]}>
        {chatName ? `Начните общение в "${chatName}"` : 'Начните общение'}
      </Text>
      <Text style={[styles.subtitle, dynamicStyles.subtitle]}>
        Отправьте первое сообщение в этом чате
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
