import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';
import { useNotification } from '@contexts/NotificationContext';
import { useActionModal } from '@contexts/ActionModalContext';
import { useAuthStore } from '@store/authStore';
import { Event, EventParticipantStatus } from '../types/calendar.types';
import * as calendarApi from '../api/calendar.api';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Avatar } from '@components/common/Avatar';
import { UserProfileModal } from '@components/common/UserProfileModal';
import { getOrCreateDirectChat } from '@api/chat.api';
import CreateEventModal from './CreateEventModal';

interface EventDetailModalProps {
  visible: boolean;
  event: Event | null;
  onClose: () => void;
  onEventUpdated: () => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  visible,
  event,
  onClose,
  onEventUpdated,
}) => {
  const { theme, isDark } = useTheme();
  const { showError } = useNotification();
  const { showConfirm } = useActionModal();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAllAccepted, setShowAllAccepted] = useState(false);
  const [showAllMaybe, setShowAllMaybe] = useState(false);
  const [showAllPending, setShowAllPending] = useState(false);
  const [showAllDeclined, setShowAllDeclined] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  if (!event) return null;

  const myParticipation = user && event.participants ? event.participants.find(p => p.user_id === user.id) : null;
  const isCreator = user && event.created_by === user.id;
  const canManage = isCreator || (user && (user.role === 'admin' || user.role === 'super_admin'));

  const getEventIcon = () => {
    switch (event.type) {
      case 'meeting':
        return 'people';
      case 'deadline':
        return 'flag';
      case 'personal':
        return 'person';
      default:
        return 'calendar';
    }
  };

  const getStatusBadge = (status: EventParticipantStatus) => {
    switch (status) {
      case 'accepted':
        return { icon: 'checkmark-circle', color: '#10B981', label: 'Принято' };
      case 'declined':
        return { icon: 'close-circle', color: '#EF4444', label: 'Отклонено' };
      case 'maybe':
        return { icon: 'help-circle', color: '#F59E0B', label: 'Возможно' };
      case 'pending':
        return { icon: 'time', color: '#6B7280', label: 'Ожидание' };
    }
  };

  const handleUpdateStatus = async (status: EventParticipantStatus) => {
    if (!myParticipation) return;

    try {
      setIsUpdatingStatus(true);
      await calendarApi.updateParticipantStatus(event.id, { status });
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
            await calendarApi.deleteEvent(event.id);
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

  const statusBadge = myParticipation ? getStatusBadge(myParticipation.status) : null;

  // Group participants by status
  const participants = event.participants || [];
  const acceptedParticipants = participants.filter(p => p.status === 'accepted');
  const pendingParticipants = participants.filter(p => p.status === 'pending');
  const declinedParticipants = participants.filter(p => p.status === 'declined');
  const maybeParticipants = participants.filter(p => p.status === 'maybe');

  const MAX_PREVIEW = 5;

  const renderParticipantGroup = (
    groupParticipants: typeof participants,
    title: string,
    color: string,
    showAll: boolean,
    setShowAll: (show: boolean) => void
  ) => {
    if (groupParticipants.length === 0) return null;

    const displayParticipants = showAll ? groupParticipants : groupParticipants.slice(0, MAX_PREVIEW);
    const hasMore = groupParticipants.length > MAX_PREVIEW;

    return (
      <View style={styles.participantGroup}>
        <Text style={[styles.participantGroupTitle, { color }]}>
          {title} ({groupParticipants.length})
        </Text>
        {displayParticipants.map((p) => (
          <View key={p.id} style={styles.participantItem}>
            <Avatar name={p.user?.name || 'User'} imageUrl={p.user?.avatar} size={32} />
            <Text style={[styles.participantName, { color: theme.text }]}>
              {p.user?.name || `User #${p.user_id}`}
            </Text>
          </View>
        ))}
        {hasMore && (
          <TouchableOpacity
            style={[styles.showMoreButton, { borderColor: theme.border }]}
            onPress={() => setShowAll(!showAll)}
          >
            <Text style={[styles.showMoreText, { color: theme.primary }]}>
              {showAll ? 'Скрыть' : `Показать ещё ${groupParticipants.length - MAX_PREVIEW}`}
            </Text>
            <Ionicons
              name={showAll ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={theme.primary}
            />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      transparent={false}
      presentationStyle="fullScreen"
    >
      <StatusBar barStyle="light-content" backgroundColor={event.color} />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header with color extending to safe area */}
        <View style={[styles.headerWrapper, { backgroundColor: event.color }]}>
          <View style={{ height: insets.top }} />
          <View style={styles.header}>
            <View style={styles.headerTopBar}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={28} color="#FFFFFF" />
              </TouchableOpacity>
              {canManage && (
                <View style={styles.headerActions}>
                  <TouchableOpacity onPress={() => setShowEditModal(true)} style={styles.editButton}>
                    <Ionicons name="create-outline" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleDelete} style={styles.deleteButton} disabled={isDeleting}>
                    {isDeleting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons name="trash-outline" size={24} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
            <View style={styles.headerContent}>
              <View style={styles.iconContainer}>
                <Ionicons name={getEventIcon() as any} size={32} color="#FFFFFF" />
              </View>
              <Text style={styles.headerTitle}>{event.title}</Text>

              {/* Response buttons for participants */}
              {myParticipation && !isCreator && (
                <View style={styles.headerResponseButtons}>
                  <View style={styles.headerResponseButtonWrapper}>
                    <TouchableOpacity
                      style={[
                        styles.headerResponseButton,
                        myParticipation.status === 'accepted' && styles.headerResponseButtonActive,
                      ]}
                      onPress={() => handleUpdateStatus('accepted')}
                      disabled={isUpdatingStatus}
                    >
                      <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerResponseButtonLabel}>Приду</Text>
                  </View>

                  <View style={styles.headerResponseButtonWrapper}>
                    <TouchableOpacity
                      style={[
                        styles.headerResponseButton,
                        myParticipation.status === 'maybe' && styles.headerResponseButtonActive,
                      ]}
                      onPress={() => handleUpdateStatus('maybe')}
                      disabled={isUpdatingStatus}
                    >
                      <Ionicons name="help-circle" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerResponseButtonLabel}>Возможно</Text>
                  </View>

                  <View style={styles.headerResponseButtonWrapper}>
                    <TouchableOpacity
                      style={[
                        styles.headerResponseButton,
                        myParticipation.status === 'declined' && styles.headerResponseButtonActive,
                      ]}
                      onPress={() => handleUpdateStatus('declined')}
                      disabled={isUpdatingStatus}
                    >
                      <Ionicons name="close-circle" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerResponseButtonLabel}>Не приду</Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={{ paddingBottom: insets.bottom }}
          showsVerticalScrollIndicator={false}>
          {/* Date & Time */}
          <View style={[styles.section, { borderBottomColor: theme.border }]}>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={20} color={theme.textSecondary} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Дата и время</Text>
                {event.all_day ? (
                  <Text style={[styles.infoValue, { color: theme.text }]}>
                    {format(new Date(event.start_time), 'd MMMM yyyy', { locale: ru })} - Весь день
                  </Text>
                ) : (
                  <>
                    <Text style={[styles.infoValue, { color: theme.text }]}>
                      {formatDateTime(event.start_time)}
                    </Text>
                    <Text style={[styles.infoValue, { color: theme.text }]}>
                      до {formatDateTime(event.end_time)}
                    </Text>
                  </>
                )}
              </View>
            </View>
          </View>

          {/* Location */}
          {event.location && (
            <View style={[styles.section, { borderBottomColor: theme.border }]}>
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={20} color={theme.textSecondary} />
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Место</Text>
                  <Text style={[styles.infoValue, { color: theme.text }]}>{event.location}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Description */}
          {event.description && (
            <View style={[styles.section, { borderBottomColor: theme.border }]}>
              <View style={styles.infoRow}>
                <Ionicons name="document-text-outline" size={20} color={theme.textSecondary} />
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Описание</Text>
                  <Text style={[styles.infoValue, { color: theme.text }]}>{event.description}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Creator */}
          {event.creator && (
            <View style={[styles.section, { borderBottomColor: theme.border }]}>
              <TouchableOpacity
                style={styles.creatorContainer}
                onPress={() => handleUserPress(event.creator!.id)}
                activeOpacity={0.7}
              >
                <Avatar
                  name={event.creator.name}
                  imageUrl={event.creator.avatar}
                  size={32}
                />
                <View style={styles.creatorInfo}>
                  <Text style={[styles.creatorName, { color: theme.text }]}>
                    {event.creator.name}
                  </Text>
                  <Text style={[styles.creatorLabel, { color: theme.textSecondary }]}>
                    Организатор
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Participants */}
          {participants.length > 0 && (
            <View style={[styles.section, { borderBottomColor: theme.border }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Участники</Text>

              {renderParticipantGroup(
                acceptedParticipants,
                '✓ Принято',
                '#10B981',
                showAllAccepted,
                setShowAllAccepted
              )}

              {renderParticipantGroup(
                maybeParticipants,
                '? Возможно',
                '#F59E0B',
                showAllMaybe,
                setShowAllMaybe
              )}

              {renderParticipantGroup(
                pendingParticipants,
                '⏱ Ожидание',
                '#6B7280',
                showAllPending,
                setShowAllPending
              )}

              {renderParticipantGroup(
                declinedParticipants,
                '✕ Отклонено',
                '#EF4444',
                showAllDeclined,
                setShowAllDeclined
              )}
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
            console.log('💬 Opening chat with user:', userId);
            const chat = await getOrCreateDirectChat(userId);
            console.log('✅ Got chat:', chat.id);
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
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerWrapper: {
    // Wrapper extends to safe area
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    alignItems: 'center',
    marginTop: 8,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  headerResponseButtons: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
  },
  headerResponseButtonWrapper: {
    alignItems: 'center',
    gap: 6,
  },
  headerResponseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerResponseButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  headerResponseButtonLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    lineHeight: 22,
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
    marginBottom: 2,
  },
  creatorLabel: {
    fontSize: 12,
    fontWeight: '400',
  },
  participantGroup: {
    marginBottom: 20,
  },
  participantGroupTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  participantName: {
    fontSize: 15,
    fontWeight: '500',
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default EventDetailModal;
