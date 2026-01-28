/**
 * TitleBarScheduleDetailControls
 * Компактные контролы для деталей графика в Electron TitleBar
 * Переключатель видов (list/grid/shifts) и кнопка меню
 */

import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

export type ScheduleViewMode = 'list' | 'grid' | 'shifts';

interface TitleBarScheduleDetailControlsProps {
  viewMode: ScheduleViewMode;
  onViewModeChange: (mode: ScheduleViewMode) => void;
  showViewSwitcher: boolean;
  canEdit: boolean;
  onOpenMenu: () => void;
  onMenuButtonLayout?: (layout: { x: number; y: number; width: number; height: number }) => void;
}

// Иконки для видов
const VIEW_OPTIONS: { value: ScheduleViewMode; icon: keyof typeof Ionicons.glyphMap; tooltip: string }[] = [
  { value: 'list', icon: 'list-outline', tooltip: 'Список' },
  { value: 'grid', icon: 'grid-outline', tooltip: 'Сетка (сотрудники)' },
  { value: 'shifts', icon: 'calendar-outline', tooltip: 'Смены (даты)' },
];

export const TitleBarScheduleDetailControls: React.FC<TitleBarScheduleDetailControlsProps> = ({
  viewMode,
  onViewModeChange,
  showViewSwitcher,
  canEdit,
  onOpenMenu,
  onMenuButtonLayout,
}) => {
  const { theme } = useTheme();
  const menuButtonRef = useRef<View>(null);

  const handleOpenMenu = () => {
    if (onMenuButtonLayout && menuButtonRef.current) {
      // @ts-ignore - Web-only method
      const rect = menuButtonRef.current.getBoundingClientRect?.();
      if (rect) {
        onMenuButtonLayout({
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
        });
      }
    }
    onOpenMenu();
  };

  return (
    <View style={styles.container}>
      {/* View Switcher - only for monthly mode */}
      {showViewSwitcher && (
        <View style={[styles.viewGroup, { backgroundColor: theme.backgroundTertiary }]}>
          {VIEW_OPTIONS.map((option) => (
            <View
              key={option.value}
              style={[
                styles.viewButton,
                viewMode === option.value && [styles.activeViewButton, { backgroundColor: theme.backgroundSecondary }],
              ]}
              // @ts-ignore - Web-only
              onClick={() => onViewModeChange(option.value)}
              title={option.tooltip}
              onMouseEnter={(e: any) => {
                if (viewMode !== option.value && e.currentTarget?.style) {
                  e.currentTarget.style.backgroundColor = theme.border;
                }
              }}
              onMouseLeave={(e: any) => {
                if (viewMode !== option.value && e.currentTarget?.style) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <Ionicons
                name={option.icon}
                size={14}
                color={viewMode === option.value ? theme.primary : theme.textSecondary}
              />
            </View>
          ))}
        </View>
      )}

      {/* Menu Button - only for users who can edit */}
      {canEdit && (
        <View
          // @ts-ignore - ref type
          ref={menuButtonRef}
          style={[styles.menuButton, { backgroundColor: theme.backgroundTertiary }]}
          // @ts-ignore - Web-only
          onClick={handleOpenMenu}
          title="Меню"
          onMouseEnter={(e: any) => e.currentTarget?.style && (e.currentTarget.style.backgroundColor = theme.border)}
          onMouseLeave={(e: any) => e.currentTarget?.style && (e.currentTarget.style.backgroundColor = theme.backgroundTertiary)}
        >
          <Ionicons name="ellipsis-horizontal" size={14} color={theme.text} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  } as any,
  viewGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    padding: 2,
    gap: 2,
  } as any,
  viewButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 26,
    borderRadius: 4,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  } as any,
  activeViewButton: {
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
  } as any,
  menuButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  } as any,
});
