import React, { useState, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { ActionModal } from '@shared/components/common/ActionModal';
import { useAbsenceStore } from '../store/absenceStore';
import { SubstitutionsList } from './SubstitutionsList';
import { AddSubstitutionModal } from './AddSubstitutionModal';
import type { Substitution, CreateSubstitutionRequest } from '../types/absence.types';

interface PendingSubstitution {
  tempId: number;
  data: CreateSubstitutionRequest;
  displayName: string;
}

export interface SubstitutionsSectionRef {
  savePendingSubstitutions: () => Promise<void>;
  hasPendingChanges: () => boolean;
}

interface SubstitutionsSectionProps {
  absenceId: number;
  absenceUserId: number;
  absenceStartDate: string;
  absenceEndDate: string;
  readOnly?: boolean;
}

let nextTempId = -1;

export const SubstitutionsSection = forwardRef<SubstitutionsSectionRef, SubstitutionsSectionProps>(({
  absenceId,
  absenceUserId,
  absenceStartDate,
  absenceEndDate,
  readOnly = false,
}, ref) => {
  const { theme } = useTheme();

  const {
    substitutions,
    isLoadingSubstitutions,
    loadSubstitutions,
    createSubstitution,
    deleteSubstitution,
    clearSubstitutions,
  } = useAbsenceStore();

  const [isExpanded, setIsExpanded] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSubstitution, setEditingSubstitution] = useState<Substitution | null>(null);
  const [deletingSubstitution, setDeletingSubstitution] = useState<Substitution | null>(null);

  // Pending substitutions (not yet saved to backend)
  const [pendingSubstitutions, setPendingSubstitutions] = useState<PendingSubstitution[]>([]);
  // IDs of existing substitutions marked for deletion (deferred until save)
  const [pendingDeleteIds, setPendingDeleteIds] = useState<number[]>([]);

  // Load substitutions when section mounts
  useEffect(() => {
    loadSubstitutions(absenceId);
    return () => {
      clearSubstitutions();
    };
  }, [absenceId]);

  // Convert pending substitutions to Substitution objects for display
  const pendingAsSubstitutions: Substitution[] = pendingSubstitutions.map(p => ({
    id: p.tempId,
    absence_id: absenceId,
    substitute_id: p.data.substitute_id,
    substitute: { name: p.displayName } as Substitution['substitute'],
    start_date: p.data.start_date,
    end_date: p.data.end_date,
    note: p.data.note,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  // Filter out substitutions marked for deletion, then add pending ones
  const visibleSaved = substitutions.filter(s => !pendingDeleteIds.includes(s.id));
  const allSubstitutions = [...visibleSaved, ...pendingAsSubstitutions];

  // Expose save method to parent via ref
  useImperativeHandle(ref, () => ({
    savePendingSubstitutions: async () => {
      // Delete substitutions marked for removal
      for (const id of pendingDeleteIds) {
        await deleteSubstitution(absenceId, id);
      }
      setPendingDeleteIds([]);
      // Create new substitutions
      for (const pending of pendingSubstitutions) {
        await createSubstitution(absenceId, pending.data);
      }
      setPendingSubstitutions([]);
    },
    hasPendingChanges: () => pendingSubstitutions.length > 0 || pendingDeleteIds.length > 0,
  }), [pendingSubstitutions, pendingDeleteIds, absenceId, createSubstitution, deleteSubstitution]);

  const handleAddLocally = useCallback((data: CreateSubstitutionRequest, displayName: string) => {
    setPendingSubstitutions(prev => [
      ...prev,
      { tempId: nextTempId--, data, displayName },
    ]);
  }, []);

  const handleEdit = (substitution: Substitution) => {
    // Only allow editing saved substitutions (positive IDs)
    if (substitution.id < 0) return;
    setEditingSubstitution(substitution);
    setShowAddModal(true);
  };

  const handleDelete = (substitution: Substitution) => {
    // If it's a pending substitution, remove locally immediately
    if (substitution.id < 0) {
      setPendingSubstitutions(prev => prev.filter(p => p.tempId !== substitution.id));
      return;
    }
    // For saved substitutions, show confirmation then defer actual deletion
    setDeletingSubstitution(substitution);
  };

  const confirmDelete = () => {
    if (!deletingSubstitution) return;
    // Mark for deletion (deferred until parent saves)
    setPendingDeleteIds(prev => [...prev, deletingSubstitution.id]);
    setDeletingSubstitution(null);
  };

  const handleAddClose = () => {
    setShowAddModal(false);
    setEditingSubstitution(null);
  };

  const handleAddSuccess = () => {
    // Refresh is handled by store for edits, pending list for adds
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
          {allSubstitutions.length > 0 && (
            <View style={[styles.badge, { backgroundColor: theme.primary }]}>
              <Text style={styles.badgeText}>{allSubstitutions.length}</Text>
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
            substitutions={allSubstitutions}
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
        onAddLocally={handleAddLocally}
      />

      {/* Delete Confirmation */}
      <ActionModal
        visible={!!deletingSubstitution}
        title="Удаление замещения"
        message={`Удалить замещение${deletingSubstitution?.substitute?.name ? ` (${deletingSubstitution.substitute.name})` : ''}?`}
        onDismiss={() => setDeletingSubstitution(null)}
        dismissable
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
});

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
