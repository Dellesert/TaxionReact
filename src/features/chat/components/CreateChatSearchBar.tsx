/**
 * Create Chat Search Bar Component
 * Поисковая строка для создания чата
 */

import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

interface CreateChatSearchBarProps {
  searchQuery: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
}

export const CreateChatSearchBar: React.FC<CreateChatSearchBarProps> = ({
  searchQuery,
  onChangeText,
  onClear,
}) => {
  const { theme } = useTheme();

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: theme.card,
      borderBottomColor: theme.border,
    },
    input: {
      color: theme.text,
    },
  });

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <Ionicons name="search" size={20} color={theme.textTertiary} />
      <TextInput
        style={[styles.input, dynamicStyles.input]}
        placeholder="Поиск участников..."
        placeholderTextColor={theme.inputPlaceholder}
        value={searchQuery}
        onChangeText={onChangeText}
      />
      {searchQuery.length > 0 && (
        <TouchableOpacity onPress={onClear}>
          <Ionicons name="close-circle" size={20} color={theme.textTertiary} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  input: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
});
