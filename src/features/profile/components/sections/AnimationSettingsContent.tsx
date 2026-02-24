/**
 * Animation Settings Content
 * Контент для настройки уменьшения анимаций
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { useAnimationStore } from '@shared/store/animationStore';

interface AnimationOption {
  value: boolean;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
}

const AnimationSettingsContent: React.FC = () => {
  const { theme } = useTheme();
  const { reduceAnimations, setReduceAnimations } = useAnimationStore();

  const animationOptions: AnimationOption[] = [
    {
      value: false,
      label: 'Анимации включены',
      icon: 'sparkles-outline',
      description: 'Плавные переходы и эффекты для всех окон и элементов',
    },
    {
      value: true,
      label: 'Уменьшить анимации',
      icon: 'flash-outline',
      description: 'Отключает анимации модальных окон и переходов для повышения производительности',
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
      {animationOptions.map((option) => {
        const isActive = reduceAnimations === option.value;

        return (
          <TouchableOpacity
            key={String(option.value)}
            style={[
              dynamicStyles.optionCard,
              isActive && dynamicStyles.optionCardActive,
            ]}
            onPress={() => setReduceAnimations(option.value)}
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

export default AnimationSettingsContent;
