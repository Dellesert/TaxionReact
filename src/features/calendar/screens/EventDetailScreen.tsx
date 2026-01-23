import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { useNotification } from '@shared/contexts/NotificationContext';
import { useActionModal } from '@shared/contexts/ActionModalContext';
import { useAuthStore } from '@shared/store/authStore';
import { Event, EventParticipantStatus } from '../types/calendar.types';
import * as calendarApi from '../api/calendar.api';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Avatar } from '@shared/components/common/Avatar';
import { UserProfileModal } from '@shared/components/common/UserProfileModal';
import { ActionMenu } from '@shared/components/common/ActionMenu';
import { getOrCreateDirectChat } from '@/features/chat/api/chat.api';
import CreateEventModal from '../components/modals/CreateEventModal';

type CalendarStackParamList = {
  CalendarMain: undefined;
  EventDetail: { eventId: number; fromChat?: boolean };
};

type EventDetailScreenRouteProp = RouteProp<CalendarStackParamList, 'EventDetail'>;

interface ParticipantGroupProps {
  participants: any[];
  title: string;
  icon: string;
  color: string;
  defaultExpanded: boolean;
  initialPreview: number;
  loadMoreCount: number;
  theme: any;
  onUserPress: (userId: number) => void;
}

const ParticipantGroup: React.FC<ParticipantGroupProps> = ({
  participants: groupParticipants,
  title,
  icon,
  color,
  defaultExpanded,
  initialPreview,
  loadMoreCount,
  theme,
  onUserPress,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);
  const [visibleCount, setVisibleCount] = React.useState(initialPreview);

  if (groupParticipants.length === 0) return null;

  const displayParticipants = isExpanded
    ? groupParticipants.slice(0, visibleCount)
    : [];
  const hasMore = visibleCount < groupParticipants.length;
  const remainingCount = groupParticipants.length - visibleCount;

  const handleLoadMore = () => {
    setVisibleCount(prev => Math.min(prev + loadMoreCount, groupParticipants.length));
  };

  const handleCollapse = () => {
    setVisibleCount(initialPreview);
  };

  const showCollapseButton = isExpanded && visibleCount > initialPreview;

  return (
    <View style={styles.participantGroup}>
      <TouchableOpacity
        style={styles.participantGroupHeader}
        onPress={() => {
          if (isExpanded) {
            setVisibleCount(initialPreview);
          }
          setIsExpanded(!isExpanded);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.participantGroupTitleRow}>
          <Ionicons name={icon as any} size={18} color={color} />
          <Text style={[styles.participantGroupTitle, { color: theme.text }]}>
            {title}
          </Text>
          <View style={[styles.participantCountBadge, { backgroundColor: color + '20' }]}>
            <Text style={[styles.participantCountText, { color }]}>
              {groupParticipants.length}
            </Text>
          </View>
        </View>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={theme.textSecondary}
        />
      </TouchableOpacity>

      {isExpanded && (
        <>
          <View style={styles.participantGrid}>
            {displayParticipants.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[styles.participantItem, { backgroundColor: theme.backgroundSecondary }]}
                onPress={() => p.user && onUserPress(p.user.id)}
                activeOpacity={0.7}
              >
                <Avatar name={p.user?.name || 'User'} imageUrl={p.user?.avatar} size={32} />
                <Text
                  style={[styles.participantName, { color: theme.text }]}
                  numberOfLines={1}
                >
                  {p.user?.name || `User #${p.user_id}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {hasMore && (
            <TouchableOpacity
              style={[styles.showMoreButton, { borderColor: theme.border }]}
              onPress={handleLoadMore}
            >
              <Text style={[styles.showMoreText, { color: theme.primary }]}>
                Показать ещё {Math.min(loadMoreCount, remainingCount)} из {remainingCount}
              </Text>
              <Ionicons
                name="chevron-down"
                size={16}
                color={theme.primary}
              />
            </TouchableOpacity>
          )}
          {showCollapseButton && (
            <TouchableOpacity
              style={[styles.showMoreButton, { borderColor: theme.border, marginTop: 4 }]}
              onPress={handleCollapse}
            >
              <Text style={[styles.showMoreText, { color: theme.textSecondary }]}>
                Свернуть
              </Text>
              <Ionicons
                name="chevron-up"
                size={16}
                color={theme.textSecondary}
              />
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
};

// Skeleton component for loading state
const EventDetailSkeleton: React.FC = () => {
  const { theme } = useTheme();

  return (
    <View style={[styles.skeletonContainer, { backgroundColor: theme.background }]}>
      <View style={[styles.skeletonTitle, { backgroundColor: theme.backgroundSecondary }]} />
      <View style={[styles.skeletonCard, { backgroundColor: theme.backgroundSecondary }]} />
      <View style={[styles.skeletonCard, { backgroundColor: theme.backgroundSecondary }]} />
      <View style={[styles.skeletonDescription, { backgroundColor: theme.backgroundSecondary }]} />
    </View>
  );
};

const EventDetailScreen: React.FC = () => {
  const { theme } = useTheme();
  const { showError } = useNotification();
  const { showConfirm } = useActionModal();
  const { user } = useAuthStore();
  const navigation = useNavigation();
  const route = useRoute<EventDetailScreenRouteProp>();
  const insets = useSafeAreaInsets();

  const { eventId, fromChat } = route.params;

  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);

  // Fade animation for content
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Load event details
  useEffect(() => {
    const loadEventDetails = async () => {
      try {
        setIsLoading(true);
        const fullEvent = await calendarApi.getEvent(eventId);
        setEvent(fullEvent);
      } catch (error) {
        console.error('Failed to load event details:', error);
        showError('Не удалось загрузить событие');
      } finally {
        setIsLoading(false);
      }
    };

    loadEventDetails();
  }, [eventId]);

  // Fade in content when loaded
  useEffect(() => {
    if (!isLoading && event) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [isLoading, event]);

  // Setup header for chat mode
  useLayoutEffect(() => {
    if (fromChat && event) {
      const hasActions = canManage;
      navigation.setOptions({
        headerTitle: () => (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: '600', color: theme.text }}>Событие</Text>
          </View>
        ),
        headerRight: hasActions ? () => (
          <TouchableOpacity
            onPress={() => setShowActionMenu(true)}
            style={{ padding: 4, marginRight: 8 }}
          >
            <Ionicons name="ellipsis-horizontal" size={24} color={theme.primary} />
          </TouchableOpacity>
        ) : undefined,
      });
    }
  }, [fromChat, event, theme]);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.card }]} edges={['top']}>
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          {!fromChat && (
            <View style={[styles.headerBar, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
              <View style={styles.headerLeft}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                  <Ionicons name="close" size={24} color={theme.primary} />
                </TouchableOpacity>
              </View>
              <View style={styles.headerCenter}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Событие</Text>
              </View>
              <View style={styles.headerRight} />
            </View>
          )}
          <EventDetailSkeleton />
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.card }]} edges={['top']}>
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          <View style={[styles.headerBar, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Ionicons name="close" size={24} color={theme.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.headerCenter}>
              <Text style={[styles.headerTitle, { color: theme.text }]}>Событие</Text>
            </View>
            <View style={styles.headerRight} />
          </View>
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: theme.textSecondary }]}>
              Событие не найдено
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const myParticipation = user && event.participants ? event.participants.find(p => p.user_id === user.id) : null;
  const isCreator = user && event.created_by === user.id;
  const canManage = isCreator || (user && (user.role === 'admin' || user.role === 'super_admin'));
  const isScheduleEvent = event.type === 'schedule';
  const isAbsenceEvent = event.type === 'absence';

  const getEventIcon = () => {
    switch (event.type) {
      case 'meeting':
        return 'people';
      case 'deadline':
        return 'flag';
      case 'personal':
        return 'person';
      case 'schedule':
        return 'calendar';
      case 'absence':
        return 'airplane'; // or 'bed' for sick leave, but we use a generic icon
      default:
        return 'calendar';
    }
  };

  const getEventTypeLabel = () => {
    switch (event.type) {
      case 'meeting':
        return 'Встречи/совещания';
      case 'deadline':
        return 'Дедлайны/крайние сроки';
      case 'personal':
        return 'Личные события';
      case 'schedule':
        return 'График работы';
      case 'absence':
        // For absence events, use the title which contains the absence type name
        return event.title;
      default:
        return 'Событие';
    }
  };

  const handleUpdateStatus = async (status: EventParticipantStatus) => {
    if (!myParticipation) return;

    try {
      setIsUpdatingStatus(true);
      await calendarApi.updateParticipantStatus(event.id, { status });
      // Refresh event data
      const fullEvent = await calendarApi.getEvent(event.id);
      setEvent(fullEvent);
    } catch (error) {
      console.error('Failed to update status:', error);
      showError('Не удалось обновить статус');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleUserPress = (userId: number) => {
    setSelectedUserId(userId);
    setShowProfileModal(true);
  };

  const handleDelete = async () => {
    showConfirm(
      'Удалить событие?',
      'Вы уверены, что хотите удалить это событие?',
      async () => {
        try {
          setIsDeleting(true);
          await calendarApi.deleteEvent(event.id);
          navigation.goBack();
        } catch (error) {
          console.error('Failed to delete event:', error);
          showError('Не удалось удалить событие');
        } finally {
          setIsDeleting(false);
        }
      },
      undefined,
      { confirmText: 'Удалить', cancelText: 'Отмена', destructive: true }
    );
  };

  const formatDateRange = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);

    // Check if same day
    const isSameDay =
      start.getFullYear() === end.getFullYear() &&
      start.getMonth() === end.getMonth() &&
      start.getDate() === end.getDate();

    if (isSameDay) {
      // Same day: "29 декабря 2025, 17:00–20:00"
      const dateStr = format(start, 'd MMMM yyyy', { locale: ru });
      const startTimeStr = format(start, 'HH:mm', { locale: ru });
      const endTimeStr = format(end, 'HH:mm', { locale: ru });
      return { singleLine: `${dateStr}, ${startTimeStr}–${endTimeStr}` };
    } else {
      // Different days: show both dates separately
      return {
        start: format(start, 'd MMMM yyyy, HH:mm', { locale: ru }),
        end: format(end, 'd MMMM yyyy, HH:mm', { locale: ru }),
      };
    }
  };

  // Group participants by status
  const participants = event.participants || [];
  const acceptedParticipants = participants.filter(p => p.status === 'accepted');
  const pendingParticipants = participants.filter(p => p.status === 'pending');
  const declinedParticipants = participants.filter(p => p.status === 'declined');
  const maybeParticipants = participants.filter(p => p.status === 'maybe');

  const INITIAL_PREVIEW = 3;
  const LOAD_MORE_COUNT = 10;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.card }]} edges={['top']}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header with centered title and action menu */}
        {!fromChat && (
          <View style={[styles.headerBar, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Ionicons name="close" size={24} color={theme.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.headerCenter}>
              <Text style={[styles.headerTitle, { color: theme.text }]}>
                Событие
              </Text>
            </View>

            <View style={styles.headerRight}>
              {canManage && !isScheduleEvent && !isAbsenceEvent && (
                <TouchableOpacity
                  onPress={() => setShowActionMenu(true)}
                  style={styles.actionMenuButton}
                >
                  <Ionicons name="ellipsis-horizontal" size={24} color={theme.primary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Content */}
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <ScrollView
            style={styles.content}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 62 }]}
            showsVerticalScrollIndicator={false}
          >
            {/* Event Title */}
            <View style={[styles.section, { borderBottomWidth: 0 }]}>
              <Text style={[styles.eventTitle, { color: theme.text }]}>{event.title}</Text>

              {/* Response buttons for participants (not for personal or absence events) */}
              {myParticipation && event.type !== 'personal' && !isAbsenceEvent && (
                <View style={styles.responseSection}>
                  <Text style={[styles.responseSectionLabel, { color: theme.textSecondary }]}>
                    {isCreator ? 'Организатор' : 'Ваш ответ'}
                  </Text>
                  {!isCreator && (
                  <View style={styles.responseButtons}>
                    <TouchableOpacity
                      style={[
                        styles.responseButton,
                        { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
                        myParticipation.status === 'accepted' && [
                          styles.responseButtonActive,
                          { backgroundColor: '#10B981', borderColor: '#10B981' },
                        ],
                      ]}
                      onPress={() => handleUpdateStatus('accepted')}
                      disabled={isUpdatingStatus}
                    >
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color={myParticipation.status === 'accepted' ? '#FFFFFF' : '#10B981'}
                      />
                      <Text
                        style={[
                          styles.responseButtonText,
                          { color: myParticipation.status === 'accepted' ? '#FFFFFF' : theme.text },
                        ]}
                      >
                        Приду
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.responseButton,
                        { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
                        myParticipation.status === 'maybe' && [
                          styles.responseButtonActive,
                          { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
                        ],
                      ]}
                      onPress={() => handleUpdateStatus('maybe')}
                      disabled={isUpdatingStatus}
                    >
                      <Ionicons
                        name="help-circle"
                        size={22}
                        color={myParticipation.status === 'maybe' ? '#FFFFFF' : '#F59E0B'}
                      />
                      <Text
                        style={[
                          styles.responseButtonText,
                          { color: myParticipation.status === 'maybe' ? '#FFFFFF' : theme.text },
                        ]}
                      >
                        Возможно
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.responseButton,
                        { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
                        myParticipation.status === 'declined' && [
                          styles.responseButtonActive,
                          { backgroundColor: '#EF4444', borderColor: '#EF4444' },
                        ],
                      ]}
                      onPress={() => handleUpdateStatus('declined')}
                      disabled={isUpdatingStatus}
                    >
                      <Ionicons
                        name="close-circle"
                        size={22}
                        color={myParticipation.status === 'declined' ? '#FFFFFF' : '#EF4444'}
                      />
                      <Text
                        style={[
                          styles.responseButtonText,
                          { color: myParticipation.status === 'declined' ? '#FFFFFF' : theme.text },
                        ]}
                      >
                        Не приду
                      </Text>
                    </TouchableOpacity>
                  </View>
                  )}
                </View>
              )}

              {/* Participation stats (not for personal or absence events) */}
              {participants.length > 0 && event.type !== 'personal' && !isAbsenceEvent && (
                <View style={styles.statsContainer}>
                  {acceptedParticipants.length > 0 && (
                    <View style={[styles.statBadge, { backgroundColor: '#10B98120' }]}>
                      <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                      <Text style={[styles.statText, { color: '#10B981' }]}>
                        {acceptedParticipants.length}
                      </Text>
                    </View>
                  )}
                  {maybeParticipants.length > 0 && (
                    <View style={[styles.statBadge, { backgroundColor: '#F59E0B20' }]}>
                      <Ionicons name="help-circle" size={16} color="#F59E0B" />
                      <Text style={[styles.statText, { color: '#F59E0B' }]}>
                        {maybeParticipants.length}
                      </Text>
                    </View>
                  )}
                  {declinedParticipants.length > 0 && (
                    <View style={[styles.statBadge, { backgroundColor: '#EF444420' }]}>
                      <Ionicons name="close-circle" size={16} color="#EF4444" />
                      <Text style={[styles.statText, { color: '#EF4444' }]}>
                        {declinedParticipants.length}
                      </Text>
                    </View>
                  )}
                  {pendingParticipants.length > 0 && (
                    <View style={[styles.statBadge, { backgroundColor: theme.backgroundSecondary }]}>
                      <Ionicons name="time-outline" size={16} color={theme.textSecondary} />
                      <Text style={[styles.statText, { color: theme.textSecondary }]}>
                        {pendingParticipants.length}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Event Type Card */}
            <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={[styles.infoCardIcon, { backgroundColor: event.color + '20' }]}>
                <Ionicons name={getEventIcon() as any} size={22} color={event.color} />
              </View>
              <View style={styles.infoCardContent}>
                <Text style={[styles.infoCardLabel, { color: theme.textSecondary }]}>
                  {isAbsenceEvent ? 'Тип отсутствия' : 'Тип события'}
                </Text>
                <Text style={[styles.infoCardValue, { color: theme.text }]}>{getEventTypeLabel()}</Text>
              </View>
            </View>

            {/* Date & Time Card */}
            <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={[styles.infoCardIcon, { backgroundColor: event.color + '20' }]}>
                <Ionicons name="calendar-outline" size={22} color={event.color} />
              </View>
              <View style={styles.infoCardContent}>
                <Text style={[styles.infoCardLabel, { color: theme.textSecondary }]}>
                  {event.all_day ? 'Дата' : 'Дата и время'}
                </Text>
                {event.all_day ? (() => {
                  const start = new Date(event.start_time);
                  const end = new Date(event.end_time);
                  // Check if same day for all-day events
                  const isSameDay =
                    start.getFullYear() === end.getFullYear() &&
                    start.getMonth() === end.getMonth() &&
                    start.getDate() === end.getDate();

                  if (isSameDay) {
                    return (
                      <Text style={[styles.infoCardValue, { color: theme.text }]}>
                        {format(start, 'd MMMM yyyy', { locale: ru })}
                      </Text>
                    );
                  }
                  // Multi-day all-day event (like absence)
                  return (
                    <>
                      <Text style={[styles.infoCardValue, { color: theme.text }]}>
                        {format(start, 'd MMMM', { locale: ru })} — {format(end, 'd MMMM yyyy', { locale: ru })}
                      </Text>
                    </>
                  );
                })() : (() => {
                  const dateRange = formatDateRange(event.start_time, event.end_time);
                  if ('singleLine' in dateRange) {
                    return (
                      <Text style={[styles.infoCardValue, { color: theme.text }]}>
                        {dateRange.singleLine}
                      </Text>
                    );
                  }
                  return (
                    <>
                      <Text style={[styles.infoCardValue, { color: theme.text }]}>
                        {dateRange.start}
                      </Text>
                      <Text style={[styles.infoCardSubValue, { color: theme.textSecondary }]}>
                        до {dateRange.end}
                      </Text>
                    </>
                  );
                })()}
              </View>
            </View>

            {/* Location Card */}
            {event.location && (
              <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={[styles.infoCardIcon, { backgroundColor: '#3B82F6' + '20' }]}>
                  <Ionicons name="location-outline" size={22} color="#3B82F6" />
                </View>
                <View style={styles.infoCardContent}>
                  <Text style={[styles.infoCardLabel, { color: theme.textSecondary }]}>Место</Text>
                  <Text style={[styles.infoCardValue, { color: theme.text }]}>{event.location}</Text>
                </View>
              </View>
            )}

            {/* Description Card */}
            {event.description && (
              <View style={[styles.section, { borderBottomColor: theme.border }]}>
                <Text style={[styles.sectionTitleAlt, { color: theme.textSecondary }]}>Описание</Text>
                <Text style={[styles.descriptionText, { color: theme.text }]}>{event.description}</Text>
              </View>
            )}

            {/* Creator (not for personal, schedule or absence events) */}
            {event.creator && event.type !== 'personal' && !isScheduleEvent && !isAbsenceEvent && (
              <View style={[styles.section, { borderBottomColor: theme.border }]}>
                <TouchableOpacity
                  style={styles.creatorContainer}
                  onPress={() => handleUserPress(event.creator!.id)}
                  activeOpacity={0.7}
                >
                  <Avatar
                    name={isCreator ? 'Я' : event.creator.name}
                    imageUrl={event.creator.avatar}
                    size={40}
                  />
                  <View style={styles.creatorInfo}>
                    <Text style={[styles.creatorName, { color: theme.text }]}>
                      {isCreator ? 'Я' : event.creator.name}
                    </Text>
                    <Text style={[styles.creatorLabel, { color: theme.textSecondary }]}>
                      Организатор
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
            )}

            {/* Participants (not for personal or absence events) */}
            {participants.length > 0 && event.type !== 'personal' && !isAbsenceEvent && (
              <View style={[styles.section, { borderBottomColor: theme.border }]}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Участники</Text>

                <ParticipantGroup
                  participants={acceptedParticipants}
                  title="Принято"
                  icon="checkmark-circle"
                  color="#10B981"
                  defaultExpanded={true}
                  initialPreview={INITIAL_PREVIEW}
                  loadMoreCount={LOAD_MORE_COUNT}
                  theme={theme}
                  onUserPress={handleUserPress}
                />

                <ParticipantGroup
                  participants={maybeParticipants}
                  title="Возможно"
                  icon="help-circle"
                  color="#F59E0B"
                  defaultExpanded={false}
                  initialPreview={INITIAL_PREVIEW}
                  loadMoreCount={LOAD_MORE_COUNT}
                  theme={theme}
                  onUserPress={handleUserPress}
                />

                <ParticipantGroup
                  participants={pendingParticipants}
                  title="Ожидание"
                  icon="time-outline"
                  color="#6B7280"
                  defaultExpanded={false}
                  initialPreview={INITIAL_PREVIEW}
                  loadMoreCount={LOAD_MORE_COUNT}
                  theme={theme}
                  onUserPress={handleUserPress}
                />

                <ParticipantGroup
                  participants={declinedParticipants}
                  title="Отклонено"
                  icon="close-circle"
                  color="#EF4444"
                  defaultExpanded={false}
                  initialPreview={INITIAL_PREVIEW}
                  loadMoreCount={LOAD_MORE_COUNT}
                  theme={theme}
                  onUserPress={handleUserPress}
                />
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </View>

      {/* Edit Event Modal */}
      {showEditModal && (
        <CreateEventModal
          visible={showEditModal}
          onClose={() => setShowEditModal(false)}
          onEventCreated={async () => {
            setShowEditModal(false);
            // Reload event
            const fullEvent = await calendarApi.getEvent(event.id);
            setEvent(fullEvent);
          }}
          editEvent={event}
        />
      )}

      {/* User Profile Modal */}
      <UserProfileModal
        visible={showProfileModal}
        userId={selectedUserId}
        onClose={() => {
          setShowProfileModal(false);
          setSelectedUserId(null);
        }}
        onOpenChat={async (userId) => {
          try {
            const chat = await getOrCreateDirectChat(userId);
            setShowProfileModal(false);
            // Navigate to chat
            const rootNavigation = navigation.getParent();
            if (rootNavigation) {
              // @ts-ignore
              rootNavigation.navigate('Chats', {
                screen: 'Chat',
                params: { chatId: chat.id },
              });
            }
          } catch (error: any) {
            console.error('Error opening chat:', error);
            showError(error.message || 'Не удалось открыть чат');
          }
        }}
      />

      {/* Action Menu */}
      <ActionMenu
        visible={showActionMenu}
        onClose={() => setShowActionMenu(false)}
        items={[
          {
            key: 'edit',
            icon: 'create-outline',
            label: 'Редактировать',
            color: theme.text,
            onPress: () => setShowEditModal(true),
          },
          {
            key: 'delete',
            icon: 'trash-outline',
            label: 'Удалить',
            color: '#EF4444',
            onPress: handleDelete,
            disabled: isDeleting,
          },
        ]}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    minHeight: 56,
  },
  headerLeft: {
    width: 60,
    alignItems: 'flex-start',
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerRight: {
    width: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: 8,
  },
  actionMenuButton: {
    padding: 4,
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
    marginBottom: 16,
  },
  responseSection: {
    marginTop: 8,
  },
  responseSectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  responseButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  responseButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    minHeight: 48,
  },
  responseButtonActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  responseButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  statText: {
    fontSize: 14,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    flexGrow: 1,
  },
  section: {
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 14,
  },
  sectionTitleAlt: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  infoCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCardContent: {
    flex: 1,
    gap: 4,
  },
  infoCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoCardValue: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  infoCardSubValue: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  creatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  creatorInfo: {
    flex: 1,
  },
  creatorName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
  },
  creatorLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  participantGroup: {
    marginBottom: 12,
  },
  participantGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  participantGroupTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  participantGroupTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  participantCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantCountText: {
    fontSize: 12,
    fontWeight: '700',
  },
  participantGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 160,
    maxWidth: 220,
  },
  participantName: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 8,
    marginHorizontal: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  showMoreText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Skeleton styles
  skeletonContainer: {
    flex: 1,
    padding: 16,
    gap: 16,
  },
  skeletonTitle: {
    height: 32,
    width: '70%',
    borderRadius: 8,
  },
  skeletonCard: {
    height: 72,
    borderRadius: 12,
  },
  skeletonDescription: {
    height: 100,
    borderRadius: 12,
  },
  // Error state
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default EventDetailScreen;
