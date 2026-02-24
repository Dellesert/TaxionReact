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
        {/* Header: Avatar + Name (left) — Date (right) */}
        <View style={styles.headerRow}>
          <View style={styles.userInfo}>
            <Avatar
              name={getUserName()}
              imageUrl={getAvatarUrl()}
              size={36}
              userId={absence.user_id}
            />
            <View style={styles.nameBlock}>
              <Text style={[styles.userName, { color: theme.text }]} numberOfLines={1}>
                {getUserName()}
              </Text>
              {/* Type badge inline under name */}
              <View style={styles.typeInfo}>
                <AbsenceTypeIcon type={absence.type} size="small" />
                <Text style={[styles.typeName, { color: typeColor }]}>
                  {ABSENCE_TYPE_LABELS[absence.type]}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.dateBlock}>
            <Text style={[styles.dateText, { color: theme.textSecondary }]}>
              {formatDate(absence.start_date)}
            </Text>
            <Text style={[styles.dateSeparator, { color: theme.textTertiary }]}>—</Text>
            <Text style={[styles.dateText, { color: theme.textSecondary }]}>
              {formatDate(absence.end_date)}
            </Text>
          </View>
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

        {/* Substitutions */}
        {(hasSubstitutions || substitutionCount > 0) && (
          <View style={[styles.substitutionSection, { borderTopColor: `${theme.textTertiary}20` }]}>
            <View style={styles.substitutionHeader}>
              <Ionicons name="swap-horizontal" size={13} color={theme.textTertiary} />
              <Text style={[styles.substitutionLabel, { color: theme.textTertiary }]}>
                Замещение
              </Text>
            </View>

            {hasSubstitutions ? (
              <View style={styles.substituteChips}>
                {absence.substitutions!.slice(0, 3).map((sub) => (
                  <View
                    key={sub.id}
                    style={[styles.substituteChip, { backgroundColor: `${theme.primary}10` }]}
                  >
                    <Avatar
                      name={getSubstituteName(sub)}
                      imageUrl={sub.substitute?.avatar || undefined}
                      size={20}
                      userId={sub.substitute_id}
                    />
                    <Text
                      style={[styles.substituteChipName, { color: theme.text }]}
                      numberOfLines={1}
                    >
                      {getSubstituteName(sub)}
                    </Text>
                    <Text style={[styles.substituteChipDate, { color: theme.textTertiary }]}>
                      {formatDate(sub.start_date)}–{formatDate(sub.end_date)}
                    </Text>
                  </View>
                ))}
                {absence.substitutions!.length > 3 && (
                  <View style={[styles.moreChip, { backgroundColor: `${theme.textTertiary}15` }]}>
                    <Text style={[styles.moreChipText, { color: theme.textSecondary }]}>
                      +{absence.substitutions!.length - 3}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.substituteChips}>
                <View style={[styles.substituteChip, { backgroundColor: `${theme.primary}10` }]}>
                  <Ionicons name="people-outline" size={14} color={theme.primary} />
                  <Text style={[styles.substituteChipName, { color: theme.textSecondary }]}>
                    {substitutionCount} замещени{substitutionCount === 1 ? 'е' : substitutionCount >= 2 && substitutionCount <= 4 ? 'я' : 'й'}
                  </Text>
                </View>
              </View>
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
    borderRadius: 12,
    marginBottom: 8,
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
    padding: 12,
    gap: 8,
  },

  // Header row
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  nameBlock: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
  },
  typeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typeName: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // Date block
  dateBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '500',
  },
  dateSeparator: {
    fontSize: 12,
  },

  // Reason
  reason: {
    fontSize: 12,
    lineHeight: 16,
    fontStyle: 'italic',
    paddingLeft: 46,
  },

  // Substitution section
  substitutionSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    gap: 6,
  },
  substitutionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  substitutionLabel: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // Substitute chips
  substituteChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  substituteChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    paddingLeft: 4,
    borderRadius: 16,
  },
  substituteChipName: {
    fontSize: 12,
    fontWeight: '500',
    maxWidth: 120,
  },
  substituteChipDate: {
    fontSize: 10,
  },
  moreChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 16,
    justifyContent: 'center',
  },
  moreChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
