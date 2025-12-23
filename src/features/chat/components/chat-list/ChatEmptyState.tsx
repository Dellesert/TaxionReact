import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

interface ChatEmptyStateProps {
  searchQuery?: string;
}

export const ChatEmptyState: React.FC<ChatEmptyStateProps> = ({ searchQuery = '' }) => {
  const { theme } = useTheme();

  return (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundTertiary }]}>
        <Ionicons name="chatbubbles-outline" size={40} color={theme.textTertiary} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>
        {searchQuery ? 'Ничего не найдено' : 'Нет чатов'}
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.textTertiary }]}>
        {searchQuery
          ? 'Попробуйте изменить поисковый запрос'
          : 'Начните новый диалог, нажав кнопку +'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
