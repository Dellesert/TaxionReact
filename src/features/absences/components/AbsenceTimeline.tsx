/**
 * AbsenceTimeline
 * Gantt-style timeline view showing all employees' absences
 * Horizontal bars for each employee's absences across the year
 */

import React, { useMemo, useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { CustomScrollView, CustomScrollViewRef } from '@shared/components/common/CustomScrollView';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { Avatar } from '@shared/components/common/Avatar';
import {
  Absence,
  AbsenceType,
  AbsenceUser,
  AbsenceColorMode,
  ABSENCE_TYPE_COLORS,
  ABSENCE_TYPE_LABELS,
  ABSENCE_TYPE_ICONS,
} from '../types/absence.types';
import { getUserColorById } from '../constants/userColors.constants';
import { useRussianHolidays } from '../hooks/useRussianHolidays';

interface AbsenceTimelineProps {
  year: number;
  absences: Absence[];
  selectedTypeFilter?: AbsenceType | null;
  colorMode?: AbsenceColorMode;
  onAbsencePress?: (absence: Absence) => void;
  onYearChange?: (year: number) => void;
}

// Month names in Russian
const MONTH_NAMES_SHORT = [
  'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
  'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек',
];

const MONTH_NAMES_FULL = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

// Days in each month
const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

// Get total days in year
const getTotalDaysInYear = (year: number): number => {
  return (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 366 : 365;
};

// Parse date string to local date
const parseLocalDate = (dateStr: string): Date => {
  const datePart = dateStr.substring(0, 10);
  const [year, month, day] = datePart.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// Get day of year (1-indexed)
const getDayOfYear = (date: Date): number => {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
};

// Calculate duration in days
const getDurationDays = (start: Date, end: Date): number => {
  const diffTime = end.getTime() - start.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

// Format date for display
const formatDate = (date: Date): string => {
  return `${date.getDate()} ${MONTH_NAMES_SHORT[date.getMonth()]}`;
};

// Format full date with weekday
const WEEKDAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
const formatFullDate = (date: Date): string => {
  const day = date.getDate();
  const month = MONTH_NAMES_FULL[date.getMonth()];
  const weekday = WEEKDAYS[date.getDay()];
  return `${day} ${month}, ${weekday}`;
};

// Pluralize days in Russian
const pluralizeDays = (count: number): string => {
  const lastTwo = count % 100;
  const lastOne = count % 10;

  if (lastTwo >= 11 && lastTwo <= 19) return `${count} дней`;
  if (lastOne === 1) return `${count} день`;
  if (lastOne >= 2 && lastOne <= 4) return `${count} дня`;
  return `${count} дней`;
};

interface UserAbsenceRow {
  user: AbsenceUser;
  absences: Absence[];
  totalDays: number;
}

interface PopupData {
  absence: Absence;
  user: AbsenceUser;
  x: number;
  y: number;
  barBottom: number;
  startDate: Date;
  endDate: Date;
  duration: number;
}

// Timeline constants
const SIDEBAR_WIDTH = 280;
const ROW_HEIGHT = 52;
const MONTH_HEADER_HEIGHT = 28;
const DAY_HEADER_HEIGHT = 24;
const DAY_WIDTH = 4; // Width per day in pixels

export const AbsenceTimeline: React.FC<AbsenceTimelineProps> = ({
  year,
  absences,
  selectedTypeFilter,
  colorMode = 'by_type',
  onAbsencePress,
  onYearChange,
}) => {
  const { theme } = useTheme();
  const { holidays } = useRussianHolidays(year);

  // Get color based on colorMode
  const getAbsenceColor = useCallback((absence: Absence): string => {
    if (colorMode === 'by_user') {
      return absence.user?.color || getUserColorById(absence.user_id);
    }
    return ABSENCE_TYPE_COLORS[absence.type];
  }, [colorMode]);
  const scrollViewRef = useRef<CustomScrollViewRef>(null);
  const sidebarScrollRef = useRef<ScrollView>(null);
  const containerRef = useRef<View>(null);
  const [hoveredAbsence, setHoveredAbsence] = useState<number | null>(null);
  const [popupData, setPopupData] = useState<PopupData | null>(null);
  const popupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Filter absences by type if filter is set
  const filteredAbsences = useMemo(() => {
    if (!selectedTypeFilter) return absences;
    return absences.filter(a => a.type === selectedTypeFilter);
  }, [absences, selectedTypeFilter]);

  // Group absences by user and calculate total days
  const userRows = useMemo((): UserAbsenceRow[] => {
    const userMap = new Map<number, UserAbsenceRow>();

    for (const absence of filteredAbsences) {
      if (!absence.user) continue;

      let row = userMap.get(absence.user.id);
      if (!row) {
        row = { user: absence.user, absences: [], totalDays: 0 };
        userMap.set(absence.user.id, row);
      }
      row.absences.push(absence);

      // Calculate days for this absence
      const start = parseLocalDate(absence.start_date);
      const end = parseLocalDate(absence.end_date);
      row.totalDays += getDurationDays(start, end);
    }

    // Sort by user name
    return Array.from(userMap.values()).sort((a, b) =>
      (a.user.name || '').localeCompare(b.user.name || '')
    );
  }, [filteredAbsences]);

  // Calculate timeline width
  const totalDays = getTotalDaysInYear(year);
  const timelineWidth = totalDays * DAY_WIDTH;

  // Calculate month positions
  const monthPositions = useMemo(() => {
    const positions: { month: number; startX: number; width: number; startDay: number }[] = [];
    let currentX = 0;
    let currentDay = 1;

    for (let month = 0; month < 12; month++) {
      const daysInMonth = getDaysInMonth(year, month);
      const width = daysInMonth * DAY_WIDTH;
      positions.push({ month, startX: currentX, width, startDay: currentDay });
      currentX += width;
      currentDay += daysInMonth;
    }

    return positions;
  }, [year]);

  // Today's position
  const todayPosition = useMemo(() => {
    const today = new Date();
    if (today.getFullYear() !== year) return null;
    const dayOfYear = getDayOfYear(today);
    return (dayOfYear - 1) * DAY_WIDTH;
  }, [year]);

  // Get position and width for an absence bar
  const getAbsenceBarStyle = useCallback((absence: Absence) => {
    const startDate = parseLocalDate(absence.start_date);
    const endDate = parseLocalDate(absence.end_date);

    // Clamp to current year
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);

    const clampedStart = startDate < yearStart ? yearStart : startDate;
    const clampedEnd = endDate > yearEnd ? yearEnd : endDate;

    if (clampedStart > yearEnd || clampedEnd < yearStart) {
      return null; // Outside of year
    }

    const startDay = getDayOfYear(clampedStart) - 1; // 0-indexed
    const endDay = getDayOfYear(clampedEnd) - 1;
    const duration = endDay - startDay + 1;

    return {
      left: startDay * DAY_WIDTH,
      width: Math.max(duration * DAY_WIDTH - 2, 8), // Min width 8px, 2px gap
      duration,
    };
  }, [year]);

  // Scroll to current month on mount
  React.useEffect(() => {
    const today = new Date();
    if (today.getFullYear() === year) {
      const currentMonth = today.getMonth();
      const monthPos = monthPositions[currentMonth];
      if (monthPos && scrollViewRef.current) {
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ x: Math.max(0, monthPos.startX - 100), animated: false });
        }, 100);
      }
    }
  }, [monthPositions, year]);

  // Sync sidebar scroll with timeline scroll
  const handleTimelineScroll = useCallback((event: any) => {
    // Vertical scroll sync would go here if needed
  }, []);

  // Generate day markers for a month
  const getDayMarkers = (daysInMonth: number): number[] => {
    const markers: number[] = [1];
    for (let d = 5; d <= daysInMonth; d += 5) {
      markers.push(d);
    }
    return markers;
  };

  // Render month and day headers
  const renderHeaders = () => (
    <View style={styles.headersContainer}>
      {/* Month headers row */}
      <View style={[styles.monthHeaderRow, { backgroundColor: theme.backgroundSecondary }]}>
        {monthPositions.map(({ month, startX, width }) => (
          <View
            key={month}
            style={[
              styles.monthHeader,
              { left: startX, width, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.monthHeaderText, { color: theme.text }]}>
              {MONTH_NAMES_FULL[month]}
            </Text>
          </View>
        ))}
      </View>

      {/* Day markers row */}
      <View style={[styles.dayHeaderRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {monthPositions.map(({ month, startX, width }) => {
          const daysInMonth = getDaysInMonth(year, month);
          const markers = getDayMarkers(daysInMonth);

          return (
            <View key={month} style={[styles.dayHeaderMonth, { left: startX, width }]}>
              {markers.map(day => (
                <View
                  key={day}
                  style={[styles.dayMarker, { left: (day - 1) * DAY_WIDTH }]}
                >
                  <Text style={[styles.dayMarkerText, { color: theme.textSecondary }]}>
                    {day}
                  </Text>
                </View>
              ))}
            </View>
          );
        })}
      </View>
    </View>
  );

  // Render a single user row
  const renderUserRow = (row: UserAbsenceRow, index: number) => {
    const isEven = index % 2 === 0;

    return (
      <View
        key={row.user.id}
        style={[
          styles.timelineRow,
          { backgroundColor: isEven ? theme.card : theme.background },
        ]}
      >
        {/* Month grid lines */}
        {monthPositions.map(({ month, startX }) => (
          <View
            key={month}
            style={[styles.monthGridLine, { left: startX, borderColor: theme.border }]}
          />
        ))}

        {/* Holiday lines */}
        {holidays.map(holiday => {
          const holidayDate = new Date(holiday.date);
          if (holidayDate.getFullYear() !== year) return null;
          const dayOfYear = getDayOfYear(holidayDate);
          const position = (dayOfYear - 1) * DAY_WIDTH;
          return (
            <View
              key={holiday.date}
              style={[styles.holidayLine, { left: position, backgroundColor: theme.error + '20' }]}
              // @ts-ignore - Web-only
              title={holiday.name}
            />
          );
        })}

        {/* Today line */}
        {todayPosition !== null && (
          <View
            style={[styles.todayLine, { left: todayPosition, backgroundColor: theme.error }]}
          />
        )}

        {/* Absence bars */}
        {row.absences.map(absence => {
          const barStyle = getAbsenceBarStyle(absence);
          if (!barStyle) return null;

          const isHovered = hoveredAbsence === absence.id;
          const startDate = parseLocalDate(absence.start_date);
          const endDate = parseLocalDate(absence.end_date);
          const duration = getDurationDays(startDate, endDate);
          const typeLabel = ABSENCE_TYPE_LABELS[absence.type];

          // Determine what text to show based on bar width
          let barText = '';
          if (barStyle.width > 120) {
            barText = `${typeLabel} · ${formatDate(startDate)} — ${formatDate(endDate)} · ${pluralizeDays(duration)}`;
          } else if (barStyle.width > 80) {
            barText = `${formatDate(startDate)} — ${formatDate(endDate)}`;
          } else if (barStyle.width > 40) {
            barText = pluralizeDays(duration);
          }

          const handleMouseEnter = (e: any) => {
            setHoveredAbsence(absence.id);
            // Clear any pending timeout
            if (popupTimeoutRef.current) {
              clearTimeout(popupTimeoutRef.current);
            }
            // Get mouse position
            const rect = e.currentTarget.getBoundingClientRect();
            setPopupData({
              absence,
              user: row.user,
              x: rect.left + rect.width / 2,
              y: rect.top,
              barBottom: rect.bottom,
              startDate,
              endDate,
              duration,
            });
          };

          const handleMouseLeave = () => {
            setHoveredAbsence(null);
            // Delay hiding popup slightly for smooth transition
            popupTimeoutRef.current = setTimeout(() => {
              setPopupData(null);
            }, 100);
          };

          return (
            <TouchableOpacity
              key={absence.id}
              style={[
                styles.absenceBar,
                {
                  left: barStyle.left,
                  width: barStyle.width,
                  backgroundColor: getAbsenceColor(absence),
                },
                isHovered && styles.absenceBarHovered,
              ]}
              onPress={() => onAbsencePress?.(absence)}
              // @ts-ignore - Web only
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              activeOpacity={0.8}
            >
              {barText && (
                <Text style={styles.absenceBarText} numberOfLines={1}>
                  {barText}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // Render sidebar with user names
  const renderSidebar = () => (
    <View style={[styles.sidebar, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {/* Header */}
      <View style={[styles.sidebarHeader, { borderColor: theme.border }]}>
        <Text style={[styles.sidebarHeaderText, { color: theme.text }]}>
          Сотрудники
        </Text>
      </View>

      {/* User list */}
      <ScrollView
        ref={sidebarScrollRef}
        style={[styles.sidebarList, { backgroundColor: theme.background }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
      >
        {userRows.map((row) => {
          const userColor = row.user.color || getUserColorById(row.user.id);
          return (
            <View
              key={row.user.id}
              style={[
                styles.sidebarRow,
                { borderColor: theme.border },
              ]}
            >
              <View style={styles.avatarWithColor}>
                <Avatar
                  name={row.user.name || ''}
                  imageUrl={row.user.avatar}
                  userId={row.user.id}
                  size={32}
                />
                <View style={[styles.userColorDot, { backgroundColor: userColor }]} />
              </View>
              <View style={styles.sidebarUserInfo}>
                <Text
                  style={[styles.sidebarUserName, { color: theme.text }]}
                  numberOfLines={1}
                >
                  {row.user.name}
                </Text>
                <Text style={[styles.sidebarUserMeta, { color: theme.textSecondary }]}>
                  {row.absences.length} {row.absences.length === 1 ? 'отсутствие' : row.absences.length < 5 ? 'отсутствия' : 'отсутствий'} · {row.totalDays} дн.
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );

  // Empty state message
  const emptyMessage = selectedTypeFilter
    ? `Нет отпусков типа "${ABSENCE_TYPE_LABELS[selectedTypeFilter]}" за ${year}`
    : `Нет отпусков за ${year}`;

  // Render hover popup
  const renderPopup = () => {
    if (!popupData || Platform.OS !== 'web') return null;

    const { absence, user, x, y, barBottom, startDate, endDate, duration } = popupData;
    const typeColor = ABSENCE_TYPE_COLORS[absence.type];
    const typeIcon = ABSENCE_TYPE_ICONS[absence.type];
    const typeLabel = ABSENCE_TYPE_LABELS[absence.type];

    // Check if it's a single day
    const isSingleDay = duration === 1;

    // Flip popup below the bar if not enough space above (~250px estimated popup height)
    const showBelow = y < 250;

    return (
      <View
        style={[
          styles.popup,
          showBelow ? styles.popupBelow : styles.popupAbove,
          {
            left: x,
            top: showBelow ? barBottom + 10 : y - 10,
            backgroundColor: theme.card,
            borderColor: theme.border,
            // @ts-ignore
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          },
        ]}
        // @ts-ignore
        onMouseEnter={() => {
          if (popupTimeoutRef.current) {
            clearTimeout(popupTimeoutRef.current);
          }
        }}
        onMouseLeave={() => {
          setPopupData(null);
          setHoveredAbsence(null);
        }}
      >
        {/* Arrow */}
        <View style={[
          showBelow
            ? [styles.popupArrowUp, { borderBottomColor: theme.card }]
            : [styles.popupArrow, { borderTopColor: theme.card }],
        ]} />

        {/* Header with type */}
        <View style={[styles.popupHeader, { backgroundColor: typeColor + '15' }]}>
          <View style={[styles.popupTypeIcon, { backgroundColor: typeColor }]}>
            <Ionicons name={typeIcon as any} size={16} color="#FFFFFF" />
          </View>
          <Text style={[styles.popupTypeLabel, { color: typeColor }]}>
            {typeLabel}
          </Text>
          <View style={[styles.popupDurationBadge, { backgroundColor: typeColor }]}>
            <Text style={styles.popupDurationText}>{pluralizeDays(duration)}</Text>
          </View>
        </View>

        {/* User info */}
        <View style={styles.popupUserRow}>
          <Avatar
            name={user.name || ''}
            imageUrl={user.avatar}
            userId={user.id}
            size={28}
          />
          <View style={styles.popupUserInfo}>
            <Text style={[styles.popupUserName, { color: theme.text }]}>{user.name}</Text>
            {user.position && (
              <Text style={[styles.popupUserPosition, { color: theme.textSecondary }]}>
                {user.position}
              </Text>
            )}
          </View>
        </View>

        {/* Dates */}
        <View style={[styles.popupDates, { borderColor: theme.border }]}>
          <View style={styles.popupDateRow}>
            <Ionicons name="calendar-outline" size={14} color={theme.textSecondary} />
            <Text style={[styles.popupDateLabel, { color: theme.textSecondary }]}>
              {isSingleDay ? 'Дата:' : 'Начало:'}
            </Text>
            <Text style={[styles.popupDateValue, { color: theme.text }]}>
              {formatFullDate(startDate)}
            </Text>
          </View>
          {!isSingleDay && (
            <View style={styles.popupDateRow}>
              <Ionicons name="calendar" size={14} color={theme.textSecondary} />
              <Text style={[styles.popupDateLabel, { color: theme.textSecondary }]}>
                Конец:
              </Text>
              <Text style={[styles.popupDateValue, { color: theme.text }]}>
                {formatFullDate(endDate)}
              </Text>
            </View>
          )}
        </View>

        {/* Reason if exists */}
        {absence.reason && (
          <View style={[styles.popupReason, { backgroundColor: theme.backgroundSecondary }]}>
            <Ionicons name="chatbubble-outline" size={12} color={theme.textSecondary} />
            <Text style={[styles.popupReasonText, { color: theme.textSecondary }]} numberOfLines={2}>
              {absence.reason}
            </Text>
          </View>
        )}

        {/* Click hint */}
        <Text style={[styles.popupHint, { color: theme.textSecondary }]}>
          Нажмите для редактирования
        </Text>
      </View>
    );
  };

  return (
    <View ref={containerRef} style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Main content */}
      <View style={styles.mainContent}>
        {/* Sidebar */}
        {renderSidebar()}

        {/* Timeline area */}
        <View style={[styles.timelineContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.timelineHeader, { borderColor: theme.border }]}>
            <Text style={[styles.timelineHeaderText, { color: theme.text }]}>График</Text>
            {onYearChange && (
              <View style={styles.timelineHeaderYearPicker}>
                <TouchableOpacity
                  onPress={() => onYearChange(year - 1)}
                  style={styles.timelineHeaderArrow}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-back" size={16} color={theme.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => onYearChange(new Date().getFullYear())}
                  activeOpacity={year === new Date().getFullYear() ? 1 : 0.6}
                  disabled={year === new Date().getFullYear()}
                >
                  <Text style={[styles.timelineHeaderYearText, { color: theme.text }]}>
                    {year}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => onYearChange(year + 1)}
                  style={styles.timelineHeaderArrow}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
            )}
          </View>
          {userRows.length === 0 ? (
            <View style={[styles.emptyContainer, { backgroundColor: theme.background }]}>
              <Ionicons name="calendar-outline" size={48} color={theme.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                {emptyMessage}
              </Text>
            </View>
          ) : (
            <CustomScrollView
              ref={scrollViewRef}
              horizontal
              style={styles.timelineScroll}
              contentContainerStyle={{ width: timelineWidth }}
              onScroll={handleTimelineScroll}
              scrollEventThrottle={16}
            >
              <View>
                {/* Headers */}
                {renderHeaders()}

                {/* Timeline rows */}
                <View style={[styles.timelineRows, { backgroundColor: theme.background }]}>
                  {userRows.map(renderUserRow)}
                </View>

                {/* Today indicator in header */}
                {todayPosition !== null && (
                  <View
                    style={[
                      styles.todayIndicator,
                      { left: todayPosition, top: 0, backgroundColor: theme.error },
                    ]}
                  >
                    <Text style={styles.todayIndicatorText}>Сегодня</Text>
                  </View>
                )}
              </View>
            </CustomScrollView>
          )}
        </View>
      </View>

      {/* Hover Popup */}
      {renderPopup()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  // Main content
  mainContent: {
    flex: 1,
    flexDirection: 'row',
  },
  // Sidebar styles
  sidebar: {
    width: SIDEBAR_WIDTH,
    borderRadius: 12,
    borderWidth: 1,
    margin: 16,
    marginRight: 0,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      },
    }),
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    minHeight: 56,
  },
  sidebarHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  sidebarList: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  sidebarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 6,
    gap: 10,
  },
  avatarWithColor: {
    position: 'relative',
  },
  userColorDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  sidebarUserInfo: {
    flex: 1,
  },
  sidebarUserName: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  sidebarUserMeta: {
    fontSize: 11,
    lineHeight: 14,
    marginTop: 2,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    minHeight: 56,
  },
  timelineHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  timelineHeaderYearPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timelineHeaderArrow: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    // @ts-ignore
    cursor: 'pointer',
  },
  timelineHeaderYearText: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'center',
    lineHeight: 20,
    marginHorizontal: 12,
  },
  // Timeline styles
  timelineContainer: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 12,
    borderWidth: 1,
    margin: 16,
    marginLeft: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      },
    }),
  },
  timelineScroll: {
    flex: 1,
  },
  headersContainer: {
    position: 'relative',
  },
  monthHeaderRow: {
    height: MONTH_HEADER_HEIGHT,
    flexDirection: 'row',
    position: 'relative',
  },
  monthHeader: {
    position: 'absolute',
    height: MONTH_HEADER_HEIGHT,
    justifyContent: 'center',
    paddingLeft: 8,
    borderRightWidth: 1,
  },
  monthHeaderText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dayHeaderRow: {
    height: DAY_HEADER_HEIGHT,
    flexDirection: 'row',
    position: 'relative',
    borderBottomWidth: 1,
  },
  dayHeaderMonth: {
    position: 'absolute',
    height: DAY_HEADER_HEIGHT,
  },
  dayMarker: {
    position: 'absolute',
    height: DAY_HEADER_HEIGHT,
    justifyContent: 'center',
  },
  dayMarkerText: {
    fontSize: 10,
    fontWeight: '500',
  },
  timelineRows: {
    flex: 1,
  },
  timelineRow: {
    height: ROW_HEIGHT,
    position: 'relative',
  },
  monthGridLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    borderRightWidth: 1,
    opacity: 0.3,
  },
  holidayLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: DAY_WIDTH,
  },
  todayLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    opacity: 0.7,
  },
  todayIndicator: {
    position: 'absolute',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    transform: [{ translateX: -20 }],
  },
  todayIndicatorText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '600',
  },
  absenceBar: {
    position: 'absolute',
    top: 10,
    height: ROW_HEIGHT - 20,
    borderRadius: 6,
    justifyContent: 'center',
    paddingHorizontal: 8,
    ...(Platform.OS === 'web' ? {
      // @ts-ignore
      cursor: 'pointer',
      transition: 'transform 0.1s ease, box-shadow 0.1s ease',
    } : {}),
  },
  absenceBarHovered: {
    ...(Platform.OS === 'web' ? {
      // @ts-ignore
      transform: [{ translateY: -2 }],
      boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
      zIndex: 10,
    } : {}),
  },
  absenceBarText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  // Popup styles
  popup: {
    position: 'fixed' as any,
    minWidth: 280,
    maxWidth: 340,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'visible' as any,
    zIndex: 1000,
    ...(Platform.OS === 'web' ? {
      // @ts-ignore
      animation: 'fadeIn 0.15s ease',
    } : {}),
  },
  popupAbove: {
    transform: [{ translateX: '-50%' }, { translateY: '-100%' }],
  },
  popupBelow: {
    transform: [{ translateX: '-50%' }],
  },
  popupArrow: {
    position: 'absolute',
    bottom: -8,
    left: '50%',
    marginLeft: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  } as any,
  popupArrowUp: {
    position: 'absolute',
    top: -8,
    left: '50%',
    marginLeft: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  } as any,
  popupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  popupTypeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupTypeLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  popupDurationBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popupDurationText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  popupUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  popupUserInfo: {
    flex: 1,
  },
  popupUserName: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  popupUserPosition: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  popupDates: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 6,
  },
  popupDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  popupDateLabel: {
    fontSize: 12,
    lineHeight: 16,
    width: 50,
  },
  popupDateValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  popupReason: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    margin: 12,
    marginTop: 0,
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  popupReasonText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  popupHint: {
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
    paddingVertical: 8,
    fontStyle: 'italic',
  },
});

export default AbsenceTimeline;
