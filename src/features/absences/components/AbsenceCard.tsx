import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
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
  type Substitution,
} from '../types/absence.types';

interface AbsenceCardProps {
  absence: Absence;
  onPress?: () => void;
  style?: ViewStyle;
}

export const AbsenceCard: React.FC<AbsenceCardProps> = ({
  absence,
  onPress,
  style,
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

  const getSubstituteName = (sub: Substitution) => {
    if (sub.substitute?.name) return sub.substitute.name;
    if (sub.substitute?.first_name && sub.substitute?.last_name) {
      return `${sub.substitute.last_name} ${sub.substitute.first_name}`;
    }
    return `#${sub.substitute_id}`;
  };

  const hasSubstitutions = absence.substitutions && absence.substitutions.length > 0;
  const substitutionCount = absence.substitution_count ?? absence.substitutions?.length ?? 0;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: theme.card,
        },
        style,
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

        {/* Substitutions row */}
        {(hasSubstitutions || substitutionCount > 0) && (
          <View style={[styles.substitutionsRow, { backgroundColor: theme.background }]}>
            <View style={[styles.substitutionIcon, { backgroundColor: `${theme.primary}15` }]}>
              <Ionicons name="people" size={12} color={theme.primary} />
            </View>
            {hasSubstitutions ? (
              absence.substitutions!.length === 1 ? (
                <Text style={[styles.substitutesText, { color: theme.textSecondary }]} numberOfLines={1}>
                  Замещает: <Text style={{ color: theme.text, fontWeight: '500' }}>{getSubstituteName(absence.substitutions![0])}</Text>
                </Text>
              ) : (
                <View style={styles.multipleSubstitutes}>
                  {absence.substitutions!.slice(0, 2).map((sub, index) => (
                    <Text key={sub.id} style={[styles.substituteWithDate, { color: theme.textSecondary }]} numberOfLines={1}>
                      <Text style={{ color: theme.text, fontWeight: '500' }}>{getSubstituteName(sub)}</Text>
                      {' '}
                      <Text style={{ fontSize: 11 }}>({formatDate(sub.start_date)}–{formatDate(sub.end_date)})</Text>
                      {index < Math.min(absence.substitutions!.length, 2) - 1 && ', '}
                    </Text>
                  ))}
                  {absence.substitutions!.length > 2 && (
                    <Text style={[styles.moreCount, { color: theme.textTertiary }]}>
                      {' '}+{absence.substitutions!.length - 2}
                    </Text>
                  )}
                </View>
              )
            ) : (
              <Text style={[styles.substitutesText, { color: theme.textSecondary }]}>
                {substitutionCount} замещени{substitutionCount === 1 ? 'е' : substitutionCount >= 2 && substitutionCount <= 4 ? 'я' : 'й'}
              </Text>
            )}
          </View>
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
  substitutionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  substitutionIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  substitutesText: {
    fontSize: 12,
    flex: 1,
  },
  multipleSubstitutes: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  substituteWithDate: {
    fontSize: 12,
  },
  moreCount: {
    fontSize: 11,
  },
});
