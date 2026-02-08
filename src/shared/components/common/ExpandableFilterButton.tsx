/**
 * ExpandableFilterButton
 * Компактная кнопка фильтра с анимацией раскрытия текста при наведении
 * Используется в TitleBar для задач, опросов, нерабочих дней и т.д.
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

interface ExpandableFilterButtonProps {
  /** Текст кнопки (показывается при наведении) */
  label?: string;
  /** Tooltip при наведении */
  title?: string;
  /** Обработчик клика */
  onPress: () => void;
  /** Есть ли активные фильтры (показывает индикатор) */
  hasActiveFilters?: boolean;
  /** Размер иконки */
  iconSize?: number;
  /** Имя иконки */
  iconName?: keyof typeof Ionicons.glyphMap;
  /** Отключена ли кнопка */
  disabled?: boolean;
  /** Ref для позиционирования dropdown */
  buttonRef?: React.RefObject<View>;
}

export const ExpandableFilterButton: React.FC<ExpandableFilterButtonProps> = ({
  label = 'Фильтры',
  title,
  onPress,
  hasActiveFilters = false,
  iconSize = 14,
  iconName = 'funnel-outline',
  disabled = false,
  buttonRef,
}) => {
  const { theme } = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const widthAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

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
    outputRange: [0, 56], // Ширина для текста "Фильтры"
  });

  const animatedGap = widthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 6],
  });

  return (
    <Animated.View
      // @ts-ignore - ref type
      ref={buttonRef}
      collapsable={false}
      style={[
        styles.button,
        {
          backgroundColor: theme.backgroundTertiary,
        },
        disabled && styles.disabled,
      ]}
      // @ts-ignore - Web-only event handlers
      onClick={disabled ? undefined : onPress}
      title={title || label}
      onMouseEnter={(e: any) => {
        if (!disabled) {
          setIsHovered(true);
          if (e.currentTarget?.style) {
            e.currentTarget.style.backgroundColor = theme.border;
          }
        }
      }}
      onMouseLeave={(e: any) => {
        setIsHovered(false);
        if (e.currentTarget?.style) {
          e.currentTarget.style.backgroundColor = theme.backgroundTertiary;
        }
      }}
    >
      <Ionicons name={iconName} size={iconSize} color={theme.text} />
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
        <Text style={[styles.label, { color: theme.text }]} numberOfLines={1}>
          {label}
        </Text>
      </Animated.View>
      {hasActiveFilters && (
        <View style={[styles.filterIndicator, { backgroundColor: theme.primary }]} />
      )}
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
    transition: 'background-color 0.15s ease',
    overflow: 'hidden',
    position: 'relative',
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
  filterIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
  } as any,
});

export default ExpandableFilterButton;
