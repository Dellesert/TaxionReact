import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
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
} from '../types/schedule.types';

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

  // Подсчёт с учётом переопределений
  const { matchedCount, unmatchedCount } = React.useMemo(() => {
    let matched = 0;
    let unmatched = 0;
    preview.users.forEach((user) => {
      const status = getUserStatus(user);
      if (status.isMatched) {
        matched++;
      } else {
        unmatched++;
      }
    });
    return { matchedCount: matched, unmatchedCount: unmatched };
  }, [preview.users, getUserStatus]);

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

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Summary */}
      <View
        style={[
          styles.summaryCard,
          { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Результат анализа
        </Text>

        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: theme.primary }]}>
              {preview.entries_count}
            </Text>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>
              записей
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: theme.success }]}>
              {matchedCount}
            </Text>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>
              сотрудников найдено
            </Text>
          </View>
          {unmatchedCount > 0 && (
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: theme.warning }]}>
                {unmatchedCount}
              </Text>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>
                не найдено
              </Text>
            </View>
          )}
        </View>
      </View>

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

      {/* Edit hint */}
      {editable && (
        <View
          style={[
            styles.hintCard,
            { backgroundColor: theme.primary + '10', borderColor: theme.primary },
          ]}
        >
          <Ionicons name="information-circle" size={20} color={theme.primary} />
          <Text style={[styles.hintText, { color: theme.text }]}>
            Нажмите на сотрудника, чтобы изменить сопоставление
          </Text>
        </View>
      )}

      {/* Users */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Сотрудники ({preview.users.length})
        </Text>

        {preview.users.map((user, index) => {
          const status = getUserStatus(user);
          return (
            <UserRow
              key={index}
              user={user}
              theme={theme}
              matched={status.isMatched}
              override={status.override}
              editable={editable}
              onEdit={() => handleEditUser(user)}
              onClearOverride={() => handleClearMapping(user)}
            />
          );
        })}
      </View>

      {/* Preview Entries (first 5) */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Примеры записей
        </Text>
        {preview.entries.slice(0, 5).map((entry, index) => {
          // Находим оригинальное имя из документа для этой записи
          // Ищем в preview.users пользователя с таким же user_id
          const importedUser = preview.users.find(
            (u) => u.user_id === entry.user_id
          );
          const originalUserName = importedUser?.name || entry.user?.name;
          const override = originalUserName
            ? userMappingOverrides?.get(originalUserName)
            : null;
          // Для отображения используем полное ФИО из systemUsersMap (содержит отчество)
          // или fallback на данные из entry.user
          const fullUserName =
            (entry.user_id && systemUsersMap.get(entry.user_id)) ||
            formatFullName(entry.user) ||
            entry.user?.name;
          const displayUserName = override?.userName || fullUserName || originalUserName;
          const hasOverride = !!override;

          return (
            <View
              key={index}
              style={[
                styles.entryPreview,
                { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
                hasOverride && { borderColor: theme.primary, borderWidth: 2 },
              ]}
            >
              <View style={styles.entryHeader}>
                <Text style={[styles.entryDate, { color: theme.text }]}>
                  {formatScheduleDate(entry.date, 'dd.MM.yyyy')}
                </Text>
                <ShiftTypeBadge shiftType={entry.shift_type} size="small" />
              </View>
              {displayUserName && (
                <View style={styles.entryUserRow}>
                  {hasOverride && (
                    <>
                      <Text
                        style={[
                          styles.entryUserOriginal,
                          { color: theme.textTertiary, textDecorationLine: 'line-through' },
                        ]}
                      >
                        {originalUserName}
                      </Text>
                      <Ionicons name="arrow-forward" size={12} color={theme.primary} />
                    </>
                  )}
                  <Text
                    style={[
                      styles.entryUser,
                      { color: hasOverride ? theme.primary : theme.textSecondary },
                      hasOverride && { fontWeight: '500' },
                    ]}
                  >
                    {displayUserName}
                  </Text>
                </View>
              )}
            </View>
          );
        })}
        {preview.entries.length > 5 && (
          <Text style={[styles.moreText, { color: theme.textSecondary }]}>
            ... и ещё {preview.entries.length - 5} записей
          </Text>
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
  editable?: boolean;
  onEdit?: () => void;
  onClearOverride?: () => void;
}

const UserRow: React.FC<UserRowProps> = ({
  user,
  theme,
  matched,
  override,
  editable = false,
  onEdit,
  onClearOverride,
}) => {
  const hasOverride = !!override;

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
        {hasOverride && (
          <View style={styles.overrideInfo}>
            <Ionicons name="arrow-forward" size={14} color={theme.primary} />
            <Text style={[styles.overrideName, { color: theme.primary }]}>
              {override.userName || `ID: ${override.userId}`}
            </Text>
          </View>
        )}
        {!hasOverride && user.match_score !== undefined && user.match_score < 100 && (
          <Text style={[styles.matchScore, { color: theme.textSecondary }]}>
            Совпадение: {user.match_score}%
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
  summaryCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: 12,
    marginTop: 4,
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
  hintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 8,
  },
  hintText: {
    fontSize: 13,
    flex: 1,
  },
  section: {
    marginBottom: 16,
  },
  userGroup: {
    marginBottom: 12,
  },
  userGroupTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
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
  entryPreview: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryDate: {
    fontSize: 14,
    fontWeight: '500',
  },
  entryUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
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
