import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { format, isToday, isSameDay, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { areSameDay } from '../../utils/calendarHelpers';
import { Event } from '../../types/calendar.types';

const SWIPE_THRESHOLD = 50;
const VELOCITY_THRESHOLD = 500;

interface WeekDayStripProps {
  weekDays: Date[];
  selectedDate: Date | null;
  events?: Event[];
  onDayPress: (date: Date) => void;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

export const WeekDayStrip: React.FC<WeekDayStripProps> = ({
  weekDays,
  selectedDate,
  events = [],
  onDayPress,
  onSwipeLeft,
  onSwipeRight,
}) => {
  const { theme } = useTheme();
  const translateX = useSharedValue(0);

  // Check if a date is selected
  const isDateSelected = useCallback(
    (date: Date): boolean => {
      if (!selectedDate) return false;
      return areSameDay(date, selectedDate);
    },
    [selectedDate]
  );

  // Get events for a specific date
  const getEventsForDate = useCallback(
    (date: Date): Event[] => {
      return events.filter((event) => {
        const eventDate = parseISO(event.start_time);
        return isSameDay(eventDate, date);
      });
    },
    [events]
  );

  // Swipe gesture handler
  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-10, 10])
        .failOffsetY([-20, 20])
        .onUpdate((event) => {
          'worklet';
          translateX.value = event.translationX * 0.3; // Damped movement
        })
        .onEnd((event) => {
          'worklet';
          const shouldSwipe =
            Math.abs(event.translationX) > SWIPE_THRESHOLD ||
            Math.abs(event.velocityX) > VELOCITY_THRESHOLD;

          if (shouldSwipe) {
            if (event.translationX > 0) {
              runOnJS(onSwipeRight)();
            } else {
              runOnJS(onSwipeLeft)();
            }
          }

          translateX.value = withTiming(0, { duration: 200 });
        }),
    [onSwipeLeft, onSwipeRight]
  );

  // Animated style for the strip
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
      <View style={styles.rowContainer}>
        {/* Left Arrow */}
        <TouchableOpacity
          style={styles.arrowButton}
          onPress={onSwipeRight}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={theme.textSecondary} />
        </TouchableOpacity>

        {/* Week Days */}
        <GestureDetector gesture={swipeGesture}>
          <Animated.View style={[styles.weekContainer, animatedStyle]}>
            {weekDays.map((date) => {
              const isSelected = isDateSelected(date);
              const isTodayDate = isToday(date);
              const dayEvents = getEventsForDate(date);
              const dayOfWeek = format(date, 'EEEEEE', { locale: ru });
              const dayNumber = format(date, 'd');

              // Get unique colors from events (max 3 dots)
              const eventColors = [...new Set(dayEvents.map(e => e.color))].slice(0, 3);

              return (
                <TouchableOpacity
                  key={date.toISOString()}
                  style={styles.dayContainer}
                  onPress={() => onDayPress(date)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dayOfWeek,
                      { color: isSelected ? theme.primary : theme.textSecondary },
                    ]}
                  >
                    {dayOfWeek}
                  </Text>
                  <View
                    style={[
                      styles.dayNumberContainer,
                      isSelected && { backgroundColor: theme.primary },
                      isTodayDate && !isSelected && { borderColor: theme.primary, borderWidth: 2 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayNumber,
                        { color: isSelected ? '#FFFFFF' : isTodayDate ? theme.primary : theme.text },
                        isSelected && styles.dayNumberSelected,
                      ]}
                    >
                      {dayNumber}
                    </Text>
                  </View>
                  {/* Event indicator dots with event colors */}
                  <View style={styles.dotContainer}>
                    {eventColors.map((color, index) => (
                      <View
                        key={index}
                        style={[
                          styles.eventDot,
                          { backgroundColor: color },
                        ]}
                      />
                    ))}
                  </View>
                </TouchableOpacity>
              );
            })}
          </Animated.View>
        </GestureDetector>

        {/* Right Arrow */}
        <TouchableOpacity
          style={styles.arrowButton}
          onPress={onSwipeLeft}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-forward" size={24} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrowButton: {
    width: 32,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  dayContainer: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  dayOfWeek: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
    marginBottom: 6,
  },
  dayNumberContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '500',
  },
  dayNumberSelected: {
    fontWeight: '600',
  },
  dotContainer: {
    height: 6,
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  eventDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
});
