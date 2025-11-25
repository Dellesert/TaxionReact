/**
 * Create Chat Header Component
 * Заголовок экрана создания чата
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';

interface CreateChatHeaderProps {
  onBack: () => void;
  onCreateChat: () => void;
  canCreate: boolean;
  isCreating: boolean;
}

export const CreateChatHeader: React.FC<CreateChatHeaderProps> = ({
  onBack,
  onCreateChat,
  canCreate,
  isCreating,
}) => {
  const { theme } = useTheme();

  const dynamicStyles = StyleSheet.create({
    header: {
      backgroundColor: theme.background,
      borderBottomColor: theme.border,
    },
    headerTitle: {
      color: theme.text,
    },
    createButton: {
      backgroundColor: theme.primary,
    },
    createButtonDisabled: {
      backgroundColor: theme.backgroundTertiary,
    },
  });

  return (
    <View style={[styles.header, dynamicStyles.header]}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color={theme.text} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, dynamicStyles.headerTitle]}>
        Новый чат
      </Text>
      <TouchableOpacity
        onPress={onCreateChat}
        disabled={isCreating || !canCreate}
        style={[
          styles.createButton,
          dynamicStyles.createButton,
          !canCreate && dynamicStyles.createButtonDisabled,
        ]}
      >
        {isCreating ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <Text style={styles.createButtonText}>Создать</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  createButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
