/**
 * PasskeyInfoCard Component
 * Информационная карточка о Passkey
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';

export const PasskeyInfoCard: React.FC = () => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.infoCard,
        { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
      ]}
    >
      <Text style={[styles.infoTitle, { color: theme.text }]}>🔐 Что такое Passkey?</Text>
      <Text style={[styles.infoText, { color: theme.textSecondary }]}>
        Passkey — это безопасный способ входа в приложение с помощью биометрии (Face ID, Touch ID,
        отпечаток пальца) или PIN-кода вашего устройства. Это быстрее и безопаснее, чем пароли.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  infoCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
