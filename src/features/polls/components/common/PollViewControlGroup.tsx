import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

export type ViewMode = 'grid' | 'table';

interface PollViewControlGroupProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export const PollViewControlGroup: React.FC<PollViewControlGroupProps> = ({
  viewMode,
  onViewModeChange,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}>
      {/* Grid View Button */}
      <TouchableOpacity
        style={[
          styles.button,
          viewMode === 'grid' && [
            styles.activeButton,
            { backgroundColor: theme.background },
          ],
        ]}
        onPress={() => onViewModeChange('grid')}
        accessibilityLabel="Вид: Сетка"
        accessibilityRole="button"
        accessibilityState={{ selected: viewMode === 'grid' }}
      >
        <Ionicons
          name="grid-outline"
          size={16}
          color={viewMode === 'grid' ? theme.primary : theme.textSecondary}
        />
        <Text
          style={[
            styles.buttonText,
            { color: viewMode === 'grid' ? theme.text : theme.textSecondary },
            viewMode === 'grid' && styles.activeButtonText,
          ]}
        >
          Сетка
        </Text>
      </TouchableOpacity>

      {/* Table View Button */}
      <TouchableOpacity
        style={[
          styles.button,
          viewMode === 'table' && [
            styles.activeButton,
            { backgroundColor: theme.background },
          ],
        ]}
        onPress={() => onViewModeChange('table')}
        accessibilityLabel="Вид: Таблица"
        accessibilityRole="button"
        accessibilityState={{ selected: viewMode === 'table' }}
      >
        <Ionicons
          name="list-outline"
          size={16}
          color={viewMode === 'table' ? theme.primary : theme.textSecondary}
        />
        <Text
          style={[
            styles.buttonText,
            { color: viewMode === 'table' ? theme.text : theme.textSecondary },
            viewMode === 'table' && styles.activeButtonText,
          ]}
        >
          Таблица
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 3,
    gap: 2,
    flexShrink: 0,
    ...Platform.select({
      web: {
        userSelect: 'none',
      },
    }),
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    minHeight: 44, // Accessibility: minimum touch target
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      },
      default: {
        // Mobile shadow for inactive buttons
      },
    }),
  },
  activeButton: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
    lineHeight: 18,
    ...Platform.select({
      web: {
        userSelect: 'none',
      },
    }),
  },
  activeButtonText: {
    fontWeight: '700',
  },
});
