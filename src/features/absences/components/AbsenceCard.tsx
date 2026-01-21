import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { AbsenceTypeIcon } from './AbsenceTypeIcon';
import {
  ABSENCE_TYPE_LABELS,
  ABSENCE_TYPE_COLORS,
  type Absence,
} from '../types/absence.types';

interface AbsenceCardProps {
  absence: Absence;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
}

export const AbsenceCard: React.FC<AbsenceCardProps> = ({
  absence,
  onPress,
  onEdit,
  onDelete,
  showActions = true,
}) => {
  const { theme } = useTheme();
  const typeColor = ABSENCE_TYPE_COLORS[absence.type];

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'dd MMM yyyy', { locale: ru });
    } catch {
      return dateString;
    }
  };

  const getUserName = () => {
    if (absence.user?.name) return absence.user.name;
    if (absence.user?.first_name && absence.user?.last_name) {
      return `${absence.user.last_name} ${absence.user.first_name}`;
    }
    return `Пользователь #${absence.user_id}`;
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundSecondary,
          borderColor: theme.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={[styles.colorIndicator, { backgroundColor: typeColor }]} />

      <View style={styles.content}>
        <View style={styles.header}>
          <AbsenceTypeIcon type={absence.type} size="medium" />
          <View style={styles.headerText}>
            <Text style={[styles.typeName, { color: theme.text }]}>
              {ABSENCE_TYPE_LABELS[absence.type]}
            </Text>
            <Text style={[styles.userName, { color: theme.textSecondary }]} numberOfLines={1}>
              {getUserName()}
            </Text>
          </View>
        </View>

        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={14} color={theme.textSecondary} />
          <Text style={[styles.dateText, { color: theme.textSecondary }]}>
            {formatDate(absence.start_date)} — {formatDate(absence.end_date)}
          </Text>
        </View>

        {absence.reason && (
          <Text
            style={[styles.reason, { color: theme.textTertiary }]}
            numberOfLines={2}
          >
            {absence.reason}
          </Text>
        )}
      </View>

      {showActions && (onEdit || onDelete) && (
        <View style={styles.actions}>
          {onEdit && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.background }]}
              onPress={onEdit}
            >
              <Ionicons name="pencil-outline" size={16} color={theme.primary} />
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.background }]}
              onPress={onDelete}
            >
              <Ionicons name="trash-outline" size={16} color={theme.error} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  colorIndicator: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    marginRight: 12,
    minHeight: 70,
  },
  content: {
    flex: 1,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerText: {
    flex: 1,
  },
  typeName: {
    fontSize: 15,
    fontWeight: '600',
  },
  userName: {
    fontSize: 13,
    marginTop: 2,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 12,
  },
  reason: {
    fontSize: 12,
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'column',
    gap: 4,
    marginLeft: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
