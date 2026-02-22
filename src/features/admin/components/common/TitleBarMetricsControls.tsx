/**
 * TitleBarPeriodSwitcher
 * Универсальный переключатель периода для TitleBar (левая часть)
 * По аналогии с TitleBarViewSwitcher в задачах
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';

export interface PeriodOption<T extends string> {
  value: T;
  label: string;
  short: string;
}

interface TitleBarPeriodSwitcherProps<T extends string> {
  options: PeriodOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function TitleBarPeriodSwitcher<T extends string>({
  options,
  value,
  onChange,
}: TitleBarPeriodSwitcherProps<T>) {
  const { theme } = useTheme();
  const currentOption = options.find(o => o.value === value);

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundTertiary }]}>
      {options.map((option) => (
        <View
          key={option.value}
          style={[
            styles.button,
            value === option.value && [styles.activeButton, { backgroundColor: theme.backgroundSecondary }],
          ]}
          // @ts-ignore - Web-only
          onClick={() => onChange(option.value)}
          title={option.label}
          onMouseEnter={(e: any) => {
            if (value !== option.value && e.currentTarget?.style) {
              e.currentTarget.style.backgroundColor = theme.border;
            }
          }}
          onMouseLeave={(e: any) => {
            if (value !== option.value && e.currentTarget?.style) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          <Text
            style={[
              styles.shortLabel,
              { color: value === option.value ? theme.primary : theme.textSecondary },
              value === option.value && styles.shortLabelActive,
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
}

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
    minWidth: 28,
    height: 26,
    paddingHorizontal: 6,
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
