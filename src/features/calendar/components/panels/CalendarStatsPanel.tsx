import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Event } from '../../types/calendar.types';
import { useTheme } from '@shared/hooks/useTheme';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, isWithinInterval, parseISO, startOfMonth, endOfMonth } from 'date-fns';

interface CalendarStatsPanelProps {
  selectedDate?: Date;
  events: Event[];
  viewMode?: 'day' | 'week';
  isCompact?: boolean;
}

export const CalendarStatsPanel: React.FC<CalendarStatsPanelProps> = ({
  selectedDate,
  events,
  isCompact = false,
}) => {
  const { theme } = useTheme();

  // Calculate comprehensive statistics
  const stats = useMemo(() => {
    const referenceDate = selectedDate || new Date();
    const todayStart = startOfDay(referenceDate);
    const todayEnd = endOfDay(referenceDate);
    const weekStart = startOfWeek(referenceDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(referenceDate, { weekStartsOn: 1 });
    const monthStart = startOfMonth(referenceDate);
    const monthEnd = endOfMonth(referenceDate);

    // Events today
    const eventsToday = events.filter(event => {
      const eventDate = parseISO(event.start_time);
      return isWithinInterval(eventDate, { start: todayStart, end: todayEnd });
    });

    // Events this week
    const eventsThisWeek = events.filter(event => {
      const eventDate = parseISO(event.start_time);
      return isWithinInterval(eventDate, { start: weekStart, end: weekEnd });
    });

    // Events this month
    const eventsThisMonth = events.filter(event => {
      const eventDate = parseISO(event.start_time);
      return isWithinInterval(eventDate, { start: monthStart, end: monthEnd });
    });

    // Group events by type
    const eventsByType = events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Total events
    const totalEvents = events.length;

    // Calculate percentages for chart
    const typeStats = [
      { type: 'schedule', label: 'Графики', color: '#F59E0B', count: eventsByType.schedule || 0 },
      { type: 'birthday', label: 'Дни рождения', color: '#EC4899', count: eventsByType.birthday || 0 },
      { type: 'meeting', label: 'Встречи', color: '#3B82F6', count: eventsByType.meeting || 0 },
      { type: 'deadline', label: 'Дедлайны', color: '#EF4444', count: eventsByType.deadline || 0 },
      { type: 'personal', label: 'Личные', color: '#10B981', count: eventsByType.personal || 0 },
    ].map(stat => ({
      ...stat,
      percentage: totalEvents > 0 ? (stat.count / totalEvents) * 100 : 0,
    }));

    return {
      todayCount: eventsToday.length,
      weekCount: eventsThisWeek.length,
      monthCount: eventsThisMonth.length,
      totalEvents,
      typeStats,
    };
  }, [events, selectedDate]);

  // Check if selected date is today and format date label
  const referenceDate = selectedDate || new Date();
  const isSelectedToday = startOfDay(referenceDate).getTime() === startOfDay(new Date()).getTime();

  // Format date for display (e.g., "3 дек" or "Сегодня")
  const dayLabel = isSelectedToday
    ? 'Сегодня'
    : referenceDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
      {/* Event Counts */}
      <View style={styles.countsRow}>
        {/* Day */}
        <View style={[styles.countCard, { backgroundColor: theme.card }]}>
          <View style={[styles.iconCircle, { backgroundColor: '#3B82F6' + '20' }]}>
            <Ionicons name="today" size={16} color="#3B82F6" />
          </View>
          <View style={styles.countContent}>
            <Text style={[styles.countNumber, { color: theme.text }]} numberOfLines={1}>
              {stats.todayCount}
            </Text>
            <Text style={[styles.countLabel, { color: theme.textSecondary }]} numberOfLines={1}>
              {dayLabel}
            </Text>
          </View>
        </View>

        {/* This Week */}
        <View style={[styles.countCard, { backgroundColor: theme.card }]}>
          <View style={[styles.iconCircle, { backgroundColor: '#10B981' + '20' }]}>
            <Ionicons name="calendar" size={16} color="#10B981" />
          </View>
          <View style={styles.countContent}>
            <Text style={[styles.countNumber, { color: theme.text }]} numberOfLines={1}>
              {stats.weekCount}
            </Text>
            <Text style={[styles.countLabel, { color: theme.textSecondary }]} numberOfLines={1}>
              Неделя
            </Text>
          </View>
        </View>

        {/* This Month */}
        <View style={[styles.countCard, { backgroundColor: theme.card }]}>
          <View style={[styles.iconCircle, { backgroundColor: '#8B5CF6' + '20' }]}>
            <Ionicons name="calendar-outline" size={16} color="#8B5CF6" />
          </View>
          <View style={styles.countContent}>
            <Text style={[styles.countNumber, { color: theme.text }]} numberOfLines={1}>
              {stats.monthCount}
            </Text>
            <Text style={[styles.countLabel, { color: theme.textSecondary }]} numberOfLines={1}>
              Месяц
            </Text>
          </View>
        </View>
      </View>

      {/* Event Type Distribution */}
      {!isCompact && stats.totalEvents > 0 && (
        <View style={[styles.chartSection, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Типы событий (Месяц)</Text>

          {/* Visual Bar Chart */}
          <View style={styles.chartBars}>
            {stats.typeStats.map((stat) => (
              <View key={stat.type} style={styles.chartRow}>
                <View style={styles.chartLabel}>
                  <View style={[styles.chartDot, { backgroundColor: stat.color }]} />
                  <Text style={[styles.chartLabelText, { color: theme.textSecondary }]}>
                    {stat.label}
                  </Text>
                </View>
                <View style={styles.chartBarContainer}>
                  <View
                    style={[
                      styles.chartBar,
                      {
                        backgroundColor: stat.color,
                        width: `${Math.min(stat.percentage, 85)}%`,
                      },
                    ]}
                  />
                  <Text style={[styles.chartValue, { color: theme.text }]}>
                    {stat.count}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  countsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  countCard: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  countContent: {
    alignItems: 'center',
    gap: 2,
  },
  countNumber: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
  },
  countLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  chartSection: {
    marginTop: 16,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chartBars: {
    gap: 12,
  },
  chartRow: {
    gap: 4,
  },
  chartLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  chartDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chartLabelText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chartBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 20,
    flex: 1,
  },
  chartBar: {
    height: '100%',
    borderRadius: 6,
    minWidth: 4,
  },
  chartValue: {
    fontSize: 12,
    fontWeight: '700',
    minWidth: 24,
    flexShrink: 0,
  },
});
