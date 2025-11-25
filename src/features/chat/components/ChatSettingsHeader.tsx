/**
 * Chat Settings Header Component
 * Заголовок экрана настроек чата
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

interface ChatSettingsHeaderProps {
  onBack: () => void;
}

export const ChatSettingsHeader: React.FC<ChatSettingsHeaderProps> = ({ onBack }) => {
  const { theme } = useTheme();

  const dynamicStyles = StyleSheet.create({
    header: {
      backgroundColor: theme.backgroundSecondary,
      borderBottomColor: theme.border,
    },
    headerTitle: {
      color: theme.text,
    },
  });

  return (
    <View style={[styles.header, dynamicStyles.header]}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Ionicons name="chevron-back" size={28} color={theme.primary} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, dynamicStyles.headerTitle]}>
        Настройки чата
      </Text>
      <View style={styles.backButton} />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
});
