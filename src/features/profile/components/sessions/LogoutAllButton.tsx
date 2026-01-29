/**
 * LogoutAllButton Component
 * Кнопка выхода со всех устройств
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

interface LogoutAllButtonProps {
  onPress: () => void;
  visible: boolean;
}

export const LogoutAllButton: React.FC<LogoutAllButtonProps> = ({ onPress, visible }) => {
  const { theme } = useTheme();
  const isDesktop = Platform.OS === 'web';

  if (!visible) {
    return null;
  }

  return (
    <View
      style={[
        styles.actionBar,
        {
          backgroundColor: isDesktop ? 'transparent' : theme.card,
          borderBottomColor: isDesktop ? 'transparent' : theme.border,
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.logoutAllButton,
          {
            backgroundColor: isDesktop ? 'transparent' : theme.card,
            borderColor: theme.error,
          },
        ]}
        onPress={onPress}
      >
        <Ionicons name="log-out-outline" size={20} color={theme.error} />
        <Text style={[styles.logoutAllText, { color: theme.error }]}>
          Выйти со всех других устройств
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  actionBar: {
    padding: 16,
    borderBottomWidth: 1,
  },
  logoutAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  logoutAllText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
});
