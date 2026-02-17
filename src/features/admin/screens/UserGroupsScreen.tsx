import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { setStatusBarStyle } from 'expo-status-bar';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { useTheme } from '@shared/hooks/useTheme';
import { useAuthStore } from '@shared/store/authStore';
import { useNotification } from '@shared/contexts/NotificationContext';
import { ActionMenu } from '@shared/components/common/ActionMenu';
import { useTitleBarControlsIntegration } from '@shared/hooks/useTitleBarControlsIntegration';
import { getUserGroups, createUserGroup, reorderUserGroups } from '@api/user-group.api';
import { UserGroup } from '@/types/user.types';

const UserGroupsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const { user } = useAuthStore();

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'ios') {
        setStatusBarStyle(isDark ? 'light' : 'dark');
      }
    }, [isDark])
  );
  const { showError, showSuccess } = useNotification();
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const menuButtonRef = useRef<any>(null);
  const [menuButtonPosition, setMenuButtonPosition] = useState<{ x: number; y: number; width: number; height: number } | undefined>();

  const isDesktop = Platform.OS === 'web';

  // Check if running in Electron
  const isElectron = Platform.OS === 'web' && typeof window !== 'undefined' && !!window.electron;

  // Clear TitleBar controls when entering user groups screen
  useTitleBarControlsIntegration({
    pageTitle: 'Группы пользователей',
    leftControls: null,
    rightControls: null,
    enabled: isElectron,
  });

  // Check access: department_head, admin, super_admin
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
      await createUserGroup({
        name: newGroupName.trim(),
        description: newGroupDescription.trim() || undefined,
      });

      setNewGroupName('');
      setNewGroupDescription('');
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

  const handleDragEnd = async ({ data }: { data: UserGroup[] }) => {
    setGroups(data);
    try {
      await reorderUserGroups({ group_ids: data.map((g) => g.id) });
    } catch (error: any) {
      console.error('Failed to reorder groups:', error);
      showError('Не удалось изменить порядок');
      loadGroups();
    }
  };

  const filteredGroups = groups.filter((group) =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (group.description && group.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? theme.background : '#F3F4F6',
    },
    header: {
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'ios' ? 0 : 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: theme.backgroundSecondary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backButton: {
      padding: 8,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      flex: 1,
      textAlign: 'center',
    },
    groupCard: {
      backgroundColor: theme.backgroundSecondary,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.2 : 0.08,
      shadowRadius: 6,
      elevation: 2,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
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
  });

  const renderDraggableItem = useCallback(({ item, drag, isActive }: RenderItemParams<UserGroup>) => {
    return (
      <ScaleDecorator>
        <TouchableOpacity
          onLongPress={drag}
          disabled={isActive}
          activeOpacity={0.7}
          style={[
            dynamicStyles.groupCard,
            {
              flexDirection: 'row',
              alignItems: 'center',
              opacity: isActive ? 0.85 : 1,
            },
          ]}
        >
          <View style={styles.dragHandle}>
            <Ionicons name="reorder-three" size={24} color={theme.textSecondary} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Ionicons name="people-circle" size={20} color="#10B981" />
              <Text style={dynamicStyles.groupName}>{item.name}</Text>
            </View>
            {item.description ? (
              <Text style={dynamicStyles.groupDescription} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="people" size={16} color={theme.textSecondary} />
              <Text style={dynamicStyles.groupMembers}>
                {item.member_count || 0} участников
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </ScaleDecorator>
    );
  }, [theme, isDark]);

  const renderGroupCard = (group: UserGroup) => (
    <TouchableOpacity
      key={group.id}
      style={dynamicStyles.groupCard}
      onPress={() => {
        (navigation as any).navigate('EditUserGroup', { groupId: group.id });
      }}
      activeOpacity={0.7}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Ionicons name="people-circle" size={20} color="#10B981" />
        <Text style={dynamicStyles.groupName}>{group.name}</Text>
      </View>
      {group.description ? (
        <Text style={dynamicStyles.groupDescription} numberOfLines={2}>
          {group.description}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ionicons name="people" size={16} color={theme.textSecondary} />
        <Text style={dynamicStyles.groupMembers}>
          {group.member_count || 0} участников
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.safeArea, { backgroundColor: theme.card }]}>
      <SafeAreaView style={{ backgroundColor: theme.backgroundSecondary }} edges={['top']}>
        <View style={dynamicStyles.header}>
          <TouchableOpacity style={dynamicStyles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.primary} />
          </TouchableOpacity>
          <Text style={dynamicStyles.headerTitle}>Управление группами</Text>
          <TouchableOpacity
            ref={menuButtonRef}
            style={{ padding: 8 }}
            onPress={() => {
              if (isDesktop && menuButtonRef.current) {
                menuButtonRef.current.measure((_x: number, _y: number, width: number, height: number, pageX: number, pageY: number) => {
                  setMenuButtonPosition({ x: pageX, y: pageY, width, height });
                  setShowActionMenu(true);
                });
              } else {
                setShowActionMenu(true);
              }
            }}
          >
            <Ionicons name="ellipsis-vertical" size={24} color={theme.primary} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <View style={[dynamicStyles.container]}>
        {/* Search Bar - hidden in reorder mode */}
        {!isReorderMode && (
          <View style={[styles.searchContainer, { backgroundColor: theme.backgroundSecondary, borderBottomColor: theme.border }]}>
            <Ionicons name="search" size={20} color={theme.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Поиск групп..."
              placeholderTextColor={theme.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Reorder mode banner */}
        {isReorderMode && (
          <View style={[styles.reorderBanner, { backgroundColor: theme.backgroundSecondary, borderBottomColor: theme.border }]}>
            <Ionicons name="swap-vertical" size={20} color={theme.primary} />
            <Text style={[styles.reorderBannerText, { color: theme.textSecondary }]}>
              Удерживайте и перетащите для сортировки
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
                style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSecondary }]}
                placeholder="Название группы"
                placeholderTextColor={theme.textTertiary}
                value={newGroupName}
                onChangeText={setNewGroupName}
              />

              <TextInput
                style={[styles.textArea, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSecondary }]}
                placeholder="Описание (необязательно)"
                placeholderTextColor={theme.textTertiary}
                value={newGroupDescription}
                onChangeText={setNewGroupDescription}
                multiline
                numberOfLines={3}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: theme.backgroundSecondary }]}
                  onPress={() => {
                    setShowCreateModal(false);
                    setNewGroupName('');
                    setNewGroupDescription('');
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
          <DraggableFlatList
            data={groups}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderDraggableItem}
            onDragEnd={handleDragEnd}
            contentContainerStyle={styles.contentInner}
          />
        ) : (
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.contentInner}>
              {filteredGroups.map((group) => renderGroupCard(group))}
            </View>
          </ScrollView>
        )}
      </View>

      <ActionMenu
        visible={showActionMenu}
        onClose={() => setShowActionMenu(false)}
        isDesktop={isDesktop}
        buttonPosition={menuButtonPosition}
        items={[
          {
            key: 'create',
            icon: 'add-circle-outline',
            label: 'Создать группу',
            onPress: () => setShowCreateModal(true),
          },
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
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderBottomWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    maxWidth: 900,
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
    paddingHorizontal: 20,
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
    marginRight: 12,
    padding: 4,
  },
});

export default UserGroupsScreen;
