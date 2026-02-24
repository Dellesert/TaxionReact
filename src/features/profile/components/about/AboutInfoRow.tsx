/**
 * About Info Row Component
 * Строка информации для экрана "О приложении"
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';

interface AboutInfoRowProps {
  label: string;
  value: string;
  isLast?: boolean;
}

export const AboutInfoRow: React.FC<AboutInfoRowProps> = ({ label, value, isLast }) => {
  const { theme } = useTheme();

  const dynamicStyles = StyleSheet.create({
    container: {
      borderBottomColor: theme.borderLight,
    },
    label: {
      color: theme.textSecondary,
    },
    value: {
      color: theme.text,
    },
  });

  return (
    <View style={[styles.container, dynamicStyles.container, isLast && styles.containerLast]}>
      <Text style={[styles.label, dynamicStyles.label]}>{label}</Text>
      <Text style={[styles.value, dynamicStyles.value]}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  containerLast: {
    borderBottomWidth: 0,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
});
