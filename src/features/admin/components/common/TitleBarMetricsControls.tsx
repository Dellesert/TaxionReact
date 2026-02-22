/**
 * TitleBarMetricsControls
 * Переключатель периода для TitleBar (левая часть) на экране основных показателей
 * По аналогии с TitleBarViewSwitcher в задачах
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';
import type { PeriodType } from '@api/analytics.api';

const PERIOD_OPTIONS: { value: PeriodType; label: string; short: string }[] = [
  { value: 'today', label: 'Сегодня', short: 'Д' },
  { value: 'week', label: 'Неделя', short: 'Н' },
  { value: 'month', label: 'Месяц', short: 'М' },
  { value: 'year', label: 'Год', short: 'Г' },
];

interface TitleBarMetricsControlsProps {
  selectedPeriod: PeriodType;
  onPeriodChange: (period: PeriodType) => void;
}

export const TitleBarMetricsControls: React.FC<TitleBarMetricsControlsProps> = ({
  selectedPeriod,
  onPeriodChange,
}) => {
  const { theme } = useTheme();
  const currentOption = PERIOD_OPTIONS.find(o => o.value === selectedPeriod);

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundTertiary }]}>
      {PERIOD_OPTIONS.map((option) => (
        <View
          key={option.value}
          style={[
            styles.button,
            selectedPeriod === option.value && [styles.activeButton, { backgroundColor: theme.backgroundSecondary }],
          ]}
          // @ts-ignore - Web-only
          onClick={() => onPeriodChange(option.value)}
          title={option.label}
          onMouseEnter={(e: any) => {
            if (selectedPeriod !== option.value && e.currentTarget?.style) {
              e.currentTarget.style.backgroundColor = theme.border;
            }
          }}
          onMouseLeave={(e: any) => {
            if (selectedPeriod !== option.value && e.currentTarget?.style) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          <Text
            style={[
              styles.shortLabel,
              { color: selectedPeriod === option.value ? theme.primary : theme.textSecondary },
              selectedPeriod === option.value && styles.shortLabelActive,
            ]}
          >
            {option.short}
          </Text>
        </View>
      ))}
      <Text style={[styles.label, { color: theme.text }]}>
        {currentOption?.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    padding: 2,
    gap: 2,
  } as any,
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 26,
    borderRadius: 4,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  } as any,
  activeButton: {
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
  } as any,
  shortLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  shortLabelActive: {
    fontWeight: '700',
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    marginHorizontal: 6,
  } as any,
});
