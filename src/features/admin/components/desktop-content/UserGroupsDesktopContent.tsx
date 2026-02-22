/**
 * User Groups Desktop Content
 * Desktop версия управления группами пользователей с поиском в header
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@shared/hooks/useTheme';
import { useAuthStore } from '@shared/store/authStore';
import { useNotification } from '@shared/contexts/NotificationContext';
import { useActionModal } from '@shared/contexts/ActionModalContext';
import { ActionMenu } from '@shared/components/common/ActionMenu';
import { useTitleBarControlsIntegration } from '@shared/hooks/useTitleBarControlsIntegration';
import { ExpandableCreateButton } from '@shared/components/common/ExpandableCreateButton';
import { getUserGroups, createUserGroup, updateUserGroupMembers, deleteUserGroup, reorderUserGroups } from '@api/user-group.api';
import { UserGroup } from '@/types/user.types';
import UserSelectorModal from '@shared/components/common/UserSelectorModal';

const SIDEBAR_WIDTH = 320;

/** Обёртка для drag-and-drop через HTML5 API (RN Web View не поддерживает drag-события напрямую) */
const DraggableRow: React.FC<{
  index: number;
  isDragged: boolean;
  onDragStartIndex: (index: number) => void;
  onDragEnterIndex: (index: number) => void;
  onDropAtIndex: (index: number) => void;
  onDragEnd: () => void;
  children: React.ReactNode;
  style?: any;
}> = ({ index, isDragged, onDragStartIndex, onDragEnterIndex, onDropAtIndex, onDragEnd, children, style }) => {
  const ref = useRef<View>(null);

  useEffect(() => {
    const node = (ref.current as any);
    if (!node) return;

    // В RN Web ref.current — это DOM-элемент (div)
    const el: HTMLElement = node instanceof HTMLElement ? node : node._nativeTag;
    if (!el || !(el instanceof HTMLElement)) return;

    el.setAttribute('draggable', 'true');
    el.style.cursor = 'grab';

    const handleDragStart = (e: DragEvent) => {
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(index));
      }
      onDragStartIndex(index);
    };
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    };
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      onDragEnterIndex(index);
    };
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      onDropAtIndex(index);
    };
    const handleDragEnd = () => {
      onDragEnd();
    };

    el.addEventListener('dragstart', handleDragStart);
    el.addEventListener('dragover', handleDragOver);
    el.addEventListener('dragenter', handleDragEnter);
    el.addEventListener('drop', handleDrop);
    el.addEventListener('dragend', handleDragEnd);

    return () => {
      el.removeEventListener('dragstart', handleDragStart);
      el.removeEventListener('dragover', handleDragOver);
      el.removeEventListener('dragenter', handleDragEnter);
      el.removeEventListener('drop', handleDrop);
      el.removeEventListener('dragend', handleDragEnd);
    };
  }, [index, onDragStartIndex, onDragEnterIndex, onDropAtIndex, onDragEnd]);

  return (
    <View ref={ref} style={[style, { opacity: isDragged ? 0.5 : 1 }]}>
      {children}
    </View>
  );
};

const UserGroupsDesktopContent: React.FC = () => {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const contentWidth = windowWidth - SIDEBAR_WIDTH;
  const isNarrow = contentWidth < 600;
  const gridColumns = isNarrow ? 1 : 2;
  const cardMaxWidth = `${(100 / gridColumns).toFixed(3)}%` as `${number}%`;
  const { user } = useAuthStore();
  const { showError, showSuccess } = useNotification();
  const { showConfirm } = useActionModal();
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [showUserSelector, setShowUserSelector] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const menuButtonRef = useRef<any>(null);
  const [menuButtonPosition, setMenuButtonPosition] = useState<{ x: number; y: number; width: number; height: number } | undefined>();

  // HTML5 Drag and Drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Check if running in Electron
  const isElectron = Platform.OS === 'web' && typeof window !== 'undefined' && !!window.electron;

  const handleOpenActionMenu = useCallback(() => {
    if (menuButtonRef.current) {
      // @ts-ignore - Web-only method
      const rect = menuButtonRef.current.getBoundingClientRect?.();
      if (rect) {
        setMenuButtonPosition({ x: rect.left, y: rect.top, width: rect.width, height: rect.height });
        setShowActionMenu(true);
      } else {
        menuButtonRef.current.measure((_x: number, _y: number, width: number, height: number, pageX: number, pageY: number) => {
          setMenuButtonPosition({ x: pageX, y: pageY, width, height });
          setShowActionMenu(true);
        });
      }
    } else {
      setShowActionMenu(true);
    }
  }, []);

  // TitleBar center controls - search input (hidden in reorder mode)
  const titleBarCenterControls = useMemo(() => {
    if (!isElectron || isReorderMode) return null;
    return (
      <View style={titleBarStyles.searchContainer}>
        <Ionicons name="search" size={14} color={theme.textSecondary} />
        <TextInput
          style={[titleBarStyles.searchInput, { color: theme.text }]}
          placeholder="Поиск групп..."
          placeholderTextColor={theme.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={14} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    );
  }, [isElectron, isReorderMode, searchQuery, theme]);

  // TitleBar right controls - create button + menu
  const titleBarRightControls = useMemo(() => {
    if (!isElectron) return null;
    return (
      <View style={titleBarStyles.rightControlsRow}>
        <ExpandableCreateButton
          label="Создать"
          title="Создать группу"
          onPress={() => setShowCreateModal(true)}
        />
        <View
          ref={menuButtonRef}
          style={[titleBarStyles.menuButton, { backgroundColor: theme.backgroundTertiary }]}
          // @ts-ignore - Web-only
          onClick={handleOpenActionMenu}
          onMouseEnter={(e: any) => {
            if (e.currentTarget?.style) e.currentTarget.style.backgroundColor = theme.border;
          }}
          onMouseLeave={(e: any) => {
            if (e.currentTarget?.style) e.currentTarget.style.backgroundColor = theme.backgroundTertiary;
          }}
        >
          <Ionicons name="ellipsis-vertical" size={14} color={theme.text} />
        </View>
      </View>
    );
  }, [isElectron, theme, handleOpenActionMenu]);

  // Integrate with TitleBar
  useTitleBarControlsIntegration({
    pageTitle: 'Группы пользователей',
    centerControls: titleBarCenterControls,
    rightControls: titleBarRightControls,
    isPageLoading: isLoading,
    enabled: isElectron,
  });

  // Check access
  if (user?.role !== 'admin' && user?.role !== 'super_admin' && user?.role !== 'department_head') {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.noAccessContainer}>
          <Ionicons name="lock-closed" size={64} color="#EF4444" />
          <Text style={styles.noAccessTitle}>Нет доступа</Text>
          <Text style={styles.noAccessText}>
            Только руководители отделов и администраторы могут управлять группами
          </Text>
        </View>
      </View>
    );
  }

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setIsLoading(true);
      const data = await getUserGroups();
      setGroups(data as UserGroup[]);
    } catch (error: any) {
      console.error('Failed to load groups:', error);
      showError(`Не удалось загрузить список групп: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      showError('Введите название группы');
      return;
    }

    try {
      setIsCreating(true);
      const group = await createUserGroup({
        name: newGroupName.trim(),
        description: newGroupDescription.trim() || undefined,
        user_ids: selectedUserIds.length > 0 ? selectedUserIds : undefined,
      });

      // If user_ids not supported by backend on create, add members separately
      if (selectedUserIds.length > 0 && group?.id) {
        try {
          await updateUserGroupMembers(group.id, { user_ids: selectedUserIds });
        } catch {
          // Members will need to be added manually via edit screen
        }
      }

      setNewGroupName('');
      setNewGroupDescription('');
      setSelectedUserIds([]);
      setShowCreateModal(false);
      showSuccess('Группа создана');
      loadGroups();
    } catch (error: any) {
      console.error('Failed to create group:', error);
      showError('Не удалось создать группу');
    } finally {
      setIsCreating(false);
    }
  };

  const canManageGroup = (group: UserGroup) => {
    if (user?.role === 'admin' || user?.role === 'super_admin') return true;
    return group.creator_id === user?.id;
  };

  const handleDeleteGroup = async (group: UserGroup) => {
    if (!canManageGroup(group)) {
      showError('Вы можете удалять только свои группы');
      return;
    }

    const confirmed = await new Promise<boolean>((resolve) => {
      showConfirm(
        'Удаление группы',
        `Вы уверены, что хотите удалить группу "${group.name}"?`,
        () => resolve(true),
        () => resolve(false),
        { confirmText: 'Удалить', cancelText: 'Отмена', destructive: true }
      );
    });
    if (!confirmed) return;

    try {
      await deleteUserGroup(group.id);
      showSuccess('Группа удалена');
      loadGroups();
    } catch (error: any) {
      console.error('Failed to delete group:', error);
      showError('Не удалось удалить группу');
    }
  };

  const handleDrop = useCallback(async (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    const reordered = [...groups];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    setGroups(reordered);

    try {
      await reorderUserGroups({ group_ids: reordered.map((g) => g.id) });
    } catch (error: any) {
      console.error('Failed to reorder groups:', error);
      showError('Не удалось изменить порядок');
      loadGroups();
    }
  }, [groups]);

  const filteredGroups = groups.filter((group) =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (group.description && group.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    groupCard: {
      backgroundColor: theme.backgroundSecondary,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: theme.border,
      height: '100%',
    },
    groupCardReorder: {
      backgroundColor: theme.backgroundSecondary,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: theme.border,
      flexDirection: 'row',
      alignItems: 'center',
    },
    groupName: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 6,
      letterSpacing: -0.3,
    },
    groupDescription: {
      fontSize: 15,
      color: theme.textSecondary,
      marginBottom: 8,
      lineHeight: 22,
    },
    groupMembers: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    groupList: {
      flexDirection: isNarrow ? 'column' : 'row',
      flexWrap: isNarrow ? undefined : 'wrap',
      marginHorizontal: isNarrow ? 0 : -8,
    },
    groupCardWrapper: {
      width: '100%',
      maxWidth: isNarrow ? '100%' : cardMaxWidth,
      paddingHorizontal: isNarrow ? 0 : 8,
      marginBottom: 16,
    },
  });

  const handleDragStartIndex = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragEnterIndex = useCallback((index: number) => {
    setDragOverIndex(index);
  }, []);

  const handleDropAtIndex = useCallback((toIndex: number) => {
    setDraggedIndex((prev) => {
      if (prev !== null) {
        handleDrop(prev, toIndex);
      }
      return null;
    });
    setDragOverIndex(null);
  }, [handleDrop]);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  const renderReorderItem = (group: UserGroup, index: number) => (
    <DraggableRow
      key={group.id}
      index={index}
      isDragged={draggedIndex === index}

      onDragStartIndex={handleDragStartIndex}
      onDragEnterIndex={handleDragEnterIndex}
      onDropAtIndex={handleDropAtIndex}
      onDragEnd={handleDragEnd}
      style={[
        {
          marginBottom: 8,
          maxWidth: 700,
        },
        dragOverIndex === index && draggedIndex !== index && {
          borderRadius: 16,
          borderWidth: 2,
          borderColor: theme.primary,
          borderStyle: 'dashed' as any,
        },
      ]}
    >
      <View style={dynamicStyles.groupCardReorder}>
        <View style={styles.dragHandle}>
          <Ionicons name="reorder-three" size={24} color={theme.textSecondary} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Ionicons name="people-circle" size={20} color="#10B981" />
            <Text style={dynamicStyles.groupName}>{group.name}</Text>
          </View>
          {group.description ? (
            <Text style={dynamicStyles.groupDescription} numberOfLines={1}>
              {group.description}
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="people" size={16} color={theme.textSecondary} />
            <Text style={dynamicStyles.groupMembers}>
              {group.member_count || 0} участников
            </Text>
          </View>
        </View>
      </View>
    </DraggableRow>
  );

  return (
    <View style={dynamicStyles.container}>
      {/* Reorder mode banner */}
      {isReorderMode && (
        <View style={[styles.reorderBanner, { backgroundColor: theme.backgroundSecondary, borderBottomColor: theme.border }]}>
          <Ionicons name="swap-vertical" size={20} color={theme.primary} />
          <Text style={[styles.reorderBannerText, { color: theme.textSecondary }]}>
            Перетащите группы для изменения порядка
          </Text>
          <TouchableOpacity
            style={[styles.reorderDoneButton, { backgroundColor: theme.primary }]}
            onPress={() => setIsReorderMode(false)}
          >
            <Text style={styles.reorderDoneButtonText}>Готово</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modal, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Создать группу</Text>

            <TextInput
              style={[
                styles.input,
                {
                  color: theme.text,
                  borderColor: theme.border,
                  backgroundColor: theme.backgroundSecondary,
                },
              ]}
              placeholder="Название группы"
              placeholderTextColor={theme.textTertiary}
              value={newGroupName}
              onChangeText={setNewGroupName}
            />

            <TextInput
              style={[
                styles.textArea,
                {
                  color: theme.text,
                  borderColor: theme.border,
                  backgroundColor: theme.backgroundSecondary,
                },
              ]}
              placeholder="Описание (необязательно)"
              placeholderTextColor={theme.textTertiary}
              value={newGroupDescription}
              onChangeText={setNewGroupDescription}
              multiline
              numberOfLines={3}
            />

            {/* User Selector */}
            <TouchableOpacity
              style={[styles.userSelectorButton, { borderColor: theme.border, backgroundColor: theme.backgroundSecondary }]}
              onPress={() => setShowUserSelector(true)}
            >
              <Ionicons name="people" size={20} color={theme.primary} />
              <Text style={[styles.userSelectorButtonText, { color: selectedUserIds.length > 0 ? theme.text : theme.textTertiary }]}>
                {selectedUserIds.length > 0
                  ? `Выбрано участников: ${selectedUserIds.length}`
                  : 'Добавить участников'}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.backgroundSecondary }]}
                onPress={() => {
                  setShowCreateModal(false);
                  setNewGroupName('');
                  setNewGroupDescription('');
                  setSelectedUserIds([]);
                }}
              >
                <Text style={[styles.modalButtonText, { color: theme.text }]}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.primary }]}
                onPress={handleCreateGroup}
                disabled={isCreating}
              >
                {isCreating ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={[styles.modalButtonText, { color: '#FFF' }]}>Создать</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Content */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (isReorderMode ? groups : filteredGroups).length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="people-circle-outline" size={64} color={theme.textTertiary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            {searchQuery ? 'Группы не найдены' : 'Нет групп'}
          </Text>
        </View>
      ) : isReorderMode ? (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.contentInner, { maxWidth: 900 }]}>
            {groups.map((group, index) => renderReorderItem(group, index))}
          </View>
        </ScrollView>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.contentInner}>
            <View style={dynamicStyles.groupList}>
              {filteredGroups.map((group) => (
                <View key={group.id} style={dynamicStyles.groupCardWrapper}>
                  <TouchableOpacity
                    style={dynamicStyles.groupCard}
                    onPress={() => {
                      (navigation as any).navigate('EditUserGroup', { groupId: group.id });
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.groupContent}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <Ionicons name="people-circle" size={20} color="#10B981" />
                        <Text style={[dynamicStyles.groupName, { flex: 1 }]}>{group.name}</Text>
                      </View>
                      {group.description ? (
                        <Text style={dynamicStyles.groupDescription} numberOfLines={2}>
                          {group.description}
                        </Text>
                      ) : null}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                        <Ionicons name="people" size={16} color={theme.textSecondary} />
                        <Text style={dynamicStyles.groupMembers}>
                          {group.member_count || 0} участников
                        </Text>
                      </View>

                      {/* Action Buttons Row */}
                      {canManageGroup(group) && (
                        <View style={styles.actionButtons}>
                          <TouchableOpacity
                            style={[
                              styles.actionButton,
                              { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.12)' : 'rgba(59, 130, 246, 0.1)' },
                            ]}
                            onPress={(e) => {
                              e.stopPropagation();
                              (navigation as any).navigate('EditUserGroup', { groupId: group.id });
                            }}
                          >
                            <Ionicons name="create-outline" size={18} color={theme.primary} />
                            <Text style={[styles.actionButtonText, { color: theme.primary }]}>Редактировать</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.actionButton,
                              { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.1)' },
                            ]}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleDeleteGroup(group);
                            }}
                          >
                            <Ionicons name="trash-outline" size={18} color="#EF4444" />
                            <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Удалить</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      {/* User Selector Modal for create group */}
      <UserSelectorModal
        visible={showUserSelector}
        onClose={() => setShowUserSelector(false)}
        selectedUserIds={selectedUserIds}
        onSelectionChange={setSelectedUserIds}
        title="Добавить участников"
        multiSelect={true}
        includeCurrentUser={true}
      />

      <ActionMenu
        visible={showActionMenu}
        onClose={() => setShowActionMenu(false)}
        isDesktop={true}
        buttonPosition={menuButtonPosition}
        items={[
          {
            key: 'reorder',
            icon: isReorderMode ? 'checkmark-circle-outline' : 'swap-vertical-outline',
            label: isReorderMode ? 'Завершить сортировку' : 'Изменить сортировку',
            onPress: () => {
              const entering = !isReorderMode;
              setIsReorderMode(entering);
              if (entering) setSearchQuery('');
            },
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    maxWidth: 1400,
    width: '100%',
    alignSelf: 'center',
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
  groupContent: {
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    width: '90%',
    maxWidth: 500,
    borderRadius: 20,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 24,
    letterSpacing: -0.4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 24,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  noAccessContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  noAccessTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#EF4444',
    marginTop: 16,
  },
  noAccessText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
  },
  reorderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
  },
  reorderBannerText: {
    flex: 1,
    fontSize: 14,
  },
  reorderDoneButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  reorderDoneButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  dragHandle: {
    marginRight: 16,
    padding: 4,
  },
  userSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 10,
  },
  userSelectorButtonText: {
    flex: 1,
    fontSize: 16,
  },
});

const titleBarStyles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 6,
    paddingHorizontal: 8,
    height: 28,
    gap: 6,
    minWidth: 260,
    maxWidth: 420,
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.2)',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    height: 28,
    // @ts-ignore - Web-only
    outlineStyle: 'none',
  } as any,
  rightControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  } as any,
  menuButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  } as any,
});

export default UserGroupsDesktopContent;
