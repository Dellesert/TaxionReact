/**
 * Navigation Card
 * Карточка навигации к разделу (Задачи, Опросы, Расписание и т.д.)
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

interface NavigationCardProps {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
}

export const NavigationCard: React.FC<NavigationCardProps> = ({
  title,
  description,
  icon,
  color,
  onPress,
}) => {
  const { theme, isDark } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
        },
        !isDark && styles.lightShadow,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={26} color={color} />
      </View>
      <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>{title}</Text>
      <Text style={[styles.description, { color: theme.textSecondary }]} numberOfLines={2}>
        {description}
      </Text>
      <View style={[styles.arrowContainer, { backgroundColor: color + '12' }]}>
        <Ionicons name="arrow-forward" size={16} color={color} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    minHeight: 140,
  },
  lightShadow: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  arrowContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    marginTop: 8,
  },
});

export default NavigationCard;
