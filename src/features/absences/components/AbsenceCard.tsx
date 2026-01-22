import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { AbsenceTypeIcon } from './AbsenceTypeIcon';
import { Avatar } from '@shared/components/common/Avatar';
import {
  ABSENCE_TYPE_LABELS,
  ABSENCE_TYPE_COLORS,
  type Absence,
} from '../types/absence.types';

interface AbsenceCardProps {
  absence: Absence;
  onPress?: () => void;
}

export const AbsenceCard: React.FC<AbsenceCardProps> = ({
  absence,
  onPress,
}) => {
  const { theme } = useTheme();
  const typeColor = ABSENCE_TYPE_COLORS[absence.type];

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'dd MMM', { locale: ru });
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

  const getAvatarUrl = () => {
    return absence.user?.avatar || undefined;
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: theme.card,
        },
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      {/* Left color accent */}
      <View style={[styles.colorAccent, { backgroundColor: typeColor }]} />

      {/* Main content */}
      <View style={styles.content}>
        {/* Type badge */}
        <View style={styles.typeInfo}>
          <AbsenceTypeIcon type={absence.type} size="small" />
          <Text style={[styles.typeName, { color: typeColor }]}>
            {ABSENCE_TYPE_LABELS[absence.type]}
          </Text>
        </View>

        {/* User name */}
        <Text style={[styles.userName, { color: theme.text }]} numberOfLines={1}>
          {getUserName()}
        </Text>

        {/* Bottom row: Dates ... Avatar */}
        <View style={styles.bottomRow}>
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={13} color={theme.textTertiary} />
            <Text style={[styles.dateText, { color: theme.textSecondary }]}>
              {formatDate(absence.start_date)} — {formatDate(absence.end_date)}
            </Text>
          </View>
          <Avatar
            name={getUserName()}
            imageUrl={getAvatarUrl()}
            size={32}
            userId={absence.user_id}
          />
        </View>

        {/* Reason (if exists) */}
        {absence.reason && (
          <Text
            style={[styles.reason, { color: theme.textTertiary }]}
            numberOfLines={1}
          >
            {absence.reason}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  colorAccent: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: 14,
    gap: 6,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  typeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeName: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  userName: {
    fontSize: 15,
    fontWeight: '500',
    marginTop: 2,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  dateText: {
    fontSize: 13,
  },
  reason: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
    fontStyle: 'italic',
  },
});
