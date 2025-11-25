import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  Dimensions,
  Animated
} from 'react-native';
import { Event } from '../types/calendar.types';
import { useTheme } from '@shared/hooks/useTheme';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';

interface DayEventsSheetProps {
  visible: boolean;
  date: Date | null;
  events: Event[];
  onEventPress: (event: Event) => void;
  onClose: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const DayEventsSheet: React.FC<DayEventsSheetProps> = ({
  visible,
  date,
  events,
  onEventPress,
  onClose,
}) => {
  const { theme } = useTheme();
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 90,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, overlayOpacity, slideAnim]);

  if (!date) {
    return null;
  }

  const formatEventTime = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    return `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.modalOverlay, { opacity: overlayOpacity }]}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.container,
                {
                  backgroundColor: theme.backgroundSecondary,
                  transform: [{ translateY: slideAnim }],
                }
              ]}
            >
              {/* Handle bar */}
              <View style={styles.handleBar}>
                <View style={[styles.handle, { backgroundColor: theme.border }]} />
              </View>

              {/* Header */}
              <View style={styles.header}>
                <View>
                  <Text style={[styles.headerTitle, { color: theme.text }]}>
                    {format(date, 'd MMMM yyyy', { locale: ru })}
                  </Text>
                  <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
                    {events.length} {events.length === 1 ? 'событие' : 'событий'}
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={24} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Events List */}
              <ScrollView
                style={styles.eventsList}
                contentContainerStyle={styles.eventsListContent}
                showsVerticalScrollIndicator={false}
              >
                {events.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                      Нет событий на эту дату
                    </Text>
                  </View>
                ) : (
                  events.map((event) => (
                    <TouchableOpacity
                      key={event.id}
                      style={[styles.eventItem, { backgroundColor: theme.card }]}
                      onPress={() => onEventPress(event)}
                      activeOpacity={0.7}
                    >
                        <View style={[styles.eventColorBar, { backgroundColor: event.color }]} />
                        <View style={styles.eventContent}>
                          <Text style={[styles.eventTitle, { color: theme.text }]} numberOfLines={1}>
                            {event.title}
                          </Text>
                          {!event.all_day && (
                            <Text style={[styles.eventTime, { color: theme.textSecondary }]}>
                              {formatEventTime(event.start_time, event.end_time)}
                            </Text>
                          )}
                          {event.location && (
                            <View style={styles.locationRow}>
                              <Ionicons name="location-outline" size={14} color={theme.textTertiary} />
                              <Text style={[styles.eventLocation, { color: theme.textTertiary }]} numberOfLines={1}>
                                {event.location}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.6,
  },
  handleBar: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  eventsList: {
    flexShrink: 1,
  },
  eventsListContent: {
    paddingBottom: 40,
    paddingTop: 4,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  eventColorBar: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    marginRight: 12,
  },
  eventContent: {
    flex: 1,
    gap: 4,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  eventTime: {
    fontSize: 14,
    fontWeight: '500',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventLocation: {
    fontSize: 13,
    flex: 1,
  },
  emptyContainer: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
});
