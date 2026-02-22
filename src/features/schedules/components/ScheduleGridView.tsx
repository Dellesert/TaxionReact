import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Pressable, GestureResponderEvent } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';
import { Avatar } from '@shared/components/common/Avatar';
import type { Schedule, ScheduleEntry, ScheduleUser, ShiftType, ScheduleEntryWarning } from '../types/schedule.types';
import { SHIFT_TYPE_LABELS } from '../types/schedule.types';
import { ShiftQuickPicker } from './ShiftQuickPicker';
import { getHoliday } from '@features/absences/constants/russianHolidays.constants';
import type { PendingChange } from '../hooks/usePendingChanges';
import type { AbsenceLookupEntry } from '../hooks/useScheduleAbsences';
import type { AbsenceType } from '@features/absences/types/absence.types';
import { ABSENCE_TYPE_COLORS, ABSENCE_TYPE_LABELS } from '@features/absences/types/absence.types';

interface CellInfo {
  userId: number;
  userName: string;
  date: Date;
  dateKey: string;
  entry: ScheduleEntry | null;
}

interface ScheduleGridViewProps {
  schedule: Schedule;
  entries: ScheduleEntry[];
  canEdit?: boolean;
  groupMembers?: ScheduleUser[];
  // Immediate mode (legacy) - saves to API on each action
  onShiftSelect?: (userId: number, date: string, shiftType: ShiftType, existingEntry: ScheduleEntry | null) => Promise<void>;
  onEntryDelete?: (entryId: number) => Promise<void>;
  // Batch mode - buffers changes locally
  pendingChanges?: Map<string, PendingChange>;
  onPendingShiftSelect?: (userId: number, dateKey: string, shiftType: ShiftType, existingEntry: ScheduleEntry | null) => void;
  onPendingEntryDelete?: (userId: number, dateKey: string, entry: ScheduleEntry) => void;
  // Absence indicators
  absenceMap?: Map<string, AbsenceLookupEntry>;
  onAbsenceShiftConfirm?: (
    userId: number,
    dateKey: string,
    absenceType: AbsenceType,
    absenceLabel: string,
    userName: string,
  ) => Promise<boolean>;
  // Warning indicators for cells with validation warnings (absence/conflict override)
  warningMap?: Map<string, ScheduleEntryWarning[]>;
}

interface UserRow {
  userId: number;
  userName: string;
  userAvatar?: string;
  entriesByDate: Map<string, ScheduleEntry>;
}

// Get short shift label for cell display
const getShiftShortLabel = (shiftType: ShiftType): string => {
  switch (shiftType) {
    case 'morning':
      return 'У'; // Утро
    case 'evening':
      return 'В'; // Вечер
    case 'full_day':
      return 'Д'; // День (полный)
    case 'custom':
      return 'О'; // Особый
    default:
      return '';
  }
};

// Get short absence label for cell display
const getAbsenceShortLabel = (type: AbsenceType): string => {
  switch (type) {
    case 'vacation':
      return 'ОТ'; // Отпуск
    case 'sick_leave':
      return 'Б'; // Больничный
    case 'day_off':
      return 'ОГ'; // Отгул
    case 'business_trip':
      return 'К'; // Командировка
    case 'study_leave':
      return 'УО'; // Учебный отпуск
    default:
      return '';
  }
};

// Get shift color
const getShiftColor = (shiftType: ShiftType): string => {
  switch (shiftType) {
    case 'morning':
      return '#F59E0B'; // Yellow/orange for morning
    case 'evening':
      return '#8B5CF6'; // Purple for evening
    case 'full_day':
      return '#10B981'; // Green for full day
    case 'custom':
      return '#3B82F6'; // Blue for custom
    default:
      return '#6B7280';
  }
};

// Generate dates array for the schedule period
const generateDates = (startDate: string, endDate: string): Date[] => {
  const dates: Date[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  const current = new Date(start);
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
};

// Format date for display in header (day number)
const formatDayNumber = (date: Date): string => {
  return date.getDate().toString();
};

// Format date for display (weekday short)
const formatWeekday = (date: Date): string => {
  const weekdays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  return weekdays[date.getDay()];
};

// Format date as key (YYYY-MM-DD)
const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Check if date is weekend
const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

// Check if date is today
const isToday = (date: Date): boolean => {
  const today = new Date();
  return date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();
};

export const ScheduleGridView: React.FC<ScheduleGridViewProps> = ({
  schedule,
  entries,
  canEdit = false,
  groupMembers,
  onShiftSelect,
  onEntryDelete,
  pendingChanges,
  onPendingShiftSelect,
  onPendingEntryDelete,
  absenceMap,
  onAbsenceShiftConfirm,
  warningMap,
}) => {
  const { theme } = useTheme();

  // Batch mode: when pendingChanges map is provided
  const isBatchMode = !!pendingChanges;

  // Quick picker state
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerPosition, setPickerPosition] = useState({ x: 0, y: 0 });
  const [selectedCell, setSelectedCell] = useState<CellInfo | null>(null);
  const [isLoading] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null); // "userId-dateKey"

  // Optimistic updates - only used in immediate mode (not batch mode)
  const [optimisticUpdates, setOptimisticUpdates] = useState<Map<string, ShiftType | 'deleted'>>(new Map());

  // Generate dates for the schedule period
  const dates = useMemo(() => {
    return generateDates(schedule.start_date, schedule.end_date);
  }, [schedule.start_date, schedule.end_date]);

  // Group entries by user, include group members even without entries
  const userRows = useMemo((): UserRow[] => {
    const usersMap = new Map<number, UserRow>();

    // First, add all group members as rows (even if they have no entries)
    if (groupMembers && groupMembers.length > 0) {
      for (const member of groupMembers) {
        usersMap.set(member.id, {
          userId: member.id,
          userName: member.name || `Пользователь #${member.id}`,
          userAvatar: member.avatar,
          entriesByDate: new Map(),
        });
      }
    }

    // Then, process entries and merge with existing rows
    for (const entry of entries) {
      if (!entry.user) continue;

      let userRow = usersMap.get(entry.user_id);
      if (!userRow) {
        userRow = {
          userId: entry.user_id,
          userName: entry.user.name || `Пользователь #${entry.user_id}`,
          userAvatar: entry.user.avatar,
          entriesByDate: new Map(),
        };
        usersMap.set(entry.user_id, userRow);
      }

      // Use entry date as key
      const dateKey = entry.date.split('T')[0]; // Get YYYY-MM-DD part
      userRow.entriesByDate.set(dateKey, entry);
    }

    // Sort by user name
    return Array.from(usersMap.values()).sort((a, b) =>
      a.userName.localeCompare(b.userName, 'ru')
    );
  }, [entries, groupMembers]);

  const CELL_WIDTH = 36;
  const NAME_COLUMN_WIDTH = 180;

  // Pre-compute absence span info for continuous colored band display
  const absenceSpanMap = useMemo(() => {
    if (!absenceMap || absenceMap.size === 0) return null;

    const spanMap = new Map<string, { position: 'single' | 'start' | 'middle' | 'end'; spanLength: number; indexInSpan: number }>();

    for (const userRow of userRows) {
      let currentAbsenceId: number | null = null;
      let spanCells: string[] = [];

      const finalizeSpan = () => {
        if (spanCells.length === 0) return;
        const len = spanCells.length;
        spanCells.forEach((key, idx) => {
          let position: 'single' | 'start' | 'middle' | 'end';
          if (len === 1) position = 'single';
          else if (idx === 0) position = 'start';
          else if (idx === len - 1) position = 'end';
          else position = 'middle';
          spanMap.set(key, { position, spanLength: len, indexInSpan: idx });
        });
        spanCells = [];
      };

      for (let i = 0; i < dates.length; i++) {
        const dateKey = formatDateKey(dates[i]);
        const cellKey = `${userRow.userId}-${dateKey}`;
        const absenceEntry = absenceMap.get(cellKey);
        const absenceId = absenceEntry?.absence.id ?? null;

        if (absenceId !== null && absenceId === currentAbsenceId) {
          spanCells.push(cellKey);
        } else {
          finalizeSpan();
          if (absenceId !== null) {
            currentAbsenceId = absenceId;
            spanCells = [cellKey];
          } else {
            currentAbsenceId = null;
          }
        }
      }
      finalizeSpan();
    }

    return spanMap;
  }, [absenceMap, userRows, dates]);

  // Handle cell press - open quick picker
  const handleCellPress = useCallback(async (
    event: GestureResponderEvent,
    cellInfo: CellInfo
  ) => {
    if (!canEdit) return;

    // Check if the cell has an absence — show warning before opening picker
    const cellKey = `${cellInfo.userId}-${cellInfo.dateKey}`;
    const absenceEntry = absenceMap?.get(cellKey);
    if (absenceEntry && onAbsenceShiftConfirm) {
      const confirmed = await onAbsenceShiftConfirm(
        cellInfo.userId,
        cellInfo.dateKey,
        absenceEntry.type,
        ABSENCE_TYPE_LABELS[absenceEntry.type],
        cellInfo.userName,
      );
      if (!confirmed) return;
    }

    // In batch mode, if there's a pending change for this cell, use its state for the picker
    if (isBatchMode && pendingChanges) {
      const pending = pendingChanges.get(cellKey);
      if (pending) {
        // If the cell has a pending delete, treat it as if the cell is empty
        if (pending.type === 'delete') {
          cellInfo = { ...cellInfo, entry: null };
        }
        // If pending create/update, create a synthetic entry to show delete option in picker
        if (pending.type === 'create' && pending.shiftType) {
          cellInfo = {
            ...cellInfo,
            entry: {
              id: -1, // Synthetic - not yet saved
              schedule_id: schedule.id,
              user_id: cellInfo.userId,
              date: `${cellInfo.dateKey}T00:00:00Z`,
              shift_type: pending.shiftType,
              start_time: '',
              end_time: '',
              is_confirmed: false,
            } as ScheduleEntry,
          };
        }
      }
    }

    const { pageX, pageY } = event.nativeEvent;
    setPickerPosition({ x: pageX, y: pageY });
    setSelectedCell(cellInfo);
    setPickerVisible(true);
  }, [canEdit, isBatchMode, pendingChanges, schedule.id, absenceMap, onAbsenceShiftConfirm]);

  // Handle shift selection from picker
  const handleShiftSelect = useCallback(async (shiftType: ShiftType) => {
    if (!selectedCell) return;

    if (isBatchMode && onPendingShiftSelect) {
      // Batch mode: buffer the change locally (synchronous)
      onPendingShiftSelect(
        selectedCell.userId,
        selectedCell.dateKey,
        shiftType,
        selectedCell.entry,
      );
      setPickerVisible(false);
      setSelectedCell(null);
      return;
    }

    // Immediate mode: existing behavior with optimistic updates
    if (!onShiftSelect) return;

    const cellKey = `${selectedCell.userId}-${selectedCell.dateKey}`;

    // Apply optimistic update immediately for instant feedback
    setOptimisticUpdates(prev => {
      const next = new Map(prev);
      next.set(cellKey, shiftType);
      return next;
    });

    // Close picker immediately
    setPickerVisible(false);
    setSelectedCell(null);

    try {
      await onShiftSelect(
        selectedCell.userId,
        selectedCell.dateKey,
        shiftType,
        selectedCell.entry
      );
    } catch (error) {
      console.error('Failed to save shift:', error);
      // Revert optimistic update on error
      setOptimisticUpdates(prev => {
        const next = new Map(prev);
        next.delete(cellKey);
        return next;
      });
    } finally {
      // Clear optimistic update after real data arrives (slight delay to ensure store updated)
      setTimeout(() => {
        setOptimisticUpdates(prev => {
          const next = new Map(prev);
          next.delete(cellKey);
          return next;
        });
      }, 100);
    }
  }, [selectedCell, isBatchMode, onPendingShiftSelect, onShiftSelect]);

  // Handle entry deletion
  const handleDelete = useCallback(async () => {
    if (!selectedCell?.entry) return;

    if (isBatchMode && onPendingEntryDelete) {
      // Batch mode: buffer the delete locally
      // For pending creates (synthetic entry with id=-1), the hook will just remove the pending create
      if (selectedCell.entry.id === -1) {
        // This is a synthetic entry from a pending create - just remove the pending change
        onPendingEntryDelete(selectedCell.userId, selectedCell.dateKey, selectedCell.entry);
      } else {
        onPendingEntryDelete(selectedCell.userId, selectedCell.dateKey, selectedCell.entry);
      }
      setPickerVisible(false);
      setSelectedCell(null);
      return;
    }

    // Immediate mode: existing behavior
    if (!onEntryDelete) return;

    const cellKey = `${selectedCell.userId}-${selectedCell.dateKey}`;

    // Apply optimistic delete immediately
    setOptimisticUpdates(prev => {
      const next = new Map(prev);
      next.set(cellKey, 'deleted');
      return next;
    });

    // Close picker immediately
    setPickerVisible(false);
    const entryId = selectedCell.entry.id;
    setSelectedCell(null);

    try {
      await onEntryDelete(entryId);
    } catch (error) {
      console.error('Failed to delete entry:', error);
      // Revert optimistic update on error
      setOptimisticUpdates(prev => {
        const next = new Map(prev);
        next.delete(cellKey);
        return next;
      });
    } finally {
      // Clear optimistic update after real data arrives
      setTimeout(() => {
        setOptimisticUpdates(prev => {
          const next = new Map(prev);
          next.delete(cellKey);
          return next;
        });
      }, 100);
    }
  }, [selectedCell, isBatchMode, onPendingEntryDelete, onEntryDelete]);

  // Close picker
  const handleClosePicker = useCallback(() => {
    if (!isLoading) {
      setPickerVisible(false);
      setSelectedCell(null);
    }
  }, [isLoading]);

  return (
    <View style={styles.container}>
      {schedule.status === 'draft' && (
        <View style={[styles.draftBanner, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '30' }]}>
          <Text style={[styles.draftBannerText, { color: theme.primary }]}>
            Черновик — график не виден другим пользователям до публикации
          </Text>
        </View>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
        <View>
          {/* Header row with dates */}
          <View style={styles.headerRow}>
            {/* Empty cell for name column */}
            <View style={[styles.nameCell, styles.headerNameCell, { width: NAME_COLUMN_WIDTH, backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.headerText, { color: theme.textSecondary }]}>Ф.И.О.</Text>
            </View>

            {/* Date headers */}
            {dates.map((date, index) => {
              const weekend = isWeekend(date);
              const today = isToday(date);
              const holiday = getHoliday(date) !== null;
              const isRedDay = weekend || holiday;

              return (
                <View
                  key={index}
                  style={[
                    styles.dateCell,
                    { width: CELL_WIDTH, backgroundColor: theme.card, borderColor: theme.border },
                    weekend && { backgroundColor: theme.backgroundSecondary },
                    today && { backgroundColor: theme.primary + '20' },
                  ]}
                >
                  <Text style={[
                    styles.dayNumber,
                    { color: theme.text },
                    isRedDay && { color: theme.error },
                    today && { color: theme.primary, fontWeight: '700' },
                  ]}>
                    {formatDayNumber(date)}
                  </Text>
                  <Text style={[
                    styles.weekday,
                    { color: theme.textTertiary },
                    isRedDay && { color: theme.error + '80' },
                  ]}>
                    {formatWeekday(date)}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* User rows */}
          <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={true}>
            {userRows.length === 0 ? (
              <View style={[styles.emptyRow, { borderColor: theme.border }]}>
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  Нет записей в графике
                </Text>
              </View>
            ) : (
              userRows.map((userRow, rowIndex) => (
                <View key={userRow.userId} style={[styles.userRow, { borderColor: theme.border }]}>
                  {/* User name cell */}
                  <View style={[styles.nameCell, { width: NAME_COLUMN_WIDTH, backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Text style={[styles.rowNumber, { color: theme.textTertiary }]}>{rowIndex + 1}</Text>
                    <Avatar
                      name={userRow.userName}
                      imageUrl={userRow.userAvatar}
                      size={28}
                    />
                    <Text style={[styles.userName, { color: theme.text }]} numberOfLines={1}>
                      {userRow.userName}
                    </Text>
                  </View>

                  {/* Entry cells */}
                  {dates.map((date, index) => {
                    const dateKey = formatDateKey(date);
                    const entry = userRow.entriesByDate.get(dateKey);
                    const weekend = isWeekend(date);
                    const today = isToday(date);
                    const holiday = getHoliday(date) !== null;
                    const isRedDay = weekend || holiday;
                    const cellKey = `${userRow.userId}-${dateKey}`;
                    const isHovered = hoveredCell === cellKey;

                    // Determine display based on mode
                    let displayShiftType: ShiftType | null = null;
                    let isPending = false;
                    let pendingType: PendingChange['type'] | null = null;

                    if (isBatchMode && pendingChanges) {
                      // Batch mode: check pending changes
                      const pending = pendingChanges.get(cellKey);
                      if (pending) {
                        isPending = true;
                        pendingType = pending.type;
                        if (pending.type === 'delete') {
                          displayShiftType = null;
                        } else {
                          displayShiftType = pending.shiftType || null;
                        }
                      } else {
                        // No pending change — show original entry
                        displayShiftType = entry ? entry.shift_type : null;
                      }
                    } else {
                      // Immediate mode: check optimistic updates
                      const optimisticValue = optimisticUpdates.get(cellKey);
                      const isOptimisticDelete = optimisticValue === 'deleted';
                      const optimisticShiftType = optimisticValue && optimisticValue !== 'deleted' ? optimisticValue : null;
                      displayShiftType = optimisticShiftType || (entry && !isOptimisticDelete ? entry.shift_type : null);
                    }

                    // Check absence for this cell
                    const absenceLookup = absenceMap?.get(cellKey) || null;
                    const hasAbsence = !!absenceLookup;

                    // Check warnings for this cell
                    const cellWarningList = warningMap?.get(cellKey);
                    const hasWarning = !!cellWarningList && cellWarningList.length > 0;

                    // Absence span info for continuous band display
                    const spanInfo = hasAbsence && absenceSpanMap ? absenceSpanMap.get(cellKey) : undefined;
                    const spanPosition = spanInfo?.position ?? 'single';
                    const spanLength = spanInfo?.spanLength ?? 1;
                    const spanIndex = spanInfo?.indexInSpan ?? 0;
                    const isSpanLabelCell = spanIndex === Math.floor((spanLength - 1) / 2);

                    const cellInfo: CellInfo = {
                      userId: userRow.userId,
                      userName: userRow.userName,
                      date,
                      dateKey,
                      entry: entry || null,
                    };

                    return (
                      <Pressable
                        key={index}
                        style={[
                          styles.entryCell,
                          { width: CELL_WIDTH, borderColor: theme.border },
                          weekend && { backgroundColor: theme.backgroundSecondary + '50' },
                          today && { backgroundColor: theme.primary + '10' },
                          canEdit && styles.entryCellClickable,
                          canEdit && isHovered && { backgroundColor: (isRedDay ? theme.error : theme.textSecondary) + '15' },
                          isPending && !hasWarning && styles.pendingCell,
                          isPending && !hasWarning && { borderColor: theme.primary + '60' },
                          hasWarning && styles.pendingCell,
                          hasWarning && { borderColor: '#F59E0B80' },
                          hasAbsence && isSpanLabelCell && spanLength > 1 && Platform.OS === 'web' && { overflow: 'visible' as any, zIndex: 2 },
                        ]}
                        onPress={(e) => handleCellPress(e, cellInfo)}
                        onHoverIn={() => canEdit && setHoveredCell(cellKey)}
                        onHoverOut={() => setHoveredCell(null)}
                        disabled={!canEdit}
                      >
                        {/* Absence band segment - continuous colored bar across span */}
                        {hasAbsence && (
                          <View
                            style={[
                              styles.absenceSpanSegment,
                              { backgroundColor: ABSENCE_TYPE_COLORS[absenceLookup!.type] + '30' },
                              (spanPosition === 'start' || spanPosition === 'single') && styles.absenceSpanStart,
                              (spanPosition === 'end' || spanPosition === 'single') && styles.absenceSpanEnd,
                            ]}
                            pointerEvents="none"
                          />
                        )}
                        {/* Shift badge, absence label (center cell only), or add hint */}
                        {displayShiftType ? (
                          <View style={[
                            styles.shiftBadge,
                            { backgroundColor: getShiftColor(displayShiftType) },
                          ]}>
                            <Text style={styles.shiftText}>
                              {getShiftShortLabel(displayShiftType)}
                            </Text>
                          </View>
                        ) : hasAbsence && isSpanLabelCell ? (
                          spanLength > 1 ? (
                            <View
                              style={[
                                styles.absenceSpanLabelContainer,
                                {
                                  width: CELL_WIDTH * spanLength - 8,
                                  left: -(spanIndex * CELL_WIDTH) + 4,
                                },
                              ]}
                              pointerEvents="none"
                            >
                              <Text
                                style={[
                                  styles.absenceSpanLabel,
                                  { color: ABSENCE_TYPE_COLORS[absenceLookup!.type] },
                                ]}
                                numberOfLines={1}
                              >
                                {ABSENCE_TYPE_LABELS[absenceLookup!.type]}
                              </Text>
                            </View>
                          ) : (
                            <Text
                              style={[
                                styles.absenceSpanLabel,
                                { color: ABSENCE_TYPE_COLORS[absenceLookup!.type] },
                              ]}
                              numberOfLines={1}
                            >
                              {getAbsenceShortLabel(absenceLookup!.type)}
                            </Text>
                          )
                        ) : !hasAbsence && canEdit && isHovered ? (
                          <View style={styles.addHint}>
                            <Text style={[styles.addHintText, { color: theme.primary }]}>+</Text>
                          </View>
                        ) : null}
                        {/* Absence dot indicator (when shift is present on absence day) */}
                        {hasAbsence && displayShiftType && (
                          <View style={[
                            styles.absenceDot,
                            { backgroundColor: ABSENCE_TYPE_COLORS[absenceLookup!.type] },
                          ]} />
                        )}
                        {/* Pending change indicator dot */}
                        {isPending && !hasWarning && (
                          <View style={[
                            styles.pendingDot,
                            { backgroundColor: pendingType === 'delete' ? '#EF4444' : theme.primary },
                          ]} />
                        )}
                        {/* Warning indicator dot */}
                        {hasWarning && (
                          <View style={[
                            styles.pendingDot,
                            { backgroundColor: '#F59E0B' },
                          ]} />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </ScrollView>

      {/* Legend */}
      <View style={[styles.legend, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
        <Text style={[styles.legendTitle, { color: theme.textSecondary }]}>Обозначения:</Text>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View style={[styles.legendBadge, { backgroundColor: getShiftColor('morning') }]}>
              <Text style={styles.legendBadgeText}>У</Text>
            </View>
            <Text style={[styles.legendLabel, { color: theme.text }]}>{SHIFT_TYPE_LABELS.morning}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBadge, { backgroundColor: getShiftColor('evening') }]}>
              <Text style={styles.legendBadgeText}>В</Text>
            </View>
            <Text style={[styles.legendLabel, { color: theme.text }]}>{SHIFT_TYPE_LABELS.evening}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBadge, { backgroundColor: getShiftColor('full_day') }]}>
              <Text style={styles.legendBadgeText}>Д</Text>
            </View>
            <Text style={[styles.legendLabel, { color: theme.text }]}>{SHIFT_TYPE_LABELS.full_day}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBadge, { backgroundColor: getShiftColor('custom') }]}>
              <Text style={styles.legendBadgeText}>О</Text>
            </View>
            <Text style={[styles.legendLabel, { color: theme.text }]}>{SHIFT_TYPE_LABELS.custom}</Text>
          </View>
        </View>

        {/* Absence legend - only show if there are absences */}
        {absenceMap && absenceMap.size > 0 && (
          <>
            <View style={styles.legendDivider} />
            <View style={styles.legendItems}>
              {(['vacation', 'sick_leave', 'day_off', 'business_trip', 'study_leave'] as AbsenceType[]).map((type) => (
                <View key={type} style={styles.legendItem}>
                  <View style={[styles.legendBadge, { backgroundColor: ABSENCE_TYPE_COLORS[type] + '30' }]}>
                    <Text style={[styles.legendBadgeText, { color: ABSENCE_TYPE_COLORS[type] }]}>
                      {getAbsenceShortLabel(type)}
                    </Text>
                  </View>
                  <Text style={[styles.legendLabel, { color: theme.text }]}>
                    {ABSENCE_TYPE_LABELS[type]}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </View>

      {/* Quick Shift Picker */}
      <ShiftQuickPicker
        visible={pickerVisible}
        entry={selectedCell?.entry || null}
        position={pickerPosition}
        onSelectShift={handleShiftSelect}
        onDelete={handleDelete}
        onClose={handleClosePicker}
        isLoading={isLoading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  draftBanner: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: 8,
    marginBottom: 8,
  },
  draftBannerText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 2,
  },
  headerNameCell: {
    justifyContent: 'center',
    paddingLeft: 12,
  },
  nameCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRightWidth: 1,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  dateCell: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRightWidth: 1,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '600',
  },
  weekday: {
    fontSize: 10,
    marginTop: 2,
  },
  bodyScroll: {
    flex: 1,
  },
  userRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  rowNumber: {
    fontSize: 12,
    fontWeight: '500',
    minWidth: 18,
    textAlign: 'center',
  },
  userName: {
    fontSize: 13,
    flex: 1,
  },
  entryCell: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRightWidth: 1,
    minHeight: 44,
  },
  shiftBadge: {
    width: 24,
    height: 24,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  shiftText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyRow: {
    paddingVertical: 32,
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  emptyText: {
    fontSize: 14,
  },
  legend: {
    padding: 12,
    borderTopWidth: 1,
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendBadge: {
    width: 20,
    height: 20,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  legendLabel: {
    fontSize: 12,
  },
  entryCellClickable: {
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'background-color 0.15s ease',
      },
    }),
  },
  addHint: {
    width: 24,
    height: 24,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.6,
  },
  addHintText: {
    fontSize: 16,
    fontWeight: '600',
  },
  pendingCell: {
    ...Platform.select({
      web: {
        borderStyle: 'dashed',
      },
    }),
    borderWidth: 1,
  } as any,
  pendingDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  absenceSpanSegment: {
    position: 'absolute',
    top: 10,
    bottom: 10,
    left: 0,
    right: 0,
  },
  absenceSpanStart: {
    left: 4,
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  absenceSpanEnd: {
    right: 4,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  absenceSpanLabelContainer: {
    position: 'absolute',
    top: 10,
    bottom: 10,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  absenceSpanLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  absenceDot: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  legendDivider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    marginVertical: 8,
  },
});
