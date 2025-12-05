/**
 * Chat Name Input Component
 * Ввод названия чата
 */

import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';

interface ChatNameInputProps {
  chatName: string;
  onChangeText: (text: string) => void;
  maxLength?: number;
}

export const ChatNameInput: React.FC<ChatNameInputProps> = React.memo(({
  chatName,
  onChangeText,
  maxLength = 50,
}) => {
  const { theme } = useTheme();

  const dynamicStyles = React.useMemo(() => StyleSheet.create({
    section: {
      backgroundColor: theme.card,
      borderBottomColor: theme.border,
    },
    sectionTitle: {
      color: theme.textSecondary,
    },
    input: {
      color: theme.text,
      borderBottomColor: theme.border,
    },
    charCount: {
      color: theme.textTertiary,
    },
  }), [theme]);

  return (
    <View style={[styles.section, dynamicStyles.section]}>
      <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>
        Название чата
      </Text>
      <TextInput
        style={[styles.input, dynamicStyles.input]}
        placeholder="Введите название..."
        placeholderTextColor={theme.inputPlaceholder}
        value={chatName}
        onChangeText={onChangeText}
        maxLength={maxLength}
      />
      <Text style={[styles.charCount, dynamicStyles.charCount]}>
        {chatName.length}/{maxLength}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    fontSize: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  charCount: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'right',
  },
});
