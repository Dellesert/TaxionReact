/**
 * TitleBarDepartmentControls
 * Кнопка меню (три точки) для отображения в Electron TitleBar при редактировании отдела
 */

import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

interface TitleBarDepartmentControlsProps {
  onOpenMenu: (position: { x: number; y: number; width: number; height: number }) => void;
}

export const TitleBarDepartmentControls: React.FC<TitleBarDepartmentControlsProps> = ({
  onOpenMenu,
}) => {
  const { theme } = useTheme();
  const menuButtonRef = useRef<View>(null);

  const handleOpenMenu = () => {
    if (menuButtonRef.current) {
      // @ts-ignore - Web-only method
      const rect = menuButtonRef.current.getBoundingClientRect?.();
      if (rect) {
        onOpenMenu({
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
        });
      }
    }
  };

  return (
    <View style={styles.container}>
      <View
        // @ts-ignore - ref type
        ref={menuButtonRef}
        style={[styles.menuButton, { borderColor: theme.border }]}
        // @ts-ignore - Web-only event handlers
        onClick={handleOpenMenu}
        onMouseEnter={(e: any) => {
          if (e.currentTarget?.style) e.currentTarget.style.backgroundColor = theme.backgroundTertiary;
        }}
        onMouseLeave={(e: any) => {
          if (e.currentTarget?.style) e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <Ionicons name="ellipsis-horizontal" size={14} color={theme.text} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  } as any,
  menuButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  } as any,
});
