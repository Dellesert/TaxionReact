import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SHIFT_TYPE_LABELS, type ShiftType } from '../types/schedule.types';
import { getShiftColor } from '../utils/shiftColors';

interface ShiftTypeBadgeProps {
  shiftType: ShiftType;
  size?: 'small' | 'medium';
}

export const ShiftTypeBadge: React.FC<ShiftTypeBadgeProps> = ({
  shiftType,
  size = 'medium',
}) => {
  const colors = getShiftColor(shiftType);
  const isSmall = size === 'small';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
          paddingHorizontal: isSmall ? 6 : 10,
          paddingVertical: isSmall ? 2 : 4,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: colors.text,
            fontSize: isSmall ? 10 : 12,
          },
        ]}
      >
        {SHIFT_TYPE_LABELS[shiftType]}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    borderWidth: 1,
  },
  text: {
    fontWeight: '600',
    lineHeight: 16,
  },
});
