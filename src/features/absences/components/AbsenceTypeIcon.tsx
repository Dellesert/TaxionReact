import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  ABSENCE_TYPE_COLORS,
  ABSENCE_TYPE_ICONS,
  type AbsenceType,
} from '../types/absence.types';

interface AbsenceTypeIconProps {
  type: AbsenceType;
  size?: 'small' | 'medium' | 'large';
}

const SIZES = {
  small: { container: 24, icon: 14 },
  medium: { container: 32, icon: 18 },
  large: { container: 44, icon: 24 },
};

export const AbsenceTypeIcon: React.FC<AbsenceTypeIconProps> = ({
  type,
  size = 'medium',
}) => {
  const color = ABSENCE_TYPE_COLORS[type];
  const iconName = ABSENCE_TYPE_ICONS[type] as keyof typeof Ionicons.glyphMap;
  const { container: containerSize, icon: iconSize } = SIZES[size];

  return (
    <View
      style={[
        styles.container,
        {
          width: containerSize,
          height: containerSize,
          borderRadius: containerSize / 2,
          backgroundColor: `${color}20`,
        },
      ]}
    >
      <Ionicons name={iconName} size={iconSize} color={color} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
