/**
 * TitleBarTaskDetailControls
 * Компактные кнопки действий задачи для отображения в Electron TitleBar
 */

import React, { useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import type { Task } from '../../types/task.types';

interface TitleBarTaskDetailControlsProps {
  task: Task | null;
  permissions: {
    can_change_status: boolean;
    can_edit: boolean;
    can_delegate: boolean;
    can_create_subtasks: boolean;
    can_emergency_complete: boolean;
    can_delete: boolean;
  };
  isDelegatedByMe: boolean;
  isCreator: boolean;
  allSubtasksCompleted: boolean;
  allChecklistItemsCompleted: boolean;
  onTaskAction: () => void;
  onStatusChange: (status: Task['status']) => void | Promise<void>;
  onOpenMenu: (position: { x: number; y: number; width: number; height: number }) => void;
}

export const TitleBarTaskDetailControls: React.FC<TitleBarTaskDetailControlsProps> = ({
  task,
  permissions,
  isDelegatedByMe,
  isCreator,
  allSubtasksCompleted,
  allChecklistItemsCompleted,
  onTaskAction,
  onStatusChange,
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

  const showMenu = task && (
    permissions.can_edit ||
    permissions.can_delegate ||
    permissions.can_create_subtasks ||
    permissions.can_emergency_complete ||
    permissions.can_delete
  );

  const showStatusButtons = task && permissions.can_change_status && !isDelegatedByMe && task.status !== 'done';
  const isDisabled = !allSubtasksCompleted || !allChecklistItemsCompleted;

  return (
    <View style={styles.container}>
      {/* Status Action Buttons */}
      {showStatusButtons && (
        <>
          {task.status === 'new' && (
            <View
              style={[styles.statusButton, { backgroundColor: theme.primary }]}
              // @ts-ignore - Web-only event handlers
              onClick={onTaskAction}
              onMouseEnter={(e: any) => {
                if (e.currentTarget?.style) e.currentTarget.style.opacity = '0.9';
              }}
              onMouseLeave={(e: any) => {
                if (e.currentTarget?.style) e.currentTarget.style.opacity = '1';
              }}
            >
              <Ionicons name="play-circle-outline" size={12} color="#FFFFFF" />
              <Text style={styles.statusButtonText}>Начать</Text>
            </View>
          )}

          {task.status === 'in_progress' && (
            <View
              style={[
                styles.statusButton,
                { backgroundColor: theme.success },
                isDisabled && styles.statusButtonDisabled,
              ]}
              // @ts-ignore - Web-only event handlers
              onClick={isDisabled ? undefined : onTaskAction}
            >
              <Ionicons name="checkmark-circle-outline" size={12} color="#FFFFFF" />
              <Text style={styles.statusButtonText}>
                {isCreator ? 'Завершить' : 'На проверку'}
              </Text>
            </View>
          )}

          {task.status === 'review' && isCreator && (
            <>
              <View
                style={[styles.statusButton, styles.statusButtonSecondary, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
                // @ts-ignore - Web-only event handlers
                onClick={() => onStatusChange('in_progress')}
                onMouseEnter={(e: any) => {
                  if (e.currentTarget?.style) e.currentTarget.style.opacity = '0.9';
                }}
                onMouseLeave={(e: any) => {
                  if (e.currentTarget?.style) e.currentTarget.style.opacity = '1';
                }}
              >
                <Ionicons name="arrow-back-circle-outline" size={12} color={theme.text} />
                <Text style={[styles.statusButtonTextSecondary, { color: theme.text }]}>Вернуть</Text>
              </View>
              <View
                style={[
                  styles.statusButton,
                  { backgroundColor: theme.success },
                  isDisabled && styles.statusButtonDisabled,
                ]}
                // @ts-ignore - Web-only event handlers
                onClick={isDisabled ? undefined : () => onStatusChange('done')}
              >
                <Ionicons name="checkmark-circle-outline" size={12} color="#FFFFFF" />
                <Text style={styles.statusButtonText}>Завершить</Text>
              </View>
            </>
          )}
        </>
      )}

      {/* Menu Button */}
      {showMenu && (
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
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  } as any,
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
    cursor: 'pointer',
    transition: 'opacity 0.15s ease',
  } as any,
  statusButtonSecondary: {
    borderWidth: 1,
  },
  statusButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  } as any,
  statusButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusButtonTextSecondary: {
    fontSize: 11,
    fontWeight: '600',
  },
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
