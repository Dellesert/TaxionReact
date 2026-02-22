import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import UserSelectorModal from '@shared/components/common/UserSelectorModal';
import { getUsers } from '@api/user.api';
import { User } from '@/types/user.types';
import type {
  ImportPreviewResponse,
  ImportedUser,
} from '../types/schedule.types';


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

  // Порог уверенного совпадения (100%)
  const MATCH_THRESHOLD = 1.0;

  // Считаем статистику совпадений
  const matchStats = useMemo(() => {
    const total = preview.users.length;
    let matched = 0;
    let uncertain = 0;
    let unmatched = 0;
    const problemUsers: ImportedUser[] = [];

    preview.users.forEach((user) => {
      if (userMappingOverrides?.has(user.name)) {
        matched++;
      } else if (user.is_unmatched || !user.user_id) {
        unmatched++;
        problemUsers.push(user);
      } else if (user.match_score !== undefined && user.match_score < MATCH_THRESHOLD) {
        uncertain++;
        problemUsers.push(user);
      } else {
        matched++;
      }
    });

    return {
      total,
      matched,
      uncertain,
      unmatched,
      problemUsers,
      allPerfect: uncertain === 0 && unmatched === 0,
    };
  }, [preview.users, userMappingOverrides]);

  const hasWarnings = preview.warnings && preview.warnings.length > 0;
  const hasIssues = !matchStats.allPerfect || hasWarnings;

  // Загружаем пользователей системы при включённом режиме редактирования
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

  const handleEditUser = useCallback((user: ImportedUser) => {
    setSelectedUserForEdit(user);
    setIsUserSelectorVisible(true);
  }, []);

  const handleUserSelectionDone = useCallback(() => {
    setIsUserSelectorVisible(false);
    setSelectedUserForEdit(null);
  }, []);

  const handleSingleUserSelect = useCallback(
    (userId: number) => {
      if (selectedUserForEdit && onUserMappingChange) {
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
      {/* Основная информация */}
      {!hasIssues ? (
        /* Все совпадения найдены */
        <View style={[styles.successCard, { backgroundColor: theme.success + '15', borderColor: theme.success }]}>
          <Ionicons name="checkmark-circle" size={48} color={theme.success} />
          <Text style={[styles.successTitle, { color: theme.success }]}>
            Все совпадения найдены
          </Text>
          <Text style={[styles.successSubtitle, { color: theme.textSecondary }]}>
            Все {matchStats.total} сотрудников успешно сопоставлены
          </Text>
        </View>
      ) : (
        /* Есть несоответствия */
        <>
          {/* Warnings */}
          {hasWarnings && (
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
              {preview.warnings!.map((warning, index) => (
                <Text
                  key={index}
                  style={[styles.warningText, { color: theme.text }]}
                >
                  {warning}
                </Text>
              ))}
            </View>
          )}

          {/* Проблемные сотрудники */}
          {matchStats.problemUsers.length > 0 && (
            <View
              style={[
                styles.unmatchedCard,
                { backgroundColor: theme.warning + '10', borderColor: theme.warning },
              ]}
            >
              <View style={styles.unmatchedHeader}>
                <Ionicons name="people" size={20} color={theme.warning} />
                <Text style={[styles.unmatchedTitle, { color: theme.text }]}>
                  {matchStats.unmatched > 0 && matchStats.uncertain > 0
                    ? `Не найдено: ${matchStats.unmatched}, неточное совпадение: ${matchStats.uncertain}`
                    : matchStats.unmatched > 0
                      ? `Не удалось сопоставить (${matchStats.unmatched} из ${matchStats.total})`
                      : `Неточное совпадение (${matchStats.uncertain} из ${matchStats.total})`}
                </Text>
              </View>
              <Text style={[styles.unmatchedHint, { color: theme.textSecondary }]}>
                Выберите сотрудников вручную или исправьте в черновике после импорта
              </Text>
              <View style={styles.unmatchedList}>
                {matchStats.problemUsers.map((user, index) => {
                  const override = userMappingOverrides?.get(user.name);
                  const hasOverride = !!override;

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.unmatchedRow,
                        {
                          backgroundColor: theme.backgroundSecondary,
                          borderColor: hasOverride ? theme.success : theme.border,
                          borderWidth: hasOverride ? 2 : 1,
                        },
                      ]}
                      onPress={() => editable && handleEditUser(user)}
                      activeOpacity={editable ? 0.7 : 1}
                      disabled={!editable}
                    >
                      <Ionicons
                        name={hasOverride ? 'checkmark-circle' : 'alert-circle'}
                        size={20}
                        color={hasOverride ? theme.success : theme.warning}
                      />
                      <View style={styles.unmatchedUserInfo}>
                        <Text style={[styles.unmatchedUserName, { color: theme.text }]}>
                          {user.name}
                        </Text>
                        {hasOverride ? (
                          <View style={styles.overrideInfo}>
                            <Ionicons name="arrow-forward" size={14} color={theme.success} />
                            <Text style={[styles.overrideName, { color: theme.success }]}>
                              {override.userName}
                            </Text>
                          </View>
                        ) : user.match_score !== undefined && user.match_score > 0 ? (
                          <Text style={[styles.matchScoreText, { color: theme.warning }]}>
                            Совпадение: {Math.round(user.match_score * 100)}%
                          </Text>
                        ) : null}
                      </View>
                      {editable && (
                        <View style={styles.editActions}>
                          {hasOverride && (
                            <TouchableOpacity
                              onPress={() => handleClearMapping(user)}
                              style={[styles.clearButton, { backgroundColor: theme.error + '20' }]}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Ionicons name="close" size={16} color={theme.error} />
                            </TouchableOpacity>
                          )}
                          <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Сопоставленные - краткая сводка */}
          {matchStats.matched > 0 && (
            <View style={[styles.infoRow, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
              <Ionicons name="checkmark-circle" size={20} color={theme.success} />
              <Text style={[styles.infoText, { color: theme.text }]}>
                Сопоставлено сотрудников: {matchStats.matched} из {matchStats.total}
              </Text>
            </View>
          )}
        </>
      )}

      {/* Количество импортируемых записей */}
      <View style={[styles.infoRow, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
        <Ionicons name="calendar" size={20} color={theme.primary} />
        <Text style={[styles.infoText, { color: theme.text }]}>
          Импортируемых записей: {preview.entries_count}
        </Text>
      </View>

      {/* Подсказка про черновик */}
      <View style={styles.draftHint}>
        <Ionicons name="information-circle-outline" size={18} color={theme.textSecondary} />
        <Text style={[styles.draftHintText, { color: theme.textSecondary }]}>
          После импорта будет создан черновик. Вы сможете просмотреть и отредактировать график перед публикацией.
        </Text>
      </View>

      {/* User Selector Modal */}
      <UserSelectorModalWrapper
        visible={isUserSelectorVisible}
        onClose={handleUserSelectionDone}
        selectedUser={selectedUserForEdit}
        onUserSelect={handleSingleUserSelect}
      />
    </ScrollView>
  );
};

// Обёртка для модалки выбора пользователя
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  successCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 8,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  successSubtitle: {
    fontSize: 14,
  },
  warningsCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
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
  unmatchedCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  unmatchedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  unmatchedTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  unmatchedHint: {
    fontSize: 12,
    marginBottom: 10,
    marginLeft: 28,
  },
  unmatchedList: {
    gap: 6,
  },
  unmatchedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    gap: 10,
  },
  unmatchedUserInfo: {
    flex: 1,
  },
  unmatchedUserName: {
    fontSize: 14,
    fontWeight: '500',
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    gap: 10,
  },
  infoText: {
    fontSize: 15,
    fontWeight: '500',
  },
  draftHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  draftHintText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  matchScoreText: {
    fontSize: 12,
    marginTop: 2,
  },
});
