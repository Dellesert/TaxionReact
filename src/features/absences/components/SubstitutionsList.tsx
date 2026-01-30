import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { SubstitutionCard } from './SubstitutionCard';
import type { Substitution } from '../types/absence.types';

interface SubstitutionsListProps {
  substitutions: Substitution[];
  isLoading?: boolean;
  onEdit?: (substitution: Substitution) => void;
  onDelete?: (substitution: Substitution) => void;
}

export const SubstitutionsList: React.FC<SubstitutionsListProps> = ({
  substitutions,
  isLoading = false,
  onEdit,
  onDelete,
}) => {
  const { theme } = useTheme();

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  }

  if (substitutions.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="people-outline" size={32} color={theme.textTertiary} />
        <Text style={[styles.emptyText, { color: theme.textTertiary }]}>
          Замещения не назначены
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {substitutions.map((substitution) => (
        <SubstitutionCard
          key={substitution.id}
          substitution={substitution}
          onEdit={onEdit ? () => onEdit(substitution) : undefined}
          onDelete={onDelete ? () => onDelete(substitution) : undefined}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 0,
  },
  centered: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
