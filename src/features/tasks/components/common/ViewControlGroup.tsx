import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

export type ViewMode = 'board' | 'table';

interface ViewControlGroupProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  expandedAll: boolean;
  onExpandToggle: () => void;
  subtaskCount: number;
}

export const ViewControlGroup: React.FC<ViewControlGroupProps> = ({
  viewMode,
  onViewModeChange,
  expandedAll,
  onExpandToggle,
  subtaskCount,
}) => {
  const { theme } = useTheme();

  const showExpandButton = subtaskCount > 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}>
      {/* Board View Button */}
      <TouchableOpacity
        style={[
          styles.button,
          viewMode === 'board' && [
            styles.activeButton,
            { backgroundColor: theme.background },
          ],
        ]}
        onPress={() => onViewModeChange('board')}
        accessibilityLabel="Вид: Доска"
        accessibilityRole="button"
        accessibilityState={{ selected: viewMode === 'board' }}
      >
        <Ionicons
          name="grid-outline"
          size={16}
          color={viewMode === 'board' ? theme.primary : theme.textSecondary}
        />
        <Text
          style={[
            styles.buttonText,
            { color: viewMode === 'board' ? theme.text : theme.textSecondary },
            viewMode === 'board' && styles.activeButtonText,
          ]}
        >
          Доска
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

      {/* Divider */}
      {showExpandButton && (
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
      )}

      {/* Expand All Button */}
      {showExpandButton && (
        <TouchableOpacity
          style={styles.button}
          onPress={onExpandToggle}
          accessibilityLabel={
            expandedAll
              ? `Свернуть все подзадачи (${subtaskCount})`
              : `Развернуть все подзадачи (${subtaskCount})`
          }
          accessibilityRole="button"
          accessibilityState={{ expanded: expandedAll }}
        >
          <Ionicons
            name={expandedAll ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={theme.textSecondary}
          />
          <Text style={[styles.buttonText, { color: theme.textSecondary }]}>
            {expandedAll ? 'Свернуть' : 'Все'} ({subtaskCount})
          </Text>
        </TouchableOpacity>
      )}
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
  divider: {
    width: 1,
    height: 24,
    marginHorizontal: 4,
  },
});
