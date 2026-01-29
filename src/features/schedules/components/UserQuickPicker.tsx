/**
 * UserQuickPicker
 * Compact popup for quickly selecting a user in Shifts View
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
  Animated,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { Avatar } from '@shared/components/common/Avatar';
import { getUsers } from '@api/user.api';
import type { User } from '@/types/user.types';
import type { ScheduleEntry } from '../types/schedule.types';

interface UserQuickPickerProps {
  visible: boolean;
  entry: ScheduleEntry | null; // null if adding new entry
  position: { x: number; y: number };
  dateKey: string; // YYYY-MM-DD
  shiftType: 'morning' | 'evening';
  onSelectUser: (userId: number, userName: string, userAvatar?: string) => void;
  onDelete: () => void;
  onClose: () => void;
  isLoading?: boolean;
  existingUserIds?: number[]; // Users already assigned to this cell
}

export const UserQuickPicker: React.FC<UserQuickPickerProps> = ({
  visible,
  entry,
  position,
  dateKey,
  shiftType,
  onSelectUser,
  onDelete,
  onClose,
  isLoading = false,
  existingUserIds = [],
}) => {
  const { theme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Load users when picker opens
  useEffect(() => {
    if (visible) {
      loadUsers();
      setSearchQuery('');
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
    }
  }, [visible, fadeAnim, scaleAnim]);

  const loadUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const response = await getUsers(
        {
          is_active: true,
          exclude_me: false, // Include current user
          sort_by: 'name',
          sort_order: 'asc',
          prioritize_my_dept: true,
        },
        { limit: 100, offset: 0 }
      );

      let usersList: User[] = [];
      if (response && response.data && Array.isArray(response.data)) {
        usersList = response.data;
      } else if (response && Array.isArray(response)) {
        usersList = response;
      }

      setUsers(usersList);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Filter users based on search and exclude already assigned
  const filteredUsers = useMemo(() => {
    let result = users;

    // Exclude users already assigned to this cell
    if (existingUserIds.length > 0) {
      result = result.filter((user) => !existingUserIds.includes(user.id));
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((user) =>
        user.name?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [users, existingUserIds, searchQuery]);

  const hasEntry = !!entry;
  const shiftLabel = shiftType === 'morning' ? 'Утренняя смена' : 'Вечерняя смена';

  // Calculate popup position to stay within screen bounds
  const POPUP_WIDTH = 280;
  const POPUP_HEIGHT = hasEntry ? 340 : 300;
  const MIN_TOP = 60; // Minimum distance from top (for title bar)
  const MARGIN = 8;

  const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 600;
  const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 800;

  // Horizontal positioning - center on click, but keep within bounds
  const adjustedX = Math.max(MARGIN, Math.min(position.x - POPUP_WIDTH / 2, windowWidth - POPUP_WIDTH - MARGIN));

  // Vertical positioning - prefer above click point, but show below if not enough space
  const spaceAbove = position.y - MIN_TOP;
  const spaceBelow = windowHeight - position.y - MARGIN;

  let adjustedY: number;
  if (spaceAbove >= POPUP_HEIGHT) {
    // Enough space above - show above click point
    adjustedY = position.y - POPUP_HEIGHT - MARGIN;
  } else if (spaceBelow >= POPUP_HEIGHT) {
    // Show below click point
    adjustedY = position.y + MARGIN;
  } else {
    // Not enough space either way - position at minimum top
    adjustedY = MIN_TOP;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <Animated.View
            style={[
              styles.popup,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                left: adjustedX,
                top: adjustedY,
                width: POPUP_WIDTH,
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
              Platform.select({
                web: {
                  boxShadow: '0 4px 24px rgba(0, 0, 0, 0.18)',
                },
                default: {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.18,
                  shadowRadius: 24,
                  elevation: 12,
                },
              }),
            ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              {hasEntry ? 'Запись в графике' : shiftLabel}
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
              {dateKey}
            </Text>
          </View>

          {hasEntry ? (
            // Show current entry with replace and delete options
            <View style={styles.entryContent}>
              {/* Current User */}
              <View style={[styles.currentUserSection, { borderBottomColor: theme.border }]}>
                <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Текущий сотрудник</Text>
                <View style={styles.currentUser}>
                  <Avatar
                    name={entry.user?.name || `#${entry.user_id}`}
                    imageUrl={entry.user?.avatar}
                    size={28}
                  />
                  <Text style={[styles.currentUserName, { color: theme.text }]} numberOfLines={1}>
                    {entry.user?.name || `Пользователь #${entry.user_id}`}
                  </Text>
                </View>
              </View>

              {/* Replace with another user */}
              <View style={styles.replaceSection}>
                <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Заменить на</Text>
                <View style={[styles.searchContainer, { backgroundColor: theme.backgroundSecondary }]}>
                  <Ionicons name="search" size={16} color={theme.textSecondary} />
                  <TextInput
                    style={[styles.searchInput, { color: theme.text }]}
                    placeholder="Поиск..."
                    placeholderTextColor={theme.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoFocus={false}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Ionicons name="close-circle" size={16} color={theme.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>
                <ScrollView
                  style={styles.userListCompact}
                  showsVerticalScrollIndicator={true}
                  keyboardShouldPersistTaps="handled"
                >
                  {isLoadingUsers ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color={theme.primary} />
                    </View>
                  ) : filteredUsers.length === 0 ? (
                    <View style={styles.emptyContainerCompact}>
                      <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                        {searchQuery ? 'Не найдено' : 'Нет сотрудников'}
                      </Text>
                    </View>
                  ) : (
                    filteredUsers.slice(0, 5).map((user) => (
                      <TouchableOpacity
                        key={user.id}
                        style={[styles.userItemCompact, { borderBottomColor: theme.border }]}
                        onPress={() => onSelectUser(user.id, user.name || '', user.avatar)}
                        disabled={isLoading}
                        activeOpacity={0.7}
                      >
                        <Avatar
                          name={user.name || `#${user.id}`}
                          imageUrl={user.avatar}
                          size={24}
                        />
                        <Text style={[styles.userNameCompact, { color: theme.text }]} numberOfLines={1}>
                          {user.name || `#${user.id}`}
                        </Text>
                        <Ionicons name="swap-horizontal" size={14} color={theme.primary} />
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
              </View>

              {/* Delete Button */}
              <TouchableOpacity
                style={[styles.deleteButton, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}
                onPress={onDelete}
                disabled={isLoading}
                activeOpacity={0.7}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#EF4444" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    <Text style={styles.deleteButtonText}>Удалить</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            // Show user selection
            <View style={styles.selectionContent}>
              {/* Search Input */}
              <View style={[styles.searchContainer, { backgroundColor: theme.backgroundSecondary, margin: 12 }]}>
                <Ionicons name="search" size={18} color={theme.textSecondary} />
                <TextInput
                  style={[styles.searchInput, { color: theme.text }]}
                  placeholder="Поиск сотрудника..."
                  placeholderTextColor={theme.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus={false}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>

              {/* User List */}
              <ScrollView
                style={styles.userList}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
              >
                {isLoadingUsers ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={theme.primary} />
                  </View>
                ) : filteredUsers.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                      {searchQuery ? 'Сотрудники не найдены' : 'Нет доступных сотрудников'}
                    </Text>
                  </View>
                ) : (
                  filteredUsers.map((user) => (
                    <TouchableOpacity
                      key={user.id}
                      style={[
                        styles.userItem,
                        { borderBottomColor: theme.border },
                      ]}
                      onPress={() => onSelectUser(user.id, user.name || '', user.avatar)}
                      disabled={isLoading}
                      activeOpacity={0.7}
                    >
                      <Avatar
                        name={user.name || `#${user.id}`}
                        imageUrl={user.avatar}
                        size={32}
                      />
                      <Text style={[styles.userName, { color: theme.text }]} numberOfLines={1}>
                        {user.name || `Пользователь #${user.id}`}
                      </Text>
                      <Ionicons name="add-circle-outline" size={20} color={theme.primary} />
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          )}
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  popup: {
    position: 'absolute',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    maxHeight: 360,
  },
  header: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  entryContent: {
    padding: 10,
    gap: 10,
  },
  currentUserSection: {
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  currentUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currentUserName: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  replaceSection: {
    gap: 6,
  },
  userListCompact: {
    maxHeight: 120,
  },
  emptyContainerCompact: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  userItemCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 2,
    borderBottomWidth: 1,
    gap: 6,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  userNameCompact: {
    flex: 1,
    fontSize: 12,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  deleteButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },
  selectionContent: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      } as any,
    }),
  },
  userList: {
    maxHeight: 220,
  },
  loadingContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  userName: {
    flex: 1,
    fontSize: 14,
  },
});

export default UserQuickPicker;
