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
          <Ionicons name="chevron-back" size={20} color={theme.text} />
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
          <Ionicons name="chevron-forward" size={20} color={theme.text} />
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
      ios: {
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearButton: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    minWidth: 140,
  },
  yearText: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
