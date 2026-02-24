/**
 * Theme Settings Content
 * Контент для настройки темы оформления
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { ThemeMode } from '@shared/constants/theme.constants';

const ThemeSettingsContent: React.FC = () => {
  const { theme, mode, setTheme } = useTheme();

  const themeOptions: { mode: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap; description: string }[] = [
    {
      mode: 'system',
      label: 'Системная тема',
      icon: 'phone-portrait-outline',
      description: 'Автоматическое переключение в зависимости от настроек системы',
    },
    {
      mode: 'light',
      label: 'Светлая тема',
      icon: 'sunny',
      description: 'Классический светлый интерфейс для работы днем',
    },
    {
      mode: 'dark',
      label: 'Темная тема',
      icon: 'moon',
      description: 'Темный интерфейс для комфортной работы ночью',
    },
  ];

  const dynamicStyles = StyleSheet.create({
    container: {
      gap: 12,
    },
    optionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      backgroundColor: theme.card,
      borderColor: theme.border,
      // @ts-ignore
      cursor: 'pointer',
    },
    optionCardActive: {
      borderColor: theme.primary,
      backgroundColor: theme.primary + '10',
    },
    iconContainer: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    iconContainerActive: {
      backgroundColor: theme.primary + '20',
    },
    iconContainerInactive: {
      backgroundColor: theme.background,
    },
    textContainer: {
      flex: 1,
    },
    optionLabel: {
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 22,
      color: theme.text,
      marginBottom: 4,
    },
    optionDescription: {
      fontSize: 14,
      color: theme.textSecondary,
      lineHeight: 20,
    },
    checkIcon: {
      marginLeft: 12,
    },
  });

  return (
    <View style={dynamicStyles.container}>
      {themeOptions.map((option) => {
        const isActive = mode === option.mode;

        return (
          <TouchableOpacity
            key={option.mode}
            style={[
              dynamicStyles.optionCard,
              isActive && dynamicStyles.optionCardActive,
            ]}
            onPress={() => setTheme(option.mode)}
            activeOpacity={0.7}
          >
            <View
              style={[
                dynamicStyles.iconContainer,
                isActive ? dynamicStyles.iconContainerActive : dynamicStyles.iconContainerInactive,
              ]}
            >
              <Ionicons
                name={option.icon}
                size={18}
                color={isActive ? theme.primary : theme.textSecondary}
              />
            </View>

            <View style={dynamicStyles.textContainer}>
              <Text style={dynamicStyles.optionLabel}>{option.label}</Text>
              <Text style={dynamicStyles.optionDescription}>{option.description}</Text>
            </View>

            {isActive && (
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={theme.primary}
                style={dynamicStyles.checkIcon}
              />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default ThemeSettingsContent;
