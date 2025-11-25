/**
 * About Feature Item Component
 * Элемент списка возможностей приложения
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';

interface AboutFeatureItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  isLast?: boolean;
}

export const AboutFeatureItem: React.FC<AboutFeatureItemProps> = ({ icon, text, isLast }) => {
  const { theme } = useTheme();

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: theme.backgroundSecondary,
      borderBottomColor: theme.borderLight,
    },
    text: {
      color: theme.text,
    },
  });

  return (
    <View style={[styles.container, dynamicStyles.container, isLast && styles.containerLast]}>
      <Ionicons name={icon} size={20} color={theme.primary} />
      <Text style={[styles.text, dynamicStyles.text]}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  containerLast: {
    borderBottomWidth: 0,
  },
  text: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
});
