import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';
import { useAuthStore } from '@store/authStore';
import { Event, EventParticipantStatus } from '../../types/calendar.types';
import * as calendarApi from '@api/calendar.api';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Avatar } from '@components/common/Avatar';

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
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
      Alert.alert('Успех', 'Статус участия обновлён');
      onEventUpdated();
    } catch (error) {
      console.error('Failed to update status:', error);
      Alert.alert('Ошибка', 'Не удалось обновить статус');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (Platform.OS === 'web') {
      // Use native browser confirm dialog on web
      const confirmed = window.confirm('Вы уверены, что хотите удалить это событие?');
      if (!confirmed) return;

      try {
        setIsDeleting(true);
        await calendarApi.deleteEvent(event.id);
        window.alert('Событие удалено');
        onEventUpdated();
        onClose();
      } catch (error) {
        console.error('Failed to delete event:', error);
        window.alert('Не удалось удалить событие');
      } finally {
        setIsDeleting(false);
      }
    } else {
      // Use React Native Alert on mobile
      Alert.alert(
        'Удалить событие?',
        'Вы уверены, что хотите удалить это событие?',
        [
          { text: 'Отмена', style: 'cancel' },
          {
            text: 'Удалить',
            style: 'destructive',
            onPress: async () => {
              try {
                setIsDeleting(true);
                await calendarApi.deleteEvent(event.id);
                Alert.alert('Успех', 'Событие удалено');
                onEventUpdated();
                onClose();
              } catch (error) {
                console.error('Failed to delete event:', error);
                Alert.alert('Ошибка', 'Не удалось удалить событие');
              } finally {
                setIsDeleting(false);
              }
            },
          },
        ]
      );
    }
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      transparent={false}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: event.color }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <View style={styles.iconContainer}>
              <Ionicons name={getEventIcon() as any} size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.headerTitle}>{event.title}</Text>
            {statusBadge && (
              <View style={[styles.statusBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Ionicons name={statusBadge.icon as any} size={16} color="#FFFFFF" />
                <Text style={styles.statusBadgeText}>{statusBadge.label}</Text>
              </View>
            )}
          </View>
          {canManage && (
            <TouchableOpacity onPress={handleDelete} style={styles.deleteButton} disabled={isDeleting}>
              {isDeleting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="trash-outline" size={24} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={20} color={theme.textSecondary} />
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Организатор</Text>
                  <Text style={[styles.infoValue, { color: theme.text }]}>{event.creator.name}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Participants */}
          {participants.length > 0 && (
            <View style={[styles.section, { borderBottomColor: theme.border }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Участники</Text>

              {acceptedParticipants.length > 0 && (
                <View style={styles.participantGroup}>
                  <Text style={[styles.participantGroupTitle, { color: '#10B981' }]}>
                    ✓ Принято ({acceptedParticipants.length})
                  </Text>
                  {acceptedParticipants.map((p) => (
                    <View key={p.id} style={styles.participantItem}>
                      <Avatar name={p.user?.name || 'User'} size={32} />
                      <Text style={[styles.participantName, { color: theme.text }]}>
                        {p.user?.name || `User #${p.user_id}`}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {maybeParticipants.length > 0 && (
                <View style={styles.participantGroup}>
                  <Text style={[styles.participantGroupTitle, { color: '#F59E0B' }]}>
                    ? Возможно ({maybeParticipants.length})
                  </Text>
                  {maybeParticipants.map((p) => (
                    <View key={p.id} style={styles.participantItem}>
                      <Avatar name={p.user?.name || 'User'} size={32} />
                      <Text style={[styles.participantName, { color: theme.text }]}>
                        {p.user?.name || `User #${p.user_id}`}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {pendingParticipants.length > 0 && (
                <View style={styles.participantGroup}>
                  <Text style={[styles.participantGroupTitle, { color: '#6B7280' }]}>
                    ⏱ Ожидание ({pendingParticipants.length})
                  </Text>
                  {pendingParticipants.map((p) => (
                    <View key={p.id} style={styles.participantItem}>
                      <Avatar name={p.user?.name || 'User'} size={32} />
                      <Text style={[styles.participantName, { color: theme.text }]}>
                        {p.user?.name || `User #${p.user_id}`}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {declinedParticipants.length > 0 && (
                <View style={styles.participantGroup}>
                  <Text style={[styles.participantGroupTitle, { color: '#EF4444' }]}>
                    ✕ Отклонено ({declinedParticipants.length})
                  </Text>
                  {declinedParticipants.map((p) => (
                    <View key={p.id} style={styles.participantItem}>
                      <Avatar name={p.user?.name || 'User'} size={32} />
                      <Text style={[styles.participantName, { color: theme.text }]}>
                        {p.user?.name || `User #${p.user_id}`}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Response Actions - if user is participant but not creator */}
          {myParticipation && !isCreator && (
            <View style={[styles.section, { borderBottomColor: 'transparent' }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Ваш ответ</Text>
              <View style={styles.responseButtons}>
                <TouchableOpacity
                  style={[
                    styles.responseButton,
                    { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
                    myParticipation.status === 'accepted' && { backgroundColor: '#10B981', borderColor: '#10B981' },
                  ]}
                  onPress={() => handleUpdateStatus('accepted')}
                  disabled={isUpdatingStatus}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color={myParticipation.status === 'accepted' ? '#FFFFFF' : theme.textSecondary}
                  />
                  <Text
                    style={[
                      styles.responseButtonText,
                      { color: myParticipation.status === 'accepted' ? '#FFFFFF' : theme.text },
                    ]}
                  >
                    Принять
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.responseButton,
                    { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
                    myParticipation.status === 'maybe' && { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
                  ]}
                  onPress={() => handleUpdateStatus('maybe')}
                  disabled={isUpdatingStatus}
                >
                  <Ionicons
                    name="help-circle"
                    size={24}
                    color={myParticipation.status === 'maybe' ? '#FFFFFF' : theme.textSecondary}
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
                    myParticipation.status === 'declined' && { backgroundColor: '#EF4444', borderColor: '#EF4444' },
                  ]}
                  onPress={() => handleUpdateStatus('declined')}
                  disabled={isUpdatingStatus}
                >
                  <Ionicons
                    name="close-circle"
                    size={24}
                    color={myParticipation.status === 'declined' ? '#FFFFFF' : theme.textSecondary}
                  />
                  <Text
                    style={[
                      styles.responseButtonText,
                      { color: myParticipation.status === 'declined' ? '#FFFFFF' : theme.text },
                    ]}
                  >
                    Отклонить
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  deleteButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    marginTop: -40,
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
    marginBottom: 8,
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
  responseButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  responseButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  responseButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default EventDetailModal;
