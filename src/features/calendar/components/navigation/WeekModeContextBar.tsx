import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';
import { WeekDisplayMode } from '../../types/calendar.types';

interface WeekModeContextBarProps {
  selectedMode: WeekDisplayMode;
  onModeChange: (mode: WeekDisplayMode) => void;
}

export const WeekModeContextBar: React.FC<WeekModeContextBarProps> = ({
  selectedMode,
  onModeChange,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundSecondary, borderBottomColor: theme.border }]}>
      <View style={styles.content}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>Режим отображения:</Text>

        <View style={[styles.selector, { backgroundColor: theme.background }]}>
          <TouchableOpacity
            style={[
              styles.pill,
              selectedMode === 'timeline' && [styles.pillActive, { backgroundColor: theme.primary }],
            ]}
            onPress={() => onModeChange('timeline')}
          >
            <Text
              style={[
                styles.pillText,
                { color: theme.textSecondary },
                selectedMode === 'timeline' && styles.pillTextActive,
              ]}
            >
              Временная шкала
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.pill,
              selectedMode === 'list' && [styles.pillActive, { backgroundColor: theme.primary }],
            ]}
            onPress={() => onModeChange('list')}
          >
            <Text
              style={[
                styles.pillText,
                { color: theme.textSecondary },
                selectedMode === 'list' && styles.pillTextActive,
              ]}
            >
              Список
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    ...Platform.select({
      web: {
        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.06)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 1,
      },
    }),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  selector: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 2,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      },
    }),
  },
  pillActive: {
    // backgroundColor set dynamically
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
