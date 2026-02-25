import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { useNotification } from '@shared/contexts/NotificationContext';
import { ActionModal } from '@shared/components/common/ActionModal';
import { useAbsenceStore } from '../store/absenceStore';
import { SubstitutionsList } from './SubstitutionsList';
import { AddSubstitutionModal } from './AddSubstitutionModal';
import type { Substitution } from '../types/absence.types';

interface SubstitutionsSectionProps {
  absenceId: number;
  absenceUserId: number;
  absenceStartDate: string;
  absenceEndDate: string;
  readOnly?: boolean;
}

export const SubstitutionsSection: React.FC<SubstitutionsSectionProps> = ({
  absenceId,
  absenceUserId,
  absenceStartDate,
  absenceEndDate,
  readOnly = false,
}) => {
  const { theme } = useTheme();
  const { showSuccess, showError } = useNotification();

  const {
    substitutions,
    isLoadingSubstitutions,
    loadSubstitutions,
    deleteSubstitution,
    clearSubstitutions,
  } = useAbsenceStore();

  const [isExpanded, setIsExpanded] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSubstitution, setEditingSubstitution] = useState<Substitution | null>(null);
  const [deletingSubstitution, setDeletingSubstitution] = useState<Substitution | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load substitutions when section mounts
  useEffect(() => {
    loadSubstitutions(absenceId);
    return () => {
      clearSubstitutions();
    };
  }, [absenceId]);

  const handleEdit = (substitution: Substitution) => {
    setEditingSubstitution(substitution);
    setShowAddModal(true);
  };

  const handleDelete = (substitution: Substitution) => {
    setDeletingSubstitution(substitution);
  };

  const confirmDelete = async () => {
    if (!deletingSubstitution) return;

    setIsDeleting(true);
    try {
      await deleteSubstitution(absenceId, deletingSubstitution.id);
      showSuccess('Замещение удалено');
      setDeletingSubstitution(null);
    } catch (error: any) {
      showError(error.message || 'Не удалось удалить замещение');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddClose = () => {
    setShowAddModal(false);
    setEditingSubstitution(null);
  };

  const handleAddSuccess = () => {
    // Refresh is handled by store
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity
        style={[styles.header, { borderBottomColor: theme.border }]}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Ionicons
            name="people-outline"
            size={18}
            color={theme.primary}
          />
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Замещения
          </Text>
          {substitutions.length > 0 && (
            <View style={[styles.badge, { backgroundColor: theme.primary }]}>
              <Text style={styles.badgeText}>{substitutions.length}</Text>
            </View>
          )}
        </View>

        <View style={styles.headerRight}>
          {!readOnly && (
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: theme.primary }]}
              onPress={(e) => {
                e.stopPropagation();
                setShowAddModal(true);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={theme.textSecondary}
          />
        </View>
      </TouchableOpacity>

      {/* Content */}
      {isExpanded && (
        <View style={styles.content}>
          <SubstitutionsList
            substitutions={substitutions}
            isLoading={isLoadingSubstitutions}
            onEdit={readOnly ? undefined : handleEdit}
            onDelete={readOnly ? undefined : handleDelete}
          />
        </View>
      )}

      {/* Add/Edit Modal */}
      <AddSubstitutionModal
        visible={showAddModal}
        onClose={handleAddClose}
        absenceId={absenceId}
        absenceUserId={absenceUserId}
        absenceStartDate={absenceStartDate}
        absenceEndDate={absenceEndDate}
        editingSubstitution={editingSubstitution}
        onSuccess={handleAddSuccess}
      />

      {/* Delete Confirmation */}
      <ActionModal
        visible={!!deletingSubstitution}
        title="Удаление замещения"
        message={`Удалить замещение${deletingSubstitution?.substitute?.name ? ` (${deletingSubstitution.substitute.name})` : ''}?`}
        onDismiss={() => setDeletingSubstitution(null)}
        dismissable={!isDeleting}
        actions={[
          {
            text: 'Отмена',
            onPress: () => setDeletingSubstitution(null),
            style: 'cancel',
          },
          {
            text: 'Удалить',
            onPress: confirmDelete,
            style: 'destructive',
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingTop: 12,
  },
});
