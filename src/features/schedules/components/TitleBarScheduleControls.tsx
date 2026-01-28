/**
 * TitleBarScheduleControls
 * Компактные контролы графиков для Electron TitleBar
 * Только кнопка создания (переключатель месяца остается на экране)
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

interface TitleBarScheduleControlsProps {
  canCreate: boolean;
  onNewSchedule: () => void;
}

export const TitleBarScheduleControls: React.FC<TitleBarScheduleControlsProps> = ({
  canCreate,
  onNewSchedule,
}) => {
  const { theme } = useTheme();

  if (!canCreate) return null;

  return (
    <View style={styles.container}>
      {/* Create Button */}
      <View
        style={[styles.addButton, { backgroundColor: theme.primary }]}
        // @ts-ignore - Web-only
        onClick={onNewSchedule}
        title="Создать график"
        onMouseEnter={(e: any) => e.currentTarget?.style && (e.currentTarget.style.opacity = '0.9')}
        onMouseLeave={(e: any) => e.currentTarget?.style && (e.currentTarget.style.opacity = '1')}
      >
        <Ionicons name="add" size={16} color="#FFFFFF" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  } as any,
  addButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'opacity 0.15s ease',
  } as any,
});
