/**
 * About Contact Link Component
 * Ссылка для контакта на экране "О приложении"
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';

interface AboutContactLinkProps {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  onPress: () => void;
  isLast?: boolean;
}

export const AboutContactLink: React.FC<AboutContactLinkProps> = ({
  icon,
  text,
  onPress,
  isLast,
}) => {
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
    <TouchableOpacity
      style={[styles.container, dynamicStyles.container, isLast && styles.containerLast]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={20} color={theme.primary} />
      <Text style={[styles.text, dynamicStyles.text]}>{text}</Text>
      <Ionicons name="open-outline" size={18} color={theme.textTertiary} />
    </TouchableOpacity>
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
