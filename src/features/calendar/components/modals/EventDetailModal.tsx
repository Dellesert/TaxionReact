import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { useNotification } from '@shared/contexts/NotificationContext';
import { FormattedText } from '@features/chat/components/common/FormattedText';
import { useActionModal } from '@shared/contexts/ActionModalContext';
import { useAuthStore } from '@shared/store/authStore';
import { Event, EventParticipantStatus } from '../../types/calendar.types';
import * as calendarApi from '../../api/calendar.api';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Avatar } from '@shared/components/common/Avatar';
import { UserProfileModal } from '@shared/components/common/UserProfileModal';
import { ActionMenu } from '@shared/components/common/ActionMenu';
import { getOrCreateDirectChat } from '@/features/chat/api/chat.api';
import CreateEventModal from './CreateEventModal';

interface EventDetailModalProps {
  visible: boolean;
  event: Event | null;
  onClose: () => void;
  onEventUpdated: () => void;
}

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

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  visible,
  event,
  onClose,
  onEventUpdated,
}) => {
  const { theme } = useTheme();
  const { showError } = useNotification();
  const { showConfirm } = useActionModal();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [localEvent, setLocalEvent] = useState<Event | null>(event);
  const [showActionMenu, setShowActionMenu] = useState(false);

  // Load full event details with participants when modal opens
  React.useEffect(() => {
    const loadEventDetails = async () => {
      if (!event) return;
      try {
        const fullEvent = await calendarApi.getEvent(event.id);
        setLocalEvent(fullEvent);
      } catch (error) {
        console.error('Failed to load event details:', error);
        setLocalEvent(event);
      }
    };

    loadEventDetails();
  }, [event?.id]);

  if (!localEvent) return null;

  const displayEvent = localEvent;
  const myParticipation = user && displayEvent.participants ? displayEvent.participants.find(p => p.user_id === user.id) : null;
  const isCreator = user && displayEvent.created_by === user.id;
  const canManage = isCreator || (user && (user.role === 'admin' || user.role === 'super_admin'));

  const isScheduleEvent = displayEvent.type === 'schedule';

  const getEventIcon = () => {
    switch (displayEvent.type) {
      case 'meeting':
        return 'people';
      case 'deadline':
        return 'flag';
      case 'personal':
        return 'person';
      case 'schedule':
        return 'calendar';
      default:
        return 'calendar';
    }
  };

  const getEventTypeLabel = () => {
    switch (displayEvent.type) {
      case 'meeting':
        return 'Встречи/совещания';
      case 'deadline':
        return 'Дедлайны/крайние сроки';
      case 'personal':
        return 'Личные события';
      case 'schedule':
        return 'График работы';
      default:
        return 'Событие';
    }
  };

  const handleUpdateStatus = async (status: EventParticipantStatus) => {
    if (!myParticipation) return;

    try {
      setIsUpdatingStatus(true);
      await calendarApi.updateParticipantStatus(displayEvent.id, { status });
      // Refresh event data
      const fullEvent = await calendarApi.getEvent(displayEvent.id);
      setLocalEvent(fullEvent);
      onEventUpdated();
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
    // Close modal first, then show confirm dialog
    onClose();
    // Small delay to allow modal to close before showing ActionSheet
    setTimeout(() => {
      showConfirm(
        'Удалить событие?',
        'Вы уверены, что хотите удалить это событие?',
        async () => {
          try {
            setIsDeleting(true);
            await calendarApi.deleteEvent(displayEvent.id);
            onEventUpdated();
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
    }, 300);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'd MMMM yyyy, HH:mm', { locale: ru });
  };

  // Group participants by status
  const participants = displayEvent.participants || [];
  const acceptedParticipants = participants.filter(p => p.status === 'accepted');
  const pendingParticipants = participants.filter(p => p.status === 'pending');
  const declinedParticipants = participants.filter(p => p.status === 'declined');
  const maybeParticipants = participants.filter(p => p.status === 'maybe');

  const INITIAL_PREVIEW = 3;
  const LOAD_MORE_COUNT = 10;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      transparent={false}
      presentationStyle="fullScreen"
    >
      <StatusBar barStyle="light-content" backgroundColor={displayEvent.color} />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header with centered title and action menu */}
        <View style={[styles.headerBar, { backgroundColor: theme.card, borderBottomColor: theme.border, paddingTop: insets.top }]}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <Ionicons name="close" size={24} color={theme.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              Событие
            </Text>
          </View>

          <View style={styles.headerRight}>
            {canManage && !isScheduleEvent && (
              <TouchableOpacity
                onPress={() => setShowActionMenu(true)}
                style={styles.actionMenuButton}
              >
                <Ionicons name="ellipsis-horizontal" size={24} color={theme.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Event Title */}
          <View style={[styles.section, { borderBottomWidth: 0 }]}>
            <Text style={[styles.eventTitle, { color: theme.text }]}>{displayEvent.title}</Text>

            {/* Response buttons for participants (not for personal events) */}
            {myParticipation && displayEvent.type !== 'personal' && (
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

            {/* Participation stats (not for personal events) */}
            {participants.length > 0 && displayEvent.type !== 'personal' && (
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
            <View style={[styles.infoCardIcon, { backgroundColor: displayEvent.color + '20' }]}>
              <Ionicons name={getEventIcon() as any} size={22} color={displayEvent.color} />
            </View>
            <View style={styles.infoCardContent}>
              <Text style={[styles.infoCardLabel, { color: theme.textSecondary }]}>Тип события</Text>
              <Text style={[styles.infoCardValue, { color: theme.text }]}>{getEventTypeLabel()}</Text>
            </View>
          </View>

          {/* Date & Time Card */}
          <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.infoCardIcon, { backgroundColor: displayEvent.color + '20' }]}>
              <Ionicons name="calendar-outline" size={22} color={displayEvent.color} />
            </View>
            <View style={styles.infoCardContent}>
              <Text style={[styles.infoCardLabel, { color: theme.textSecondary }]}>Дата и время</Text>
              {displayEvent.all_day ? (
                <Text style={[styles.infoCardValue, { color: theme.text }]}>
                  {format(new Date(displayEvent.start_time), 'd MMMM yyyy', { locale: ru })}
                </Text>
              ) : (
                <>
                  <Text style={[styles.infoCardValue, { color: theme.text }]}>
                    {formatDateTime(displayEvent.start_time)}
                  </Text>
                  <Text style={[styles.infoCardSubValue, { color: theme.textSecondary }]}>
                    до {formatDateTime(displayEvent.end_time)}
                  </Text>
                </>
              )}
            </View>
          </View>

          {/* Location Card */}
          {displayEvent.location && (
            <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={[styles.infoCardIcon, { backgroundColor: '#3B82F6' + '20' }]}>
                <Ionicons name="location-outline" size={22} color="#3B82F6" />
              </View>
              <View style={styles.infoCardContent}>
                <Text style={[styles.infoCardLabel, { color: theme.textSecondary }]}>Место</Text>
                <Text style={[styles.infoCardValue, { color: theme.text }]}>{displayEvent.location}</Text>
              </View>
            </View>
          )}

          {/* Description Card */}
          {displayEvent.description && (
            <View style={[styles.section, { borderBottomColor: theme.border }]}>
              <Text style={[styles.sectionTitleAlt, { color: theme.textSecondary }]}>Описание</Text>
              <FormattedText text={displayEvent.description} style={[styles.descriptionText, { color: theme.text }]} />
            </View>
          )}

          {/* Creator (not for personal or schedule events) */}
          {displayEvent.creator && displayEvent.type !== 'personal' && !isScheduleEvent && (
            <View style={[styles.section, { borderBottomColor: theme.border }]}>
              <TouchableOpacity
                style={styles.creatorContainer}
                onPress={() => handleUserPress(displayEvent.creator!.id)}
                activeOpacity={0.7}
              >
                <Avatar
                  name={isCreator ? 'Я' : displayEvent.creator.name}
                  imageUrl={displayEvent.creator.avatar}
                  size={40}
                />
                <View style={styles.creatorInfo}>
                  <Text style={[styles.creatorName, { color: theme.text }]}>
                    {isCreator ? 'Я' : displayEvent.creator.name}
                  </Text>
                  <Text style={[styles.creatorLabel, { color: theme.textSecondary }]}>
                    Организатор
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Participants (not for personal events) */}
          {participants.length > 0 && displayEvent.type !== 'personal' && (
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
      </View>

      {/* Edit Event Modal */}
      {showEditModal && (
        <CreateEventModal
          visible={showEditModal}
          onClose={() => setShowEditModal(false)}
          onEventCreated={() => {
            setShowEditModal(false);
            onEventUpdated();
          }}
          editEvent={displayEvent}
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
            onClose(); // Close event detail modal too
            // Navigate to chat - need to get root navigation
            const rootNavigation = navigation.getParent();
            if (rootNavigation) {
              // @ts-ignore
              rootNavigation.navigate('Chats', {
                screen: 'Chat',
                params: { chatId: chat.id },
              });
            }
          } catch (error: any) {
            console.error('❌ Error opening chat:', error);
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
    </Modal>
  );
};

const styles = StyleSheet.create({
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
});

export default EventDetailModal;
