/**
 * ColorPicker Component
 * Компонент для выбора цвета из палитры
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { USER_COLOR_PALETTE } from '@features/absences/constants/userColors.constants';

interface ColorPickerProps {
  /** Текущий выбранный цвет (HEX) */
  value?: string;
  /** Callback при выборе цвета */
  onChange: (color: string) => void;
  /** Массив цветов для выбора (по умолчанию USER_COLOR_PALETTE) */
  colors?: string[];
  /** Заблокирован ли выбор */
  disabled?: boolean;
  /** Заголовок */
  label?: string;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  value,
  onChange,
  colors = USER_COLOR_PALETTE,
  disabled = false,
  label,
}) => {
  const { theme } = useTheme();

  const handleColorPress = (color: string) => {
    if (!disabled) {
      onChange(color);
    }
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: theme.textSecondary }]}>
          {label}
        </Text>
      )}
      <View style={styles.colorsGrid}>
        {colors.map((color, index) => {
          const isSelected = value === color;
          return (
            <TouchableOpacity
              key={`${color}-${index}`}
              onPress={() => handleColorPress(color)}
              disabled={disabled}
              style={[
                styles.colorButton,
                { backgroundColor: color },
                isSelected && styles.selectedColorButton,
                isSelected && { borderColor: theme.primary },
                disabled && styles.disabledColorButton,
              ]}
              activeOpacity={0.7}
            >
              {isSelected && (
                <Ionicons
                  name="checkmark"
                  size={16}
                  color="#FFFFFF"
                  style={styles.checkIcon}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      {value && (
        <View style={styles.previewRow}>
          <View
            style={[
              styles.previewColor,
              { backgroundColor: value },
            ]}
          />
          <Text style={[styles.previewText, { color: theme.text }]}>
            {value}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  colorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColorButton: {
    borderWidth: 3,
  },
  disabledColorButton: {
    opacity: 0.5,
  },
  checkIcon: {
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  previewColor: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  previewText: {
    fontSize: 13,
    fontFamily: 'monospace',
  },
});

export default ColorPicker;
