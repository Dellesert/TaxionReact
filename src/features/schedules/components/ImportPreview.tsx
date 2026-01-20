import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { ShiftTypeBadge } from './ShiftTypeBadge';
import { formatScheduleDate } from '../utils/scheduleHelpers';
import type { ImportPreviewResponse, ImportedUser } from '../types/schedule.types';

interface ImportPreviewProps {
  preview: ImportPreviewResponse;
}

export const ImportPreview: React.FC<ImportPreviewProps> = ({ preview }) => {
  const { theme } = useTheme();

  const matchedUsers = preview.users.filter((u) => !u.is_unmatched);
  const unmatchedUsers = preview.users.filter((u) => u.is_unmatched);

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
              {matchedUsers.length}
            </Text>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>
              сотрудников найдено
            </Text>
          </View>
          {unmatchedUsers.length > 0 && (
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: theme.warning }]}>
                {unmatchedUsers.length}
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

      {/* Users */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Сотрудники ({preview.users.length})
        </Text>

        {matchedUsers.length > 0 && (
          <View style={styles.userGroup}>
            <Text style={[styles.userGroupTitle, { color: theme.success }]}>
              Найдены в системе
            </Text>
            {matchedUsers.map((user, index) => (
              <UserRow key={index} user={user} theme={theme} matched />
            ))}
          </View>
        )}

        {unmatchedUsers.length > 0 && (
          <View style={styles.userGroup}>
            <Text style={[styles.userGroupTitle, { color: theme.warning }]}>
              Не найдены в системе
            </Text>
            {unmatchedUsers.map((user, index) => (
              <UserRow key={index} user={user} theme={theme} matched={false} />
            ))}
          </View>
        )}
      </View>

      {/* Preview Entries (first 5) */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Примеры записей
        </Text>
        {preview.entries.slice(0, 5).map((entry, index) => (
          <View
            key={index}
            style={[
              styles.entryPreview,
              { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
            ]}
          >
            <View style={styles.entryHeader}>
              <Text style={[styles.entryDate, { color: theme.text }]}>
                {formatScheduleDate(entry.date, 'dd.MM.yyyy')}
              </Text>
              <ShiftTypeBadge shiftType={entry.shift_type} size="small" />
            </View>
            {entry.user && (
              <Text style={[styles.entryUser, { color: theme.textSecondary }]}>
                {entry.user.name}
              </Text>
            )}
          </View>
        ))}
        {preview.entries.length > 5 && (
          <Text style={[styles.moreText, { color: theme.textSecondary }]}>
            ... и ещё {preview.entries.length - 5} записей
          </Text>
        )}
      </View>
    </ScrollView>
  );
};

interface UserRowProps {
  user: ImportedUser;
  theme: any;
  matched: boolean;
}

const UserRow: React.FC<UserRowProps> = ({ user, theme, matched }) => (
  <View
    style={[
      styles.userRow,
      { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
    ]}
  >
    <Ionicons
      name={matched ? 'checkmark-circle' : 'alert-circle'}
      size={20}
      color={matched ? theme.success : theme.warning}
    />
    <View style={styles.userInfo}>
      <Text style={[styles.userName, { color: theme.text }]}>{user.name}</Text>
      {user.match_score !== undefined && user.match_score < 100 && (
        <Text style={[styles.matchScore, { color: theme.textSecondary }]}>
          Совпадение: {user.match_score}%
        </Text>
      )}
    </View>
  </View>
);

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
  entryUser: {
    fontSize: 13,
    marginTop: 4,
  },
  moreText: {
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
});
