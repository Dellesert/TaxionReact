/**
 * TitleBarChatControls
 * Компактные контролы чатов для Electron TitleBar
 * Содержит кнопку меню (три точки) и создания чата с dropdown
 */

import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, Text, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
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
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  // Update menu position when button is clicked
  useEffect(() => {
    if (isCreateMenuVisible && addButtonRef.current) {
      try {
        // @ts-ignore - Web-only method
        const rect = addButtonRef.current.getBoundingClientRect?.();
        if (rect) {
          setMenuPosition({
            top: rect.bottom + 4,
            left: rect.right - 180, // Align right edge of menu with button
          });
        }
      } catch (error) {
        console.error('Error getting button position:', error);
      }
    }
  }, [isCreateMenuVisible]);

  const handleCreateType = (type: ChatType) => {
    onCreateMenuClose?.();
    onCreateChatType?.(type);
  };

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
            <View
              // @ts-ignore - ref type
              ref={addButtonRef}
              style={[styles.addButton, { backgroundColor: theme.primary }]}
              // @ts-ignore - Web-only
              onClick={onNewChat}
              title="Создать чат"
              onMouseEnter={(e: any) => e.currentTarget?.style && (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={(e: any) => e.currentTarget?.style && (e.currentTarget.style.opacity = '1')}
            >
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.addButtonLabel}>Создать</Text>
            </View>

            {/* Create Chat Dropdown Menu */}
            {isCreateMenuVisible && onCreateMenuClose && onCreateChatType && (
              <Modal
                visible={isCreateMenuVisible}
                transparent
                animationType="fade"
                onRequestClose={onCreateMenuClose}
              >
                <TouchableOpacity
                  style={styles.modalOverlay}
                  activeOpacity={1}
                  onPress={onCreateMenuClose}
                >
                  <View
                    style={[
                      styles.dropdownMenu,
                      {
                        backgroundColor: theme.card,
                        top: menuPosition.top,
                        left: menuPosition.left,
                      },
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => handleCreateType('private')}
                    >
                      <Ionicons name="person" size={18} color={theme.primary} />
                      <Text style={[styles.menuItemText, { color: theme.text }]}>Личный чат</Text>
                    </TouchableOpacity>

                    <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />

                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => handleCreateType('group')}
                    >
                      <Ionicons name="people" size={18} color={theme.primary} />
                      <Text style={[styles.menuItemText, { color: theme.text }]}>Групповой чат</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </Modal>
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
        <View
          // @ts-ignore - ref type
          ref={addButtonRef}
          style={[styles.addButton, { backgroundColor: theme.primary }]}
          // @ts-ignore - Web-only
          onClick={onNewChat}
          title="Создать чат"
          onMouseEnter={(e: any) => e.currentTarget?.style && (e.currentTarget.style.opacity = '0.9')}
          onMouseLeave={(e: any) => e.currentTarget?.style && (e.currentTarget.style.opacity = '1')}
        >
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text style={styles.addButtonLabel}>Создать</Text>
        </View>
      )}

      {/* Create Chat Dropdown Menu */}
      {isCreateMenuVisible && onCreateMenuClose && onCreateChatType && (
        <Modal
          visible={isCreateMenuVisible}
          transparent
          animationType="fade"
          onRequestClose={onCreateMenuClose}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={onCreateMenuClose}
          >
            <View
              style={[
                styles.dropdownMenu,
                {
                  backgroundColor: theme.card,
                  top: menuPosition.top,
                  left: menuPosition.left,
                },
              ]}
            >
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleCreateType('private')}
              >
                <Ionicons name="person" size={18} color={theme.primary} />
                <Text style={[styles.menuItemText, { color: theme.text }]}>Личный чат</Text>
              </TouchableOpacity>

              <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleCreateType('group')}
              >
                <Ionicons name="people" size={18} color={theme.primary} />
                <Text style={[styles.menuItemText, { color: theme.text }]}>Групповой чат</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 28,
    paddingHorizontal: 10,
    paddingRight: 15,
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'opacity 0.15s ease',
    gap: 6,
  } as any,
  buttonLabel: {
    fontSize: 13,
    fontWeight: '500',
  } as any,
  addButtonLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FFFFFF',
  } as any,
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  } as any,
  dropdownMenu: {
    position: 'absolute',
    width: 180,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  } as any,
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  } as any,
  menuItemText: {
    fontSize: 14,
    fontWeight: '500',
  } as any,
  menuDivider: {
    height: 1,
    marginHorizontal: 12,
  } as any,
});
