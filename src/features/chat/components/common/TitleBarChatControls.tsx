/**
 * TitleBarChatControls
 * Компактные контролы чатов для Electron TitleBar
 * Содержит кнопку меню (три точки) и создания чата с dropdown
 */

import React, { useRef, useMemo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { ExpandableCreateButton } from '@shared/components/common';
import { ContextMenu, ContextMenuOption } from '@shared/components/common/ContextMenu';
import { ChatType } from '../../types/chat.types';

interface TitleBarChatControlsProps {
  isEditMode: boolean;
  onToggleEditMode: () => void;
  onNewChat?: () => void;
  isCreateMenuVisible?: boolean;
  onCreateMenuClose?: () => void;
  onCreateChatType?: (type: ChatType) => void;
  /** Show only edit/done button (for left controls) */
  showEditOnly?: boolean;
  /** Show only create button (for right controls) */
  showCreateOnly?: boolean;
}

export const TitleBarChatControls: React.FC<TitleBarChatControlsProps> = ({
  isEditMode,
  onToggleEditMode,
  onNewChat,
  isCreateMenuVisible = false,
  onCreateMenuClose,
  onCreateChatType,
  showEditOnly = false,
  showCreateOnly = false,
}) => {
  const { theme } = useTheme();
  const addButtonRef = useRef<View>(null);

  const createMenuOptions: ContextMenuOption[] = useMemo(() => [
    {
      key: 'private',
      icon: 'person',
      label: 'Личный чат',
      onPress: () => onCreateChatType?.('private'),
    },
    {
      key: 'group',
      icon: 'people',
      label: 'Групповой чат',
      onPress: () => onCreateChatType?.('group'),
    },
    {
      key: 'channel',
      icon: 'megaphone',
      label: 'Создать канал',
      onPress: () => onCreateChatType?.('channel'),
    },
  ], [onCreateChatType]);

  // Show only edit/done button (for left controls)
  if (showEditOnly) {
    return (
      <View style={styles.container}>
        {isEditMode ? (
          <View
            style={[styles.doneButton, { backgroundColor: theme.backgroundTertiary }]}
            // @ts-ignore - Web-only
            onClick={onToggleEditMode}
            title="Готово"
            onMouseEnter={(e: any) => e.currentTarget?.style && (e.currentTarget.style.backgroundColor = theme.border)}
            onMouseLeave={(e: any) => e.currentTarget?.style && (e.currentTarget.style.backgroundColor = theme.backgroundTertiary)}
          >
            <Text style={[styles.doneButtonText, { color: theme.error }]}>Готово</Text>
          </View>
        ) : (
          <View
            style={[styles.menuButton, { backgroundColor: theme.backgroundTertiary }]}
            // @ts-ignore - Web-only
            onClick={onToggleEditMode}
            title="Редактировать"
            onMouseEnter={(e: any) => e.currentTarget?.style && (e.currentTarget.style.backgroundColor = theme.border)}
            onMouseLeave={(e: any) => e.currentTarget?.style && (e.currentTarget.style.backgroundColor = theme.backgroundTertiary)}
          >
            <Ionicons name="ellipsis-vertical" size={14} color={theme.text} />
            <Text style={[styles.buttonLabel, { color: theme.text }]}>Изменить</Text>
          </View>
        )}
      </View>
    );
  }

  // Show only create button (for right controls)
  if (showCreateOnly) {
    return (
      <View style={styles.container}>
        {!isEditMode && onNewChat && (
          <>
            <View ref={addButtonRef} collapsable={false}>
              <ExpandableCreateButton
                label="Создать"
                title="Создать чат"
                onPress={onNewChat}
              />
            </View>

            {/* Create Chat Dropdown Menu */}
            {onCreateMenuClose && (
              <ContextMenu
                visible={isCreateMenuVisible}
                options={createMenuOptions}
                onClose={onCreateMenuClose}
                anchorRef={addButtonRef}
                preferPosition="below"
              />
            )}
          </>
        )}
      </View>
    );
  }

  // Default: show all controls (backwards compatibility)
  return (
    <View style={styles.container}>
      {/* Edit Mode / Menu Button */}
      {isEditMode ? (
        <View
          style={[styles.doneButton, { backgroundColor: theme.backgroundTertiary }]}
          // @ts-ignore - Web-only
          onClick={onToggleEditMode}
          title="Готово"
          onMouseEnter={(e: any) => e.currentTarget?.style && (e.currentTarget.style.backgroundColor = theme.border)}
          onMouseLeave={(e: any) => e.currentTarget?.style && (e.currentTarget.style.backgroundColor = theme.backgroundTertiary)}
        >
          <Text style={[styles.doneButtonText, { color: theme.error }]}>Готово</Text>
        </View>
      ) : (
        <View
          style={[styles.menuButton, { backgroundColor: theme.backgroundTertiary }]}
          // @ts-ignore - Web-only
          onClick={onToggleEditMode}
          title="Редактировать"
          onMouseEnter={(e: any) => e.currentTarget?.style && (e.currentTarget.style.backgroundColor = theme.border)}
          onMouseLeave={(e: any) => e.currentTarget?.style && (e.currentTarget.style.backgroundColor = theme.backgroundTertiary)}
        >
          <Ionicons name="ellipsis-vertical" size={14} color={theme.text} />
          <Text style={[styles.buttonLabel, { color: theme.text }]}>Изменить</Text>
        </View>
      )}

      {/* Create Chat Button */}
      {!isEditMode && onNewChat && (
        <View ref={addButtonRef} collapsable={false}>
          <ExpandableCreateButton
            label="Создать"
            title="Создать чат"
            onPress={onNewChat}
          />
        </View>
      )}

      {/* Create Chat Dropdown Menu */}
      {onCreateMenuClose && (
        <ContextMenu
          visible={isCreateMenuVisible}
          options={createMenuOptions}
          onClose={onCreateMenuClose}
          anchorRef={addButtonRef}
          preferPosition="below"
        />
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
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
    gap: 6,
  } as any,
  doneButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  } as any,
  doneButtonText: {
    fontSize: 13,
    fontWeight: '500',
  } as any,
  buttonLabel: {
    fontSize: 13,
    fontWeight: '500',
  } as any,
});
