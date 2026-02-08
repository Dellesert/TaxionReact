/**
 * ExpandableCreateButton
 * Компактная кнопка создания с анимацией раскрытия текста при наведении
 * Используется в TitleBar для задач, чатов, событий, опросов и т.д.
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

interface ExpandableCreateButtonProps {
  /** Текст кнопки (показывается при наведении) */
  label?: string;
  /** Tooltip при наведении */
  title?: string;
  /** Обработчик клика */
  onPress: () => void;
  /** Размер иконки */
  iconSize?: number;
  /** Имя иконки */
  iconName?: keyof typeof Ionicons.glyphMap;
  /** Цвет фона (по умолчанию theme.primary) */
  backgroundColor?: string;
  /** Цвет иконки и текста */
  color?: string;
  /** Отключена ли кнопка */
  disabled?: boolean;
}

export const ExpandableCreateButton: React.FC<ExpandableCreateButtonProps> = ({
  label = 'Создать',
  title,
  onPress,
  iconSize = 16,
  iconName = 'add',
  backgroundColor,
  color = '#FFFFFF',
  disabled = false,
}) => {
  const { theme } = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const widthAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const bgColor = backgroundColor || theme.primary;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(widthAnim, {
        toValue: isHovered ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(opacityAnim, {
        toValue: isHovered ? 1 : 0,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start();
  }, [isHovered, widthAnim, opacityAnim]);

  const animatedWidth = widthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 56], // Ширина для текста "Создать"
  });

  const animatedGap = widthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 6],
  });

  return (
    <Animated.View
      style={[
        styles.button,
        {
          backgroundColor: bgColor,
        },
        disabled && styles.disabled,
      ]}
      // @ts-ignore - Web-only event handlers
      onClick={disabled ? undefined : onPress}
      title={title || label}
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Ionicons name={iconName} size={iconSize} color={color} />
      <Animated.View
        style={[
          styles.labelContainer,
          {
            width: animatedWidth,
            opacity: opacityAnim,
            marginLeft: animatedGap,
          },
        ]}
      >
        <Text style={[styles.label, { color }]} numberOfLines={1}>
          {label}
        </Text>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 28,
    paddingHorizontal: 6,
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'opacity 0.15s ease',
    overflow: 'hidden',
  } as any,
  disabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  } as any,
  labelContainer: {
    overflow: 'hidden',
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    whiteSpace: 'nowrap',
    marginTop: -2,
  } as any,
});

export default ExpandableCreateButton;
