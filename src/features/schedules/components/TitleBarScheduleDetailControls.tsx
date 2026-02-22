/**
 * TitleBarScheduleDetailControls
 * Компактные контролы для деталей графика в Electron TitleBar
 * Переключатель видов (list/grid/shifts), кнопка меню, кнопки Сохранить/Отменить
 */

import React, { useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

export type ScheduleViewMode = 'list' | 'grid' | 'shifts';

interface TitleBarScheduleDetailControlsProps {
  viewMode: ScheduleViewMode;
  onViewModeChange: (mode: ScheduleViewMode) => void;
  showViewSwitcher: boolean;
  canEdit?: boolean;
  onOpenMenu?: () => void;
  onMenuButtonLayout?: (layout: { x: number; y: number; width: number; height: number }) => void;
  /** Show only view switcher (for left controls) */
  showViewSwitcherOnly?: boolean;
  /** Show only menu button (for right controls) */
  showMenuOnly?: boolean;
  /** Number of pending changes (shows Save/Discard buttons when > 0) */
  pendingChangesCount?: number;
  /** Callback when Save button is pressed */
  onSavePendingChanges?: () => void;
  /** Callback when Discard button is pressed */
  onDiscardPendingChanges?: () => void;
  /** Whether batch save is in progress */
  isSavingChanges?: boolean;
  /** Whether the schedule is a draft */
  isDraft?: boolean;
  /** Callback when Publish button is pressed */
  onPublish?: () => void;
  /** Whether publish is in progress */
  isPublishing?: boolean;
}

// Иконки для видов
const VIEW_OPTIONS: { value: ScheduleViewMode; icon: keyof typeof Ionicons.glyphMap; tooltip: string; label: string }[] = [
  { value: 'list', icon: 'list-outline', tooltip: 'Список', label: 'Список' },
  { value: 'grid', icon: 'grid-outline', tooltip: 'Сетка (сотрудники)', label: 'Сетка' },
  { value: 'shifts', icon: 'calendar-outline', tooltip: 'Смены (даты)', label: 'Смены' },
];

export const TitleBarScheduleDetailControls: React.FC<TitleBarScheduleDetailControlsProps> = ({
  viewMode,
  onViewModeChange,
  showViewSwitcher,
  canEdit,
  onOpenMenu,
  onMenuButtonLayout,
  showViewSwitcherOnly = false,
  showMenuOnly = false,
  pendingChangesCount = 0,
  onSavePendingChanges,
  onDiscardPendingChanges,
  isSavingChanges = false,
  isDraft = false,
  onPublish,
  isPublishing = false,
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
    onOpenMenu?.();
  };

  const currentViewLabel = VIEW_OPTIONS.find(o => o.value === viewMode)?.label || '';

  // Render view switcher component
  const renderViewSwitcher = () => (
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
      <Text style={[styles.viewLabel, { color: theme.text }]}>
        {currentViewLabel}
      </Text>
    </View>
  );

  // Render menu button component
  const renderMenuButton = () => (
    <View
      // @ts-ignore - ref type
      ref={menuButtonRef}
      style={[styles.menuButton, { borderColor: theme.border }]}
      // @ts-ignore - Web-only
      onClick={handleOpenMenu}
      title="Меню"
      onMouseEnter={(e: any) => e.currentTarget?.style && (e.currentTarget.style.backgroundColor = theme.backgroundTertiary)}
      onMouseLeave={(e: any) => e.currentTarget?.style && (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      <Ionicons name="ellipsis-horizontal" size={14} color={theme.text} />
    </View>
  );

  // Render pending changes Save/Discard controls
  const renderPendingChangesControls = () => {
    if (!pendingChangesCount || pendingChangesCount === 0) return null;

    return (
      <View style={styles.pendingControls}>
        {/* Discard button */}
        <View
          style={[styles.discardButton, { borderColor: theme.border }]}
          // @ts-ignore - Web-only
          onClick={onDiscardPendingChanges}
          title="Отменить изменения"
          onMouseEnter={(e: any) => e.currentTarget?.style && (e.currentTarget.style.backgroundColor = theme.backgroundTertiary)}
          onMouseLeave={(e: any) => e.currentTarget?.style && (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <Ionicons name="close" size={14} color={theme.textSecondary} />
        </View>

        {/* Save button with counter */}
        <View
          style={[
            styles.saveButton,
            { backgroundColor: isSavingChanges ? theme.primary + '80' : theme.primary },
          ]}
          // @ts-ignore - Web-only
          onClick={isSavingChanges ? undefined : onSavePendingChanges}
          title={`Сохранить ${pendingChangesCount} изменений`}
          onMouseEnter={(e: any) => {
            if (!isSavingChanges && e.currentTarget?.style) {
              e.currentTarget.style.opacity = '0.85';
            }
          }}
          onMouseLeave={(e: any) => {
            if (e.currentTarget?.style) {
              e.currentTarget.style.opacity = '1';
            }
          }}
        >
          {isSavingChanges ? (
            <ActivityIndicator size={12} color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark" size={13} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>
                Сохранить ({pendingChangesCount})
              </Text>
            </>
          )}
        </View>
      </View>
    );
  };

  // Render publish button for draft schedules
  const renderPublishButton = () => {
    if (!isDraft || !onPublish || (pendingChangesCount && pendingChangesCount > 0)) return null;

    return (
      <View
        style={[
          styles.publishButton,
          { backgroundColor: isPublishing ? '#10B981' + '80' : '#10B981' },
        ]}
        // @ts-ignore - Web-only
        onClick={isPublishing ? undefined : onPublish}
        title="Опубликовать график"
        onMouseEnter={(e: any) => {
          if (!isPublishing && e.currentTarget?.style) {
            e.currentTarget.style.opacity = '0.85';
          }
        }}
        onMouseLeave={(e: any) => {
          if (e.currentTarget?.style) {
            e.currentTarget.style.opacity = '1';
          }
        }}
      >
        {isPublishing ? (
          <ActivityIndicator size={12} color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="send" size={13} color="#FFFFFF" />
            <Text style={styles.publishButtonText}>Опубликовать</Text>
          </>
        )}
      </View>
    );
  };

  // Show only view switcher (for left controls)
  if (showViewSwitcherOnly) {
    return (
      <View style={styles.container}>
        {showViewSwitcher && renderViewSwitcher()}
      </View>
    );
  }

  // Show only menu button (for right controls)
  if (showMenuOnly) {
    return (
      <View style={styles.container}>
        {renderPublishButton()}
        {renderPendingChangesControls()}
        {canEdit && onOpenMenu && renderMenuButton()}
      </View>
    );
  }

  // Default: show all controls (backwards compatibility)
  return (
    <View style={styles.container}>
      {/* View Switcher - only for monthly mode */}
      {showViewSwitcher && renderViewSwitcher()}

      {/* Publish button for drafts */}
      {renderPublishButton()}

      {/* Pending changes controls */}
      {renderPendingChangesControls()}

      {/* Menu Button - only for users who can edit */}
      {canEdit && onOpenMenu && renderMenuButton()}
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
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  } as any,
  viewLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginHorizontal: 6,
  } as any,
  buttonLabel: {
    fontSize: 13,
    fontWeight: '500',
  } as any,
  pendingControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  } as any,
  discardButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  } as any,
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'opacity 0.15s ease',
  } as any,
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  } as any,
  publishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'opacity 0.15s ease',
  } as any,
  publishButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  } as any,
});
