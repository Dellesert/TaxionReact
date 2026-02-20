import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Pressable, GestureResponderEvent } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';
import { Avatar } from '@shared/components/common/Avatar';
import type { Schedule, ScheduleEntry, ScheduleUser, ShiftType } from '../types/schedule.types';
import { SHIFT_TYPE_LABELS } from '../types/schedule.types';
import { ShiftQuickPicker } from './ShiftQuickPicker';
import { getHoliday } from '@features/absences/constants/russianHolidays.constants';

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
  onShiftSelect?: (userId: number, date: string, shiftType: ShiftType, existingEntry: ScheduleEntry | null) => Promise<void>;
  onEntryDelete?: (entryId: number) => Promise<void>;
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
}) => {
  const { theme } = useTheme();

  // Quick picker state
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerPosition, setPickerPosition] = useState({ x: 0, y: 0 });
  const [selectedCell, setSelectedCell] = useState<CellInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null); // "userId-dateKey"

  // Optimistic updates - temporary local state for instant feedback
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

  // Handle shift selection from picker with optimistic update
  const handleShiftSelect = useCallback(async (shiftType: ShiftType) => {
    if (!selectedCell || !onShiftSelect) return;

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
  }, [selectedCell, onShiftSelect]);

  // Handle entry deletion with optimistic update
  const handleDelete = useCallback(async () => {
    if (!selectedCell?.entry || !onEntryDelete) return;

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
  }, [selectedCell, onEntryDelete]);

  // Close picker
  const handleClosePicker = useCallback(() => {
    if (!isLoading) {
      setPickerVisible(false);
      setSelectedCell(null);
    }
  }, [isLoading]);

  return (
    <View style={styles.container}>
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
              userRows.map((userRow) => (
                <View key={userRow.userId} style={[styles.userRow, { borderColor: theme.border }]}>
                  {/* User name cell */}
                  <View style={[styles.nameCell, { width: NAME_COLUMN_WIDTH, backgroundColor: theme.card, borderColor: theme.border }]}>
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
                    const cellKey = `${userRow.userId}-${dateKey}`;
                    const isHovered = hoveredCell === cellKey;

                    // Check for optimistic update
                    const optimisticValue = optimisticUpdates.get(cellKey);
                    const isOptimisticDelete = optimisticValue === 'deleted';
                    const optimisticShiftType = optimisticValue && optimisticValue !== 'deleted' ? optimisticValue : null;

                    // Determine what to display: optimistic update takes priority
                    const displayShiftType = optimisticShiftType || (entry && !isOptimisticDelete ? entry.shift_type : null);

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
                          canEdit && isHovered && { backgroundColor: theme.primary + '15' },
                        ]}
                        onPress={(e) => handleCellPress(e, cellInfo)}
                        onHoverIn={() => canEdit && setHoveredCell(cellKey)}
                        onHoverOut={() => setHoveredCell(null)}
                        disabled={!canEdit}
                      >
                        {displayShiftType ? (
                          <View style={[
                            styles.shiftBadge,
                            { backgroundColor: getShiftColor(displayShiftType) },
                          ]}>
                            <Text style={styles.shiftText}>
                              {getShiftShortLabel(displayShiftType)}
                            </Text>
                          </View>
                        ) : canEdit && isHovered ? (
                          <View style={styles.addHint}>
                            <Text style={[styles.addHintText, { color: theme.primary }]}>+</Text>
                          </View>
                        ) : null}
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
});
