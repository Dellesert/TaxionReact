/**
 * TitleBarPollControls
 * Компактные контролы опросов для Electron TitleBar (правая часть)
 * Содержит фильтры и создание
 */

import React, { useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { ExpandableCreateButton, ExpandableFilterButton } from '@shared/components/common';

export type PollViewMode = 'grid' | 'table';

interface TitleBarPollControlsProps {
  hasActiveFilters: boolean;
  onFilterToggle: () => void;
  onFilterButtonLayout?: (layout: { x: number; y: number; width: number; height: number }) => void;
  canCreatePoll: boolean;
  onNewPoll: () => void;
}

export const TitleBarPollControls: React.FC<TitleBarPollControlsProps> = ({
  hasActiveFilters,
  onFilterToggle,
  onFilterButtonLayout,
  canCreatePoll,
  onNewPoll,
}) => {
  const { theme } = useTheme();
  const filterButtonRef = useRef<View>(null);

  const handleFilterToggle = () => {
    if (onFilterButtonLayout && filterButtonRef.current) {
      // @ts-ignore - Web-only method
      const rect = filterButtonRef.current.getBoundingClientRect?.();
      if (rect) {
        onFilterButtonLayout({
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
        });
      }
    }
    onFilterToggle();
  };

  return (
    <View style={styles.container}>
      {/* Filter Button */}
      <ExpandableFilterButton
        label="Фильтры"
        title="Фильтры"
        onPress={handleFilterToggle}
        hasActiveFilters={hasActiveFilters}
        buttonRef={filterButtonRef}
      />

      {/* Create Button */}
      {canCreatePoll && (
        <ExpandableCreateButton
          label="Создать"
          title="Создать опрос"
          onPress={onNewPoll}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  } as any,
});
