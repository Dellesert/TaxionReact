import React, { useCallback, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';

import { useTheme } from '@shared/hooks/useTheme';
import { ScreenHeader } from '@shared/components/common/ScreenHeader';
import { useIsWideScreen } from '@shared/hooks/useIsWideScreen';
import { useActionModal } from '@shared/contexts/ActionModalContext';
import { useNotification } from '@shared/contexts/NotificationContext';
import { Avatar } from '@shared/components/common/Avatar';
import { UserProfileModal } from '@shared/components/common/UserProfileModal';
import { ActionMenu, ActionMenuItem } from '@shared/components/common/ActionMenu';
import { getOrCreateDirectChat } from '@/features/chat/api/chat.api';
import { useScheduleDetails } from '../hooks/useScheduleDetails';
import { useSchedulePermissions } from '../hooks/useSchedulePermissions';
import { useScheduleStore } from '../store/scheduleStore';
import { ScheduleEntriesList } from '../components/ScheduleEntriesList';
import { TemplateEntriesList } from '../components/TemplateEntriesList';
import { ScheduleGridView } from '../components/ScheduleGridView';
import { ScheduleShiftsView } from '../components/ScheduleShiftsView';
import { formatScheduleDate } from '../utils/scheduleHelpers';
import { getScheduleTypeColor } from '../utils/shiftColors';
import { EditScheduleModal } from '../components/EditScheduleModal';
import { EditScheduleEntryModal } from '../components/EditScheduleEntryModal';
import {
  SCHEDULE_TYPE_LABELS,
  VISIBILITY_LABELS,
  type ScheduleEntry,
  type ScheduleTemplateEntry,
  type UpdateScheduleRequest,
  type CreateScheduleEntryRequest,
  type UpdateScheduleEntryRequest,
  type CreateTemplateEntryRequest,
  type CreateBatchTemplateEntriesRequest,
} from '../types/schedule.types';
import { templateApi } from '../api/schedule.api';
import type { ScheduleStackParamList } from '../navigation/types';

type RouteProps = RouteProp<ScheduleStackParamList, 'ScheduleDetail'>;

export const ScheduleDetailScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProps>();
  const { scheduleId } = route.params;
  const isWideScreen = useIsWideScreen();
  const { showConfirm } = useActionModal();
  const { showSuccess, showError } = useNotification();
  const deleteSchedule = useScheduleStore((state) => state.deleteSchedule);
  const updateSchedule = useScheduleStore((state) => state.updateSchedule);
  const createEntry = useScheduleStore((state) => state.createEntry);
  const updateEntry = useScheduleStore((state) => state.updateEntry);
  const deleteEntry = useScheduleStore((state) => state.deleteEntry);

  const { schedule, entries, isLoading, isLoadingEntries, error, refresh } =
    useScheduleDetails(scheduleId);

  const { canEdit, canManageEntries } = useSchedulePermissions(schedule);

  const [showProfileModal, setShowProfileModal] = React.useState(false);
  const [selectedUserId, setSelectedUserId] = React.useState<number | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [menuButtonPosition, setMenuButtonPosition] = useState<{ x: number; y: number; width: number; height: number } | undefined>();
  const menuButtonRef = useRef<any>(null);

  // Edit modals state
  const [showEditScheduleModal, setShowEditScheduleModal] = useState(false);
  const [showEditEntryModal, setShowEditEntryModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<ScheduleEntry | null>(null);
  const [selectedTemplateEntry, setSelectedTemplateEntry] = useState<ScheduleTemplateEntry | null>(null);

  // View mode for desktop: 'list', 'grid' (employees x dates), or 'shifts' (dates x shifts)
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'shifts'>('list');

  const handleCreatorPress = useCallback(() => {
    if (schedule?.creator?.id) {
      setSelectedUserId(schedule.creator.id);
      setShowProfileModal(true);
    }
  }, [schedule?.creator?.id]);

  const handleOpenChat = useCallback(async (userId: number) => {
    try {
      const chat = await getOrCreateDirectChat(userId);
      setShowProfileModal(false);
      const rootNavigation = navigation.getParent();
      if (rootNavigation) {
        // @ts-ignore
        rootNavigation.navigate('Chats', {
          screen: 'Chat',
          params: { chatId: chat.id },
        });
      }
    } catch (error) {
      console.error('Failed to open chat:', error);
    }
  }, [navigation]);

  const handleEntryPress = useCallback((entry: ScheduleEntry) => {
    // Only allow editing if user has permission
    if (!canManageEntries) return;
    setSelectedEntry(entry);
    setShowEditEntryModal(true);
  }, [canManageEntries]);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleOpenMenu = useCallback(() => {
    if (isWideScreen && menuButtonRef.current) {
      menuButtonRef.current.measure((_x: number, _y: number, width: number, height: number, pageX: number, pageY: number) => {
        setMenuButtonPosition({ x: pageX, y: pageY, width, height });
        setShowActionMenu(true);
      });
    } else {
      setShowActionMenu(true);
    }
  }, [isWideScreen]);

  const handleEditSchedule = useCallback(() => {
    setShowActionMenu(false);
    setShowEditScheduleModal(true);
  }, []);

  const handleAddEntry = useCallback(() => {
    setSelectedEntry(null); // null means create new
    setSelectedTemplateEntry(null);
    setShowEditEntryModal(true);
  }, []);

  const handleSaveSchedule = useCallback(async (data: UpdateScheduleRequest) => {
    if (!schedule) return;
    await updateSchedule(schedule.id, data);
    refresh();
  }, [schedule, updateSchedule, refresh]);

  const handleSaveEntry = useCallback(async (
    data: CreateScheduleEntryRequest | UpdateScheduleEntryRequest,
    entryId?: number
  ) => {
    if (!schedule) return;

    if (entryId) {
      // Update existing entry
      await updateEntry(schedule.id, entryId, data as UpdateScheduleEntryRequest);
    } else {
      // Create new entry
      await createEntry(schedule.id, data as CreateScheduleEntryRequest);
    }
    refresh();
  }, [schedule, createEntry, updateEntry, refresh]);

  const handleDeleteEntry = useCallback(async (entryId: number) => {
    if (!schedule) return;
    await deleteEntry(schedule.id, entryId);
    refresh();
  }, [schedule, deleteEntry, refresh]);

  // Template entry handlers for recurring mode
  const handleSaveTemplateEntry = useCallback(async (
    data: CreateTemplateEntryRequest,
    entryId?: number
  ) => {
    if (!schedule?.template_id) return;

    if (entryId) {
      // Update not supported yet - delete and recreate
      await templateApi.deleteTemplateEntry(schedule.template_id, entryId);
    }
    await templateApi.addTemplateEntry(schedule.template_id, data);
    refresh();
  }, [schedule, refresh]);

  const handleSaveBatchTemplateEntries = useCallback(async (
    data: CreateBatchTemplateEntriesRequest
  ) => {
    if (!schedule?.template_id) return;
    await templateApi.addBatchTemplateEntries(schedule.template_id, data);
    refresh();
  }, [schedule, refresh]);

  const handleDeleteTemplateEntry = useCallback(async (entryId: number) => {
    if (!schedule?.template_id) return;
    await templateApi.deleteTemplateEntry(schedule.template_id, entryId);
    refresh();
  }, [schedule, refresh]);

  const handleDeleteSchedule = useCallback(() => {
    if (!schedule) return;
    showConfirm(
      'Удалить график?',
      `Вы уверены, что хотите удалить "${schedule.title}"? Это действие нельзя отменить.`,
      async () => {
        try {
          await deleteSchedule(schedule.id);
          showSuccess('График удалён');
          navigation.goBack();
        } catch (err) {
          showError('Не удалось удалить график');
        }
      },
      undefined,
      { confirmText: 'Удалить', cancelText: 'Отмена', destructive: true }
    );
  }, [schedule, deleteSchedule, showConfirm, showSuccess, showError, navigation]);

  const menuItems: ActionMenuItem[] = [
    {
      key: 'edit',
      icon: 'create-outline',
      label: 'Редактировать',
      color: theme.text,
      onPress: handleEditSchedule,
    },
    {
      key: 'delete',
      icon: 'trash-outline',
      label: 'Удалить',
      color: '#EF4444',
      onPress: handleDeleteSchedule,
    },
  ];

  if (isLoading && !schedule) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error && !schedule) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.primary }]}
            onPress={refresh}
          >
            <Text style={styles.retryButtonText}>Повторить</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!schedule) return null;

  const typeColor = schedule.color || getScheduleTypeColor(schedule.type);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['left', 'right']}>
      {/* Header */}
      <ScreenHeader
        title={schedule.title}
        customContent={
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color={theme.primary} />
              </TouchableOpacity>
            </View>

            <Text
              style={[styles.headerTitle, { color: theme.text }]}
              numberOfLines={1}
            >
              {schedule.title}
            </Text>

            <View style={styles.headerRight}>
              {/* View mode switcher - only on desktop for monthly mode */}
              {isWideScreen && schedule.mode === 'monthly' && (
                <View style={[styles.viewSwitcher, { backgroundColor: theme.backgroundSecondary }]}>
                  <TouchableOpacity
                    style={[
                      styles.viewButton,
                      viewMode === 'list' && { backgroundColor: theme.primary },
                    ]}
                    onPress={() => setViewMode('list')}
                  >
                    <Ionicons
                      name="list-outline"
                      size={18}
                      color={viewMode === 'list' ? '#FFFFFF' : theme.textSecondary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.viewButton,
                      viewMode === 'grid' && { backgroundColor: theme.primary },
                    ]}
                    onPress={() => setViewMode('grid')}
                  >
                    <Ionicons
                      name="grid-outline"
                      size={18}
                      color={viewMode === 'grid' ? '#FFFFFF' : theme.textSecondary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.viewButton,
                      viewMode === 'shifts' && { backgroundColor: theme.primary },
                    ]}
                    onPress={() => setViewMode('shifts')}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={18}
                      color={viewMode === 'shifts' ? '#FFFFFF' : theme.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              )}
              {/* Menu button - only for users who can edit */}
              {canEdit && (
                <TouchableOpacity
                  ref={menuButtonRef}
                  style={styles.iconButton}
                  onPress={handleOpenMenu}
                >
                  <Ionicons name="ellipsis-horizontal" size={24} color={theme.primary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        }
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          isWideScreen && styles.desktopContentContainer,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isLoading || isLoadingEntries}
            onRefresh={refresh}
            tintColor={theme.primary}
          />
        }
      >
        {isWideScreen ? (
          // Desktop: Two-column layout
          <View style={styles.desktopLayout}>
            {/* Left Column - Main Content (Entries) */}
            <View style={styles.desktopLeftColumn}>
              {/* Entries Section - Grid/Shifts View for desktop or List View */}
              {viewMode === 'grid' && schedule.mode === 'monthly' ? (
                // Desktop Grid View - employees as rows, dates as columns
                <View style={[styles.desktopCard, { backgroundColor: theme.card }]}>
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>
                      Сотрудники × Даты ({entries.length})
                    </Text>
                    {canManageEntries && (
                      <TouchableOpacity
                        style={[styles.addEntryButton, { borderColor: theme.primary }]}
                        onPress={handleAddEntry}
                      >
                        <Ionicons name="add" size={18} color={theme.primary} />
                        <Text style={[styles.addEntryText, { color: theme.primary }]}>
                          Добавить
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {isLoadingEntries ? (
                    <View style={styles.entriesLoader}>
                      <ActivityIndicator size="small" color={theme.primary} />
                    </View>
                  ) : (
                    <ScheduleGridView schedule={schedule} entries={entries} />
                  )}
                </View>
              ) : viewMode === 'shifts' && schedule.mode === 'monthly' ? (
                // Desktop Shifts View - dates as rows, morning/evening columns
                <View style={[styles.desktopCard, { backgroundColor: theme.card }]}>
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>
                      Даты × Смены ({entries.length})
                    </Text>
                    {canManageEntries && (
                      <TouchableOpacity
                        style={[styles.addEntryButton, { borderColor: theme.primary }]}
                        onPress={handleAddEntry}
                      >
                        <Ionicons name="add" size={18} color={theme.primary} />
                        <Text style={[styles.addEntryText, { color: theme.primary }]}>
                          Добавить
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {isLoadingEntries ? (
                    <View style={styles.entriesLoader}>
                      <ActivityIndicator size="small" color={theme.primary} />
                    </View>
                  ) : (
                    <ScheduleShiftsView schedule={schedule} entries={entries} />
                  )}
                </View>
              ) : (
                // Standard List View
                <View style={[styles.desktopCard, { backgroundColor: theme.card }]}>
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>
                      {schedule.mode === 'recurring' ? 'Шаблон недели' : 'Записи'} (
                      {schedule.mode === 'recurring'
                        ? schedule.template?.entries?.length || 0
                        : entries.length}
                      )
                    </Text>
                    {canManageEntries && (
                      <TouchableOpacity
                        style={[styles.addEntryButton, { borderColor: theme.primary }]}
                        onPress={handleAddEntry}
                      >
                        <Ionicons name="add" size={18} color={theme.primary} />
                        <Text style={[styles.addEntryText, { color: theme.primary }]}>
                          Добавить
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {schedule.mode === 'recurring' ? (
                    // Recurring mode - show template entries by day of week
                    <TemplateEntriesList
                      entries={schedule.template?.entries || []}
                      onEntryPress={canManageEntries ? (templateEntry) => {
                        setSelectedTemplateEntry(templateEntry);
                        setShowEditEntryModal(true);
                      } : undefined}
                    />
                  ) : isLoadingEntries ? (
                    <View style={styles.entriesLoader}>
                      <ActivityIndicator size="small" color={theme.primary} />
                    </View>
                  ) : entries.length > 0 ? (
                    <ScheduleEntriesList entries={entries} onEntryPress={canManageEntries ? handleEntryPress : undefined} />
                  ) : (
                    <View style={styles.emptyEntries}>
                      <Ionicons
                        name="document-outline"
                        size={36}
                        color={theme.textSecondary}
                      />
                      <Text
                        style={[styles.emptyEntriesText, { color: theme.textSecondary }]}
                      >
                        Нет записей в этом графике
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Right Column - Sidebar (Info Card) */}
            <View style={styles.desktopRightColumn}>
              {/* Schedule Info Card */}
              <View style={[styles.sidebarCard, { backgroundColor: theme.card }]}>
                <View style={[styles.sidebarColorBar, { backgroundColor: typeColor }]} />

                <View style={styles.sidebarHeader}>
                  <Ionicons name="information-circle" size={20} color={theme.primary} />
                  <Text style={[styles.sidebarTitle, { color: theme.text }]}>О графике</Text>
                </View>

                <View style={styles.sidebarSection}>
                  <Text style={[styles.sidebarLabel, { color: theme.textSecondary }]}>Тип</Text>
                  <Text style={[styles.sidebarValue, { color: theme.text }]}>
                    {SCHEDULE_TYPE_LABELS[schedule.type]}
                  </Text>
                </View>

                <View style={styles.sidebarSection}>
                  <Text style={[styles.sidebarLabel, { color: theme.textSecondary }]}>Период</Text>
                  <Text style={[styles.sidebarValue, { color: theme.text }]}>
                    {formatScheduleDate(schedule.start_date, 'dd.MM.yyyy')} — {formatScheduleDate(schedule.end_date, 'dd.MM.yyyy')}
                  </Text>
                </View>

                <View style={styles.sidebarSection}>
                  <Text style={[styles.sidebarLabel, { color: theme.textSecondary }]}>Видимость</Text>
                  <Text style={[styles.sidebarValue, { color: theme.text }]}>
                    {VISIBILITY_LABELS[schedule.visibility]}
                  </Text>
                </View>

                {schedule.description && (
                  <View style={styles.sidebarSection}>
                    <Text style={[styles.sidebarLabel, { color: theme.textSecondary }]}>Описание</Text>
                    <Text style={[styles.sidebarDescription, { color: theme.text }]}>
                      {schedule.description}
                    </Text>
                  </View>
                )}

                {/* Creator Block */}
                {schedule.creator && (
                  <TouchableOpacity
                    style={[styles.sidebarCreator, { borderTopColor: theme.border }]}
                    onPress={handleCreatorPress}
                    activeOpacity={0.7}
                  >
                    <Avatar
                      name={schedule.creator.name}
                      imageUrl={schedule.creator.avatar}
                      size={36}
                    />
                    <View style={styles.sidebarCreatorInfo}>
                      <Text style={[styles.sidebarCreatorLabel, { color: theme.textSecondary }]}>
                        Создатель
                      </Text>
                      <Text style={[styles.sidebarCreatorName, { color: theme.text }]}>
                        {schedule.creator.name}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        ) : (
          // Mobile: Original single-column layout
          <>
            {/* Schedule Info Card */}
            <View
              style={[
                styles.infoCard,
                {
                  backgroundColor: theme.backgroundSecondary,
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={[styles.colorBar, { backgroundColor: typeColor }]} />

              <View style={styles.infoContent}>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
                    Тип
                  </Text>
                  <Text style={[styles.infoValue, { color: theme.text }]}>
                    {SCHEDULE_TYPE_LABELS[schedule.type]}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
                    Период
                  </Text>
                  <Text style={[styles.infoValue, { color: theme.text }]}>
                    {formatScheduleDate(schedule.start_date, 'dd.MM.yyyy')} —{' '}
                    {formatScheduleDate(schedule.end_date, 'dd.MM.yyyy')}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
                    Видимость
                  </Text>
                  <Text style={[styles.infoValue, { color: theme.text }]}>
                    {VISIBILITY_LABELS[schedule.visibility]}
                  </Text>
                </View>

                {/* Creator Block */}
                {schedule.creator && (
                  <TouchableOpacity
                    style={[styles.creatorBlock, { borderTopColor: theme.border }]}
                    onPress={handleCreatorPress}
                    activeOpacity={0.7}
                  >
                    <Avatar
                      name={schedule.creator.name}
                      imageUrl={schedule.creator.avatar}
                      size={40}
                    />
                    <View style={styles.creatorInfo}>
                      <Text style={[styles.creatorName, { color: theme.text }]}>
                        {schedule.creator.name}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                  </TouchableOpacity>
                )}

                {schedule.description && (
                  <View style={styles.descriptionRow}>
                    <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
                      Описание
                    </Text>
                    <Text style={[styles.description, { color: theme.text }]}>
                      {schedule.description}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Entries Section */}
            <View style={styles.entriesSection}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  {schedule.mode === 'recurring' ? 'Шаблон недели' : 'Записи'} (
                  {schedule.mode === 'recurring'
                    ? schedule.template?.entries?.length || 0
                    : entries.length}
                  )
                </Text>
                {canManageEntries && (
                  <TouchableOpacity
                    style={[styles.addEntryButton, { borderColor: theme.primary }]}
                    onPress={handleAddEntry}
                  >
                    <Ionicons name="add" size={18} color={theme.primary} />
                    <Text style={[styles.addEntryText, { color: theme.primary }]}>
                      Добавить
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {schedule.mode === 'recurring' ? (
                // Recurring mode - show template entries by day of week
                <TemplateEntriesList
                  entries={schedule.template?.entries || []}
                  onEntryPress={canManageEntries ? (templateEntry) => {
                    setSelectedTemplateEntry(templateEntry);
                    setShowEditEntryModal(true);
                  } : undefined}
                />
              ) : isLoadingEntries ? (
                <View style={styles.entriesLoader}>
                  <ActivityIndicator size="small" color={theme.primary} />
                </View>
              ) : entries.length > 0 ? (
                <ScheduleEntriesList entries={entries} onEntryPress={canManageEntries ? handleEntryPress : undefined} />
              ) : (
                <View style={styles.emptyEntries}>
                  <Ionicons
                    name="document-outline"
                    size={36}
                    color={theme.textSecondary}
                  />
                  <Text
                    style={[styles.emptyEntriesText, { color: theme.textSecondary }]}
                  >
                    Нет записей в этом графике
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      <UserProfileModal
        visible={showProfileModal}
        userId={selectedUserId}
        onClose={() => {
          setShowProfileModal(false);
          setSelectedUserId(null);
        }}
        onOpenChat={handleOpenChat}
      />

      <ActionMenu
        visible={showActionMenu}
        items={menuItems}
        onClose={() => setShowActionMenu(false)}
        isDesktop={isWideScreen}
        buttonPosition={menuButtonPosition}
      />

      <EditScheduleModal
        visible={showEditScheduleModal}
        schedule={schedule}
        onClose={() => setShowEditScheduleModal(false)}
        onSave={handleSaveSchedule}
      />

      <EditScheduleEntryModal
        visible={showEditEntryModal}
        schedule={schedule}
        entry={selectedEntry}
        templateEntry={selectedTemplateEntry}
        onClose={() => {
          setShowEditEntryModal(false);
          setSelectedEntry(null);
          setSelectedTemplateEntry(null);
        }}
        onSave={handleSaveEntry}
        onSaveTemplateEntry={handleSaveTemplateEntry}
        onSaveBatchTemplateEntries={handleSaveBatchTemplateEntries}
        onDelete={handleDeleteEntry}
        onDeleteTemplateEntry={handleDeleteTemplateEntry}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    width: 100,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerRight: {
    width: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  viewSwitcher: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 4,
    gap: 4,
  },
  viewButton: {
    padding: 6,
    borderRadius: 6,
  },
  iconButton: {
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 120,
  },
  infoCard: {
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  colorBar: {
    height: 4,
  },
  infoContent: {
    padding: 16,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 13,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  descriptionRow: {
    gap: 4,
    paddingTop: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  creatorBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: 1,
    gap: 12,
  },
  creatorInfo: {
    flex: 1,
    gap: 2,
  },
  creatorName: {
    fontSize: 15,
    fontWeight: '600',
  },
  creatorTime: {
    fontSize: 13,
  },
  entriesSection: {
    paddingHorizontal: 16,
  },
  gridViewSection: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  addEntryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  addEntryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  entriesLoader: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyEntries: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyEntriesText: {
    fontSize: 14,
  },

  // Desktop styles
  desktopContentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  desktopLayout: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 20,
  },
  desktopLeftColumn: {
    flex: 1,
  },
  desktopRightColumn: {
    width: 320,
    flexShrink: 0,
  },
  desktopCard: {
    padding: 20,
    borderRadius: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
      },
    }),
  },

  // Sidebar styles
  sidebarCard: {
    padding: 20,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
      },
    }),
  },
  sidebarColorBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    paddingTop: 4,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.06)',
  },
  sidebarTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    flex: 1,
  },
  sidebarSection: {
    marginBottom: 16,
  },
  sidebarLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  sidebarValue: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
  },
  sidebarDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  sidebarCreator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  sidebarCreatorInfo: {
    flex: 1,
    gap: 2,
  },
  sidebarCreatorLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  sidebarCreatorName: {
    fontSize: 15,
    fontWeight: '600',
  },
});
