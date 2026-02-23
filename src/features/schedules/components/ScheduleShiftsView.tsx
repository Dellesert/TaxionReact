import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Pressable, GestureResponderEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { Avatar } from '@shared/components/common/Avatar';
import type { Schedule, ScheduleEntry, ScheduleUser, ShiftType } from '../types/schedule.types';
import { UserQuickPicker } from './UserQuickPicker';

interface ScheduleShiftsViewProps {
  schedule: Schedule;
  entries: ScheduleEntry[];
  canEdit?: boolean;
  onAddEntry?: (userId: number, dateKey: string, shiftType: ShiftType) => Promise<void>;
  onUpdateEntry?: (entryId: number, userId: number) => Promise<void>;
  onDeleteEntry?: (entryId: number) => Promise<void>;
  groupMembers?: ScheduleUser[];
}

interface DateRow {
  date: Date;
  dateKey: string;
  morningEntries: ScheduleEntry[];
  eveningEntries: ScheduleEntry[];
}

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

// Format date for display (dd.MM.yy)
const formatDate = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${day}.${month}.${year}`;
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

// Get user display name with initials (Фамилия И.О.)
const getUserDisplayName = (entry: ScheduleEntry): string => {
  if (!entry.user) return `#${entry.user_id}`;

  const user = entry.user;

  // If we have separate name parts
  if (user.last_name) {
    let displayName = user.last_name;
    if (user.first_name) {
      displayName += ` ${user.first_name.charAt(0)}.`;
    }
    if (user.middle_name) {
      displayName += `${user.middle_name.charAt(0)}.`;
    }
    return displayName;
  }

  // Fall back to full name, try to parse it (Фамилия Имя Отчество)
  const name = user.name || '';
  const parts = name.split(' ').filter(p => p.length > 0);

  if (parts.length >= 3) {
    // Фамилия И.О.
    return `${parts[0]} ${parts[1].charAt(0)}.${parts[2].charAt(0)}.`;
  } else if (parts.length === 2) {
    // Фамилия И.
    return `${parts[0]} ${parts[1].charAt(0)}.`;
  } else if (parts.length === 1) {
    return parts[0];
  }

  return name || `#${entry.user_id}`;
};

// Get full name for avatar
const getUserFullName = (entry: ScheduleEntry): string => {
  if (!entry.user) return `#${entry.user_id}`;
  return entry.user.name || entry.user.last_name || `#${entry.user_id}`;
};

interface CellInfo {
  dateKey: string;
  shiftType: 'morning' | 'evening';
  entry: ScheduleEntry | null;
  existingUserIds: number[];
}

export const ScheduleShiftsView: React.FC<ScheduleShiftsViewProps> = ({
  schedule,
  entries,
  canEdit = false,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
  groupMembers,
}) => {
  const { theme } = useTheme();

  // Quick picker state
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerPosition, setPickerPosition] = useState({ x: 0, y: 0 });
  const [selectedCell, setSelectedCell] = useState<CellInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null); // "dateKey-shiftType"

  // Handle cell press - open quick picker
  const handleCellPress = useCallback((
    event: GestureResponderEvent,
    cellInfo: CellInfo
  ) => {
    if (!canEdit) return;

    const { pageX, pageY } = event.nativeEvent;
    setPickerPosition({ x: pageX, y: pageY });
    setSelectedCell(cellInfo);
    setPickerVisible(true);
  }, [canEdit]);

  // Handle entry press - open quick picker for existing entry
  const handleEntryPress = useCallback((
    event: GestureResponderEvent,
    entry: ScheduleEntry,
    shiftType: 'morning' | 'evening',
    existingUserIds: number[]
  ) => {
    if (!canEdit) return;
    event.stopPropagation?.();

    const { pageX, pageY } = event.nativeEvent;
    const dateKey = entry.date.split('T')[0];
    setPickerPosition({ x: pageX, y: pageY });
    setSelectedCell({
      dateKey,
      shiftType,
      entry,
      existingUserIds,
    });
    setPickerVisible(true);
  }, [canEdit]);

  // Handle user selection from picker
  const handleSelectUser = useCallback(async (userId: number) => {
    if (!selectedCell) return;

    setIsLoading(true);
    try {
      if (selectedCell.entry && onUpdateEntry) {
        // Replace user in existing entry
        await onUpdateEntry(selectedCell.entry.id, userId);
      } else if (onAddEntry) {
        // Add new entry
        await onAddEntry(userId, selectedCell.dateKey, selectedCell.shiftType);
      }
      setPickerVisible(false);
      setSelectedCell(null);
    } catch (error) {
      console.error('Failed to save entry:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCell, onAddEntry, onUpdateEntry]);

  // Handle entry deletion
  const handleDelete = useCallback(async () => {
    if (!selectedCell?.entry || !onDeleteEntry) return;

    setIsLoading(true);
    try {
      await onDeleteEntry(selectedCell.entry.id);
      setPickerVisible(false);
      setSelectedCell(null);
    } catch (error) {
      console.error('Failed to delete entry:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCell, onDeleteEntry]);

  // Close picker
  const handleClosePicker = useCallback(() => {
    if (!isLoading) {
      setPickerVisible(false);
      setSelectedCell(null);
    }
  }, [isLoading]);

  // Generate dates and group entries by date and shift
  const dateRows = useMemo((): DateRow[] => {
    const dates = generateDates(schedule.start_date, schedule.end_date);

    // Create a map of entries by date
    const entriesByDate = new Map<string, ScheduleEntry[]>();
    for (const entry of entries) {
      const dateKey = entry.date.split('T')[0];
      const existing = entriesByDate.get(dateKey) || [];
      existing.push(entry);
      entriesByDate.set(dateKey, existing);
    }

    return dates.map(date => {
      const dateKey = formatDateKey(date);
      const dateEntries = entriesByDate.get(dateKey) || [];

      // Split by shift type
      const morningEntries = dateEntries.filter(e =>
        e.shift_type === 'morning' || e.shift_type === 'full_day'
      );
      const eveningEntries = dateEntries.filter(e =>
        e.shift_type === 'evening' || e.shift_type === 'full_day'
      );

      return {
        date,
        dateKey,
        morningEntries,
        eveningEntries,
      };
    });
  }, [schedule.start_date, schedule.end_date, entries]);

  const renderEntry = (
    entry: ScheduleEntry,
    shiftType: 'morning' | 'evening',
    existingUserIds: number[]
  ) => (
    <Pressable
      key={entry.id}
      style={[
        styles.entryItem,
        canEdit && styles.entryItemClickable,
      ]}
      onPress={(e) => handleEntryPress(e, entry, shiftType, existingUserIds)}
      disabled={!canEdit}
    >
      <Avatar
        name={getUserFullName(entry)}
        imageUrl={entry.user?.avatar}
        size={24}
      />
      <Text style={[styles.nameText, { color: theme.text }]} numberOfLines={1}>
        {getUserDisplayName(entry)}
      </Text>
      {canEdit && (
        <Ionicons name="chevron-forward" size={14} color={theme.textSecondary} />
      )}
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.tableWrapper, { borderColor: theme.border }]}>
          {/* Header row */}
          <View style={[styles.headerRow, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            <View style={[styles.dateHeaderCell, { borderRightColor: theme.border }]}>
              <Text style={[styles.headerText, { color: theme.text }]}>Дата</Text>
            </View>
            <View style={[styles.shiftHeaderCell, { borderRightColor: theme.border }]}>
              <Text style={[styles.headerText, { color: theme.text }]}>Утро</Text>
              {schedule.morning_start && schedule.morning_end && (
                <Text style={[styles.headerSubtext, { color: theme.textSecondary }]}>
                  {schedule.morning_start?.slice(0, 5)} — {schedule.morning_end?.slice(0, 5)}
                </Text>
              )}
            </View>
            <View style={[styles.shiftHeaderCell, styles.lastColumn]}>
              <Text style={[styles.headerText, { color: theme.text }]}>Вечер</Text>
              {schedule.evening_start && schedule.evening_end && (
                <Text style={[styles.headerSubtext, { color: theme.textSecondary }]}>
                  {schedule.evening_start?.slice(0, 5)} — {schedule.evening_end?.slice(0, 5)}
                </Text>
              )}
            </View>
          </View>

          {/* Data rows */}
          {dateRows.map((row) => {
            const weekend = isWeekend(row.date);
            const today = isToday(row.date);
            const hasEntries = row.morningEntries.length > 0 || row.eveningEntries.length > 0;

            return (
              <View
                key={row.dateKey}
                style={[
                  styles.dataRow,
                  { borderBottomColor: theme.border },
                  weekend && { backgroundColor: theme.backgroundSecondary + '50' },
                  today && { backgroundColor: theme.primary + '10' },
                  !hasEntries && { opacity: 0.5 },
                ]}
              >
                {/* Date cell */}
                <View style={[styles.dateCell, { borderRightColor: theme.border }]}>
                  <Text style={[
                    styles.dateText,
                    { color: theme.text },
                    weekend && { color: theme.error },
                    today && { color: theme.primary, fontWeight: '700' },
                  ]}>
                    {formatDate(row.date)}
                  </Text>
                </View>

                {/* Morning cell */}
                {(() => {
                  const morningUserIds = row.morningEntries.map(e => e.user_id);
                  const morningCellKey = `${row.dateKey}-morning`;
                  const isMorningHovered = hoveredCell === morningCellKey;

                  return (
                    <Pressable
                      style={[
                        styles.shiftCell,
                        { borderRightColor: theme.border },
                        canEdit && styles.shiftCellClickable,
                        canEdit && isMorningHovered && { backgroundColor: theme.primary + '08' },
                      ]}
                      onPress={(e) => handleCellPress(e, {
                        dateKey: row.dateKey,
                        shiftType: 'morning',
                        entry: null,
                        existingUserIds: morningUserIds,
                      })}
                      onHoverIn={() => canEdit && setHoveredCell(morningCellKey)}
                      onHoverOut={() => setHoveredCell(null)}
                      disabled={!canEdit}
                    >
                      {row.morningEntries.length > 0 ? (
                        <View style={styles.namesContainer}>
                          {row.morningEntries.map(entry => renderEntry(entry, 'morning', morningUserIds))}
                        </View>
                      ) : canEdit && isMorningHovered ? (
                        <View style={styles.addHint}>
                          <Ionicons name="add" size={18} color={theme.primary} />
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })()}

                {/* Evening cell */}
                {(() => {
                  const eveningUserIds = row.eveningEntries.map(e => e.user_id);
                  const eveningCellKey = `${row.dateKey}-evening`;
                  const isEveningHovered = hoveredCell === eveningCellKey;

                  return (
                    <Pressable
                      style={[
                        styles.shiftCell,
                        styles.lastColumn,
                        canEdit && styles.shiftCellClickable,
                        canEdit && isEveningHovered && { backgroundColor: theme.primary + '08' },
                      ]}
                      onPress={(e) => handleCellPress(e, {
                        dateKey: row.dateKey,
                        shiftType: 'evening',
                        entry: null,
                        existingUserIds: eveningUserIds,
                      })}
                      onHoverIn={() => canEdit && setHoveredCell(eveningCellKey)}
                      onHoverOut={() => setHoveredCell(null)}
                      disabled={!canEdit}
                    >
                      {row.eveningEntries.length > 0 ? (
                        <View style={styles.namesContainer}>
                          {row.eveningEntries.map(entry => renderEntry(entry, 'evening', eveningUserIds))}
                        </View>
                      ) : canEdit && isEveningHovered ? (
                        <View style={styles.addHint}>
                          <Ionicons name="add" size={18} color={theme.primary} />
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })()}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* User Quick Picker */}
      <UserQuickPicker
        visible={pickerVisible}
        entry={selectedCell?.entry || null}
        position={pickerPosition}
        dateKey={selectedCell?.dateKey || ''}
        shiftType={selectedCell?.shiftType || 'morning'}
        onSelectUser={handleSelectUser}
        onDelete={handleDelete}
        onClose={handleClosePicker}
        isLoading={isLoading}
        existingUserIds={selectedCell?.existingUserIds || []}
        groupMembers={groupMembers}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  tableWrapper: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    ...(Platform.OS === 'web' && {
      position: 'sticky' as const,
      top: 0,
      zIndex: 10,
    }),
  } as any,
  dateHeaderCell: {
    width: 90,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shiftHeaderCell: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRightWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lastColumn: {
    borderRightWidth: 0,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  headerSubtext: {
    fontSize: 11,
    marginTop: 2,
  },
  dataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    minHeight: 44,
  },
  dateCell: {
    width: 90,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 13,
    fontWeight: '500',
  },
  shiftCell: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRightWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  namesContainer: {
    gap: 6,
  },
  entryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginHorizontal: -8,
    borderRadius: 8,
  },
  entryItemClickable: {
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'background-color 0.15s ease',
      },
    }),
  },
  nameText: {
    fontSize: 13,
    flex: 1,
  },
  shiftCellClickable: {
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'background-color 0.15s ease',
      },
    }),
  },
  addHint: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    opacity: 0.6,
  },
});
