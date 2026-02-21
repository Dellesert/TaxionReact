/**
 * usePendingChanges
 * Hook for managing buffered/pending changes in schedule grid view.
 * Changes are accumulated locally and only saved to API when user clicks "Save".
 */

import { useState, useCallback, useMemo } from 'react';
import type { ShiftType, ScheduleEntry, CreateScheduleEntryRequest, UpdateScheduleEntryRequest } from '../types/schedule.types';

export type PendingChangeType = 'create' | 'update' | 'delete';

export interface PendingChange {
  /** Unique key: "userId-dateKey" */
  cellKey: string;
  type: PendingChangeType;
  userId: number;
  dateKey: string; // YYYY-MM-DD
  /** New shift type (for create/update) */
  shiftType?: ShiftType;
  /** Existing entry ID (for update/delete) */
  existingEntryId?: number;
  /** Original entry before change (for revert) */
  originalEntry?: ScheduleEntry | null;
}

interface BatchSaveResult {
  succeeded: string[];
  failed: Array<{ cellKey: string; error: string }>;
}

interface StoreActions {
  createEntry: (scheduleId: number, data: CreateScheduleEntryRequest) => Promise<ScheduleEntry>;
  updateEntry: (scheduleId: number, entryId: number, data: UpdateScheduleEntryRequest) => Promise<void>;
  deleteEntry: (scheduleId: number, entryId: number) => Promise<void>;
}

/**
 * Execute all pending changes sequentially.
 * Order: deletes first, then updates, then creates (avoids duplicate conflicts).
 */
export const executeBatchSave = async (
  scheduleId: number,
  changes: Map<string, PendingChange>,
  store: StoreActions,
): Promise<BatchSaveResult> => {
  const succeeded: string[] = [];
  const failed: Array<{ cellKey: string; error: string }> = [];

  const sorted = Array.from(changes.values()).sort((a, b) => {
    const order: Record<PendingChangeType, number> = { delete: 0, update: 1, create: 2 };
    return order[a.type] - order[b.type];
  });

  for (const change of sorted) {
    try {
      switch (change.type) {
        case 'create':
          await store.createEntry(scheduleId, {
            user_id: change.userId,
            date: `${change.dateKey}T00:00:00Z`,
            shift_type: change.shiftType!,
          });
          break;
        case 'update':
          await store.updateEntry(scheduleId, change.existingEntryId!, {
            shift_type: change.shiftType!,
          });
          break;
        case 'delete':
          await store.deleteEntry(scheduleId, change.existingEntryId!);
          break;
      }
      succeeded.push(change.cellKey);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка сохранения';
      failed.push({ cellKey: change.cellKey, error: message });
    }
  }

  return { succeeded, failed };
};

export const usePendingChanges = () => {
  const [changes, setChanges] = useState<Map<string, PendingChange>>(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const [saveErrors, setSaveErrors] = useState<Array<{ cellKey: string; error: string }>>([]);

  const pendingCount = useMemo(() => changes.size, [changes]);
  const hasPendingChanges = pendingCount > 0;

  /** Add or update a pending shift change (create or update) */
  const addChange = useCallback((
    userId: number,
    dateKey: string,
    shiftType: ShiftType,
    existingEntry: ScheduleEntry | null,
  ) => {
    const cellKey = `${userId}-${dateKey}`;
    setChanges(prev => {
      const next = new Map(prev);
      const existing = next.get(cellKey);

      if (existing?.type === 'create') {
        // Re-editing a pending create — keep it as create with updated shift type
        next.set(cellKey, { ...existing, shiftType });
      } else if (existing?.type === 'delete' && existing.originalEntry) {
        // Was marked for delete, now re-assigning — treat as update of original entry
        next.set(cellKey, {
          cellKey,
          type: 'update',
          userId,
          dateKey,
          shiftType,
          existingEntryId: existing.originalEntry.id,
          originalEntry: existing.originalEntry,
        });
      } else {
        next.set(cellKey, {
          cellKey,
          type: existingEntry ? 'update' : 'create',
          userId,
          dateKey,
          shiftType,
          existingEntryId: existingEntry?.id,
          originalEntry: existingEntry,
        });
      }
      return next;
    });
  }, []);

  /** Add a pending delete */
  const addDelete = useCallback((
    userId: number,
    dateKey: string,
    entry: ScheduleEntry,
  ) => {
    const cellKey = `${userId}-${dateKey}`;
    setChanges(prev => {
      const next = new Map(prev);
      const existing = next.get(cellKey);

      if (existing?.type === 'create') {
        // Deleting a pending create — just remove the pending change entirely
        next.delete(cellKey);
      } else {
        next.set(cellKey, {
          cellKey,
          type: 'delete',
          userId,
          dateKey,
          existingEntryId: entry.id,
          originalEntry: entry,
        });
      }
      return next;
    });
  }, []);

  /** Remove a single pending change */
  const removeChange = useCallback((cellKey: string) => {
    setChanges(prev => {
      const next = new Map(prev);
      next.delete(cellKey);
      return next;
    });
  }, []);

  /** Remove succeeded changes after partial batch save */
  const removeSucceeded = useCallback((keys: string[]) => {
    setChanges(prev => {
      const next = new Map(prev);
      for (const key of keys) {
        next.delete(key);
      }
      return next;
    });
  }, []);

  /** Discard all pending changes */
  const discardAll = useCallback(() => {
    setChanges(new Map());
    setSaveErrors([]);
  }, []);

  return {
    changes,
    pendingCount,
    hasPendingChanges,
    isSaving,
    setIsSaving,
    saveErrors,
    setSaveErrors,
    addChange,
    addDelete,
    removeChange,
    removeSucceeded,
    discardAll,
  };
};
