import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

interface YearPickerProps {
  selectedYear: number;
  onYearChange: (year: number) => void;
}

export const YearPicker: React.FC<YearPickerProps> = React.memo(({
  selectedYear,
  onYearChange,
}) => {
  const { theme } = useTheme();

  const handlePrevYear = () => {
    onYearChange(selectedYear - 1);
  };

  const handleNextYear = () => {
    onYearChange(selectedYear + 1);
  };

  const handleToday = () => {
    onYearChange(new Date().getFullYear());
  };

  const isCurrentYear = selectedYear === new Date().getFullYear();

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.card,
            shadowColor: theme.shadow,
          }
        ]}
      >
        <TouchableOpacity
          onPress={handlePrevYear}
          style={[styles.arrowButton, { backgroundColor: theme.backgroundTertiary }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={18} color={theme.text} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleToday}
          style={styles.yearButton}
          activeOpacity={isCurrentYear ? 1 : 0.6}
          disabled={isCurrentYear}
        >
          <Text style={[styles.yearText, { color: theme.text }]}>
            {selectedYear}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleNextYear}
          style={[styles.arrowButton, { backgroundColor: theme.backgroundTertiary }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-forward" size={18} color={theme.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      },
    }),
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    // @ts-ignore
    cursor: 'pointer',
  },
  yearButton: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    minWidth: 140,
    // @ts-ignore
    cursor: 'pointer',
  },
  yearText: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    letterSpacing: 0.2,
  },
});
