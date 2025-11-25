import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';

interface ChatActionBarProps {
  selectedCount: number;
  onMarkAsRead: () => void;
  onDelete: () => void;
}

export const ChatActionBar: React.FC<ChatActionBarProps> = ({
  selectedCount,
  onMarkAsRead,
  onDelete,
}) => {
  const { theme } = useTheme();

  if (selectedCount === 0) return null;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.background, borderBottomColor: theme.border },
      ]}
    >
      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: theme.backgroundTertiary }]}
        onPress={onMarkAsRead}
      >
        <Ionicons name="checkmark-done" size={20} color={theme.text} />
        <Text style={[styles.actionButtonText, { color: theme.text }]}>
          Прочитано ({selectedCount})
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: theme.error + '15' }]}
        onPress={onDelete}
      >
        <Ionicons name="trash" size={20} color={theme.error} />
        <Text style={[styles.actionButtonText, { color: theme.error }]}>
          Удалить ({selectedCount})
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
