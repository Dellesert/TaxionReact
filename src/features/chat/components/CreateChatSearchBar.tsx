/**
 * Create Chat Search Bar Component
 * Поисковая строка для создания чата
 */

import React, { useRef } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

interface CreateChatSearchBarProps {
  searchQuery: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
}

export const CreateChatSearchBar: React.FC<CreateChatSearchBarProps> = React.memo(({
  searchQuery,
  onChangeText,
  onClear,
}) => {
  const { theme } = useTheme();
  const inputRef = useRef<TextInput>(null);

  const dynamicStyles = React.useMemo(() => StyleSheet.create({
    container: {
      backgroundColor: theme.card,
      borderBottomColor: theme.border,
    },
    input: {
      color: theme.text,
    },
  }), [theme]);

  const handleClear = React.useCallback(() => {
    onClear();
    // Restore focus after clearing
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, [onClear]);

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <Ionicons name="search" size={20} color={theme.textTertiary} />
      <TextInput
        ref={inputRef}
        style={[styles.input, dynamicStyles.input]}
        placeholder="Поиск участников..."
        placeholderTextColor={theme.inputPlaceholder}
        value={searchQuery}
        onChangeText={onChangeText}
        autoCorrect={false}
        autoCapitalize="none"
      />
      {searchQuery.length > 0 && (
        <TouchableOpacity onPress={handleClear}>
          <Ionicons name="close-circle" size={20} color={theme.textTertiary} />
        </TouchableOpacity>
      )}
    </View>
  );
});

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
