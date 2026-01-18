/**
 * Schedule Screen
 * Экран расписания с графиком работы
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

// Дни недели
const DAYS_OF_WEEK = [
  { key: 'mon', label: 'Пн', fullLabel: 'Понедельник' },
  { key: 'tue', label: 'Вт', fullLabel: 'Вторник' },
  { key: 'wed', label: 'Ср', fullLabel: 'Среда' },
  { key: 'thu', label: 'Чт', fullLabel: 'Четверг' },
  { key: 'fri', label: 'Пт', fullLabel: 'Пятница' },
  { key: 'sat', label: 'Сб', fullLabel: 'Суббота' },
  { key: 'sun', label: 'Вс', fullLabel: 'Воскресенье' },
];

// Пример графика работы (можно заменить на данные из API)
const WORK_SCHEDULE = {
  mon: { start: '09:00', end: '18:00', isWorkDay: true },
  tue: { start: '09:00', end: '18:00', isWorkDay: true },
  wed: { start: '09:00', end: '18:00', isWorkDay: true },
  thu: { start: '09:00', end: '18:00', isWorkDay: true },
  fri: { start: '09:00', end: '17:00', isWorkDay: true },
  sat: { start: '', end: '', isWorkDay: false },
  sun: { start: '', end: '', isWorkDay: false },
};

export const ScheduleScreen: React.FC = () => {
  const { theme } = useTheme();

  const renderDayRow = (day: typeof DAYS_OF_WEEK[number]) => {
    const schedule = WORK_SCHEDULE[day.key as keyof typeof WORK_SCHEDULE];
    const isToday = new Date().getDay() === DAYS_OF_WEEK.indexOf(day) + 1 ||
                    (new Date().getDay() === 0 && day.key === 'sun');

    return (
      <View
        key={day.key}
        style={[
          styles.dayRow,
          { backgroundColor: isToday ? theme.primaryLight : theme.backgroundSecondary },
          isToday && styles.todayRow,
        ]}
      >
        <View style={styles.dayInfo}>
          <Text
            style={[
              styles.dayLabel,
              { color: isToday ? theme.primary : theme.text },
              isToday && styles.todayText,
            ]}
          >
            {day.fullLabel}
          </Text>
          {isToday && (
            <View style={[styles.todayBadge, { backgroundColor: theme.primary }]}>
              <Text style={styles.todayBadgeText}>Сегодня</Text>
            </View>
          )}
        </View>

        <View style={styles.scheduleInfo}>
          {schedule.isWorkDay ? (
            <View style={styles.timeContainer}>
              <Ionicons name="time-outline" size={16} color={theme.textSecondary} />
              <Text style={[styles.timeText, { color: theme.text }]}>
                {schedule.start} — {schedule.end}
              </Text>
            </View>
          ) : (
            <Text style={[styles.dayOffText, { color: theme.textTertiary }]}>
              Выходной
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Расписание</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          График работы
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.scheduleCard, { backgroundColor: theme.backgroundSecondary }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="calendar-outline" size={24} color={theme.primary} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              Рабочая неделя
            </Text>
          </View>

          <View style={styles.daysList}>
            {DAYS_OF_WEEK.map(renderDayRow)}
          </View>
        </View>

        <View style={[styles.infoCard, { backgroundColor: theme.backgroundSecondary }]}>
          <Ionicons name="information-circle-outline" size={20} color={theme.textSecondary} />
          <Text style={[styles.infoText, { color: theme.textSecondary }]}>
            Обеденный перерыв: 13:00 — 14:00
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scheduleCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  daysList: {
    gap: 8,
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  todayRow: {
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  dayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  todayText: {
    fontWeight: '600',
  },
  todayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  todayBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  scheduleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dayOffText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 14,
    flex: 1,
  },
});

export default ScheduleScreen;
