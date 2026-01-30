import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Avatar } from '@shared/components/common/Avatar';
import type { Substitution } from '../types/absence.types';

interface SubstitutionCardProps {
  substitution: Substitution;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const SubstitutionCard: React.FC<SubstitutionCardProps> = ({
  substitution,
  onEdit,
  onDelete,
}) => {
  const { theme } = useTheme();

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'dd MMM', { locale: ru });
    } catch {
      return dateString;
    }
  };

  const getSubstituteName = () => {
    if (substitution.substitute?.name) return substitution.substitute.name;
    if (substitution.substitute?.first_name && substitution.substitute?.last_name) {
      return `${substitution.substitute.last_name} ${substitution.substitute.first_name}`;
    }
    return `Сотрудник #${substitution.substitute_id}`;
  };

  const getAvatarUrl = () => {
    return substitution.substitute?.avatar || undefined;
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
        },
      ]}
    >
      {/* Left: Avatar */}
      <Avatar
        name={getSubstituteName()}
        imageUrl={getAvatarUrl()}
        size={40}
        userId={substitution.substitute_id}
      />

      {/* Middle: Info */}
      <View style={styles.content}>
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
          {getSubstituteName()}
        </Text>

        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={13} color={theme.textTertiary} />
          <Text style={[styles.dateText, { color: theme.textSecondary }]}>
            {formatDate(substitution.start_date)} — {formatDate(substitution.end_date)}
          </Text>
        </View>

        {substitution.note && (
          <Text
            style={[styles.note, { color: theme.textTertiary }]}
            numberOfLines={1}
          >
            {substitution.note}
          </Text>
        )}
      </View>

      {/* Right: Actions */}
      <View style={styles.actions}>
        {onEdit && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.background }]}
            onPress={onEdit}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="pencil" size={16} color={theme.primary} />
          </TouchableOpacity>
        )}
        {onDelete && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.background }]}
            onPress={onDelete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={16} color={theme.error} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: '500',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dateText: {
    fontSize: 13,
  },
  note: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
