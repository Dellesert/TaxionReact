import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { ShiftTypeBadge } from './ShiftTypeBadge';
import { formatScheduleDate } from '../utils/scheduleHelpers';
import UserSelectorModal from '@shared/components/common/UserSelectorModal';
import { getUsers } from '@api/user.api';
import { User } from '@/types/user.types';
import type {
  ImportPreviewResponse,
  ImportedUser,
  ScheduleUser,
  ScheduleEntry,
} from '../types/schedule.types';

// Включаем LayoutAnimation для Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Форматирует полное имя пользователя (ФИО)
const formatFullName = (user: ScheduleUser | undefined): string | undefined => {
  if (!user) return undefined;

  // Если есть отдельные поля, собираем ФИО
  if (user.last_name || user.first_name || user.middle_name) {
    return [user.last_name, user.first_name, user.middle_name]
      .filter(Boolean)
      .join(' ');
  }

  // Иначе возвращаем общее поле name
  return user.name;
};

// Группировка записей по дате
interface GroupedEntries {
  date: string;
  formattedDate: string;
  entries: ScheduleEntry[];
}

interface ImportPreviewProps {
  preview: ImportPreviewResponse;
  userMappingOverrides?: Map<string, { userId: number; userName: string }>;
  onUserMappingChange?: (
    originalName: string,
    userId: number | null,
    userName: string | null
  ) => void;
  editable?: boolean;
}

export const ImportPreview: React.FC<ImportPreviewProps> = ({
  preview,
  userMappingOverrides,
  onUserMappingChange,
  editable = false,
}) => {
  const { theme } = useTheme();
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<ImportedUser | null>(null);
  const [isUserSelectorVisible, setIsUserSelectorVisible] = useState(false);
  const [systemUsersMap, setSystemUsersMap] = useState<Map<number, string>>(new Map());
  const [isUsersExpanded, setIsUsersExpanded] = useState(true);
  const [isScheduleExpanded, setIsScheduleExpanded] = useState(true);

  // Загружаем пользователей системы один раз при включённом режиме редактирования
  useEffect(() => {
    if (editable) {
      loadSystemUsers();
    }
  }, [editable]);

  const loadSystemUsers = async () => {
    try {
      const response = await getUsers(
        { is_active: true },
        { limit: 200, offset: 0 }
      );
      let usersList: User[] = [];
      if (response && response.data && Array.isArray(response.data)) {
        usersList = response.data;
      } else if (response && Array.isArray(response)) {
        usersList = response;
      }
      const map = new Map<number, string>();
      usersList.forEach((user) => {
        // Формируем полное ФИО (с отчеством) или используем короткое имя
        const fullName =
          user.last_name || user.first_name || user.middle_name
            ? [user.last_name, user.first_name, user.middle_name].filter(Boolean).join(' ')
            : user.name;
        map.set(user.id, fullName);
      });
      setSystemUsersMap(map);
    } catch (error) {
      console.error('Failed to load system users:', error);
    }
  };

  // Получаем актуальный статус пользователя с учётом переопределений
  const getUserStatus = useCallback(
    (user: ImportedUser) => {
      if (userMappingOverrides?.has(user.name)) {
        return { isMatched: true, override: userMappingOverrides.get(user.name) };
      }
      return { isMatched: !user.is_unmatched, override: null };
    },
    [userMappingOverrides]
  );

  // Группируем записи по датам
  const groupedEntries = useMemo(() => {
    const groups = new Map<string, ScheduleEntry[]>();

    preview.entries.forEach((entry) => {
      const dateKey = entry.date;
      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(entry);
    });

    const result: GroupedEntries[] = [];
    groups.forEach((entries, date) => {
      result.push({
        date,
        formattedDate: formatScheduleDate(date, 'dd.MM.yyyy (EEEE)'),
        entries,
      });
    });

    // Сортируем по дате
    result.sort((a, b) => a.date.localeCompare(b.date));

    return result;
  }, [preview.entries]);

  const handleEditUser = useCallback((user: ImportedUser) => {
    setSelectedUserForEdit(user);
    setIsUserSelectorVisible(true);
  }, []);

  const handleUserSelectionDone = useCallback(() => {
    setIsUserSelectorVisible(false);
    setSelectedUserForEdit(null);
  }, []);

  // Отдельный обработчик для выбора пользователя (single select mode)
  const handleSingleUserSelect = useCallback(
    (userId: number) => {
      if (selectedUserForEdit && onUserMappingChange) {
        // Получаем имя из нашей карты пользователей
        const userName = systemUsersMap.get(userId) || `Пользователь #${userId}`;
        onUserMappingChange(selectedUserForEdit.name, userId, userName);
      }
      setIsUserSelectorVisible(false);
      setSelectedUserForEdit(null);
    },
    [selectedUserForEdit, onUserMappingChange, systemUsersMap]
  );

  const handleClearMapping = useCallback(
    (user: ImportedUser) => {
      if (onUserMappingChange) {
        onUserMappingChange(user.name, null, null);
      }
    },
    [onUserMappingChange]
  );

  const toggleUsersSection = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsUsersExpanded((prev) => !prev);
  }, []);

  const toggleScheduleSection = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsScheduleExpanded((prev) => !prev);
  }, []);

  // Получаем отображаемое имя для записи
  const getEntryDisplayName = useCallback(
    (entry: ScheduleEntry) => {
      const importedUser = preview.users.find((u) => u.user_id === entry.user_id);
      const originalUserName = importedUser?.name || entry.user?.name;
      const override = originalUserName
        ? userMappingOverrides?.get(originalUserName)
        : null;

      const fullUserName =
        (entry.user_id && systemUsersMap.get(entry.user_id)) ||
        formatFullName(entry.user) ||
        entry.user?.name;

      return {
        displayName: override?.userName || fullUserName || originalUserName,
        originalName: originalUserName,
        hasOverride: !!override,
      };
    },
    [preview.users, userMappingOverrides, systemUsersMap]
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Warnings */}
      {preview.warnings && preview.warnings.length > 0 && (
        <View
          style={[
            styles.warningsCard,
            { backgroundColor: theme.warning + '15', borderColor: theme.warning },
          ]}
        >
          <View style={styles.warningHeader}>
            <Ionicons name="warning" size={20} color={theme.warning} />
            <Text style={[styles.warningTitle, { color: theme.warning }]}>
              Предупреждения
            </Text>
          </View>
          {preview.warnings.map((warning, index) => (
            <Text
              key={index}
              style={[styles.warningText, { color: theme.text }]}
            >
              • {warning}
            </Text>
          ))}
        </View>
      )}

      {/* Users - Collapsible */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[
            styles.sectionHeader,
            { backgroundColor: theme.backgroundSecondary },
          ]}
          onPress={toggleUsersSection}
          activeOpacity={0.7}
        >
          <View style={styles.sectionHeaderLeft}>
            <Ionicons name="people" size={20} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Сопоставление сотрудников ({preview.users.length})
            </Text>
          </View>
          <Ionicons
            name={isUsersExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={theme.textSecondary}
          />
        </TouchableOpacity>

        {isUsersExpanded && (
          <View style={styles.sectionContent}>
            {preview.users.map((user, index) => {
              const status = getUserStatus(user);
              // Получаем ФИО сопоставленного пользователя из системы
              const matchedUserName = user.user_id
                ? systemUsersMap.get(user.user_id)
                : undefined;
              return (
                <UserRow
                  key={index}
                  user={user}
                  theme={theme}
                  matched={status.isMatched}
                  override={status.override}
                  matchedUserName={matchedUserName}
                  editable={editable}
                  onEdit={() => handleEditUser(user)}
                  onClearOverride={() => handleClearMapping(user)}
                />
              );
            })}
          </View>
        )}
      </View>

      {/* Schedule Preview - Collapsible */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[
            styles.sectionHeader,
            { backgroundColor: theme.backgroundSecondary },
          ]}
          onPress={toggleScheduleSection}
          activeOpacity={0.7}
        >
          <View style={styles.sectionHeaderLeft}>
            <Ionicons name="calendar" size={20} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Предпросмотр графика ({preview.entries_count})
            </Text>
          </View>
          <Ionicons
            name={isScheduleExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={theme.textSecondary}
          />
        </TouchableOpacity>

        {isScheduleExpanded && (
          <View style={styles.sectionContent}>
            {groupedEntries.map((group) => (
              <View key={group.date} style={styles.dateGroup}>
                <Text style={[styles.dateGroupTitle, { color: theme.text }]}>
                  {group.formattedDate}
                </Text>
                <View
                  style={[
                    styles.dateGroupContent,
                    { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
                  ]}
                >
                  {group.entries.map((entry, entryIndex) => {
                    const { displayName, originalName, hasOverride } = getEntryDisplayName(entry);
                    return (
                      <View
                        key={entryIndex}
                        style={[
                          styles.entryRow,
                          entryIndex < group.entries.length - 1 && {
                            borderBottomWidth: 1,
                            borderBottomColor: theme.border,
                          },
                        ]}
                      >
                        <View style={styles.entryInfo}>
                          {hasOverride ? (
                            <View style={styles.entryUserRow}>
                              <Text
                                style={[
                                  styles.entryUserOriginal,
                                  { color: theme.textTertiary, textDecorationLine: 'line-through' },
                                ]}
                              >
                                {originalName}
                              </Text>
                              <Ionicons name="arrow-forward" size={12} color={theme.primary} />
                              <Text style={[styles.entryUser, { color: theme.primary, fontWeight: '500' }]}>
                                {displayName}
                              </Text>
                            </View>
                          ) : (
                            <Text style={[styles.entryUser, { color: theme.text }]}>
                              {displayName}
                            </Text>
                          )}
                        </View>
                        <ShiftTypeBadge shiftType={entry.shift_type} size="small" />
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* User Selector Modal for editing */}
      <UserSelectorModalWrapper
        visible={isUserSelectorVisible}
        onClose={handleUserSelectionDone}
        selectedUser={selectedUserForEdit}
        onUserSelect={handleSingleUserSelect}
      />
    </ScrollView>
  );
};

// Обёртка для модалки выбора пользователя с single-select
interface UserSelectorModalWrapperProps {
  visible: boolean;
  onClose: () => void;
  selectedUser: ImportedUser | null;
  onUserSelect: (userId: number) => void;
}

const UserSelectorModalWrapper: React.FC<UserSelectorModalWrapperProps> = ({
  visible,
  onClose,
  selectedUser,
  onUserSelect,
}) => {
  const [tempSelectedIds, setTempSelectedIds] = useState<number[]>([]);

  // Reset selection when modal opens
  useEffect(() => {
    if (visible) {
      setTempSelectedIds(selectedUser?.user_id ? [selectedUser.user_id] : []);
    }
  }, [visible, selectedUser]);

  return (
    <UserSelectorModal
      visible={visible}
      onClose={onClose}
      selectedUserIds={tempSelectedIds}
      onSelectionChange={(ids) => {
        if (ids.length > 0) {
          onUserSelect(ids[0]);
        }
      }}
      multiSelect={false}
      mode="radio"
      title={`Выбрать сотрудника для "${selectedUser?.name || ''}"`}
    />
  );
};

interface UserRowProps {
  user: ImportedUser;
  theme: any;
  matched: boolean;
  override?: { userId: number; userName: string } | null;
  matchedUserName?: string;
  editable?: boolean;
  onEdit?: () => void;
  onClearOverride?: () => void;
}

const UserRow: React.FC<UserRowProps> = ({
  user,
  theme,
  matched,
  override,
  matchedUserName,
  editable = false,
  onEdit,
  onClearOverride,
}) => {
  const hasOverride = !!override;
  // Показываем сопоставление если есть override или автоматическое совпадение с user_id
  const showMatchedUser = hasOverride || (matched && matchedUserName);
  const displayMatchedName = hasOverride
    ? (override.userName || `ID: ${override.userId}`)
    : matchedUserName;

  const content = (
    <View
      style={[
        styles.userRow,
        { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
        hasOverride && { borderColor: theme.primary, borderWidth: 2 },
      ]}
    >
      <Ionicons
        name={matched ? 'checkmark-circle' : 'alert-circle'}
        size={20}
        color={matched ? theme.success : theme.warning}
      />
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: theme.text }]}>
          {user.name}
        </Text>
        {showMatchedUser && displayMatchedName && (
          <View style={styles.overrideInfo}>
            <Ionicons name="arrow-forward" size={14} color={hasOverride ? theme.primary : theme.success} />
            <Text style={[styles.overrideName, { color: hasOverride ? theme.primary : theme.success }]}>
              {displayMatchedName}
            </Text>
          </View>
        )}
        {!hasOverride && user.match_score !== undefined && (
          <Text style={[styles.matchScore, { color: theme.textSecondary }]}>
            Совпадение: {Math.round(user.match_score * 100)}%
          </Text>
        )}
      </View>
      {editable && (
        <View style={styles.editActions}>
          {hasOverride && onClearOverride && (
            <TouchableOpacity
              onPress={onClearOverride}
              style={[styles.clearButton, { backgroundColor: theme.error + '20' }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={16} color={theme.error} />
            </TouchableOpacity>
          )}
          <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
        </View>
      )}
    </View>
  );

  if (editable && onEdit) {
    return (
      <TouchableOpacity onPress={onEdit} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  warningsCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  warningText: {
    fontSize: 13,
    lineHeight: 20,
    marginLeft: 4,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionContent: {
    marginTop: 8,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
    gap: 10,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '500',
  },
  matchScore: {
    fontSize: 12,
    marginTop: 2,
  },
  overrideInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  overrideName: {
    fontSize: 12,
    fontWeight: '500',
  },
  editActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clearButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateGroup: {
    marginBottom: 12,
  },
  dateGroupTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  dateGroupContent: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
  },
  entryInfo: {
    flex: 1,
    marginRight: 8,
  },
  entryUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  entryUserOriginal: {
    fontSize: 13,
  },
  entryUser: {
    fontSize: 13,
  },
  moreText: {
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
});
