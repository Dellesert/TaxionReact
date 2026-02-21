import React, { useCallback, useState, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';

import { useTheme } from '@shared/hooks/useTheme';
import { useAnimationType } from '@shared/hooks/useAnimationType';
import { ScreenHeader } from '@shared/components/common/ScreenHeader';
import { useIsWideScreen } from '@shared/hooks/useIsWideScreen';
import { useTitleBarControlsIntegration } from '@shared/hooks/useTitleBarControlsIntegration';
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
import { TitleBarScheduleDetailControls, type ScheduleViewMode } from '../components/TitleBarScheduleDetailControls';
import { TitleBarBackButton } from '@/features/tasks/components/common/TitleBarBackButton';
import { formatScheduleDate } from '../utils/scheduleHelpers';
import { getScheduleTypeColor } from '../utils/shiftColors';
import { EditScheduleModal } from '../components/EditScheduleModal';
import { EditScheduleEntryModal } from '../components/EditScheduleEntryModal';
import {
  SCHEDULE_TYPE_LABELS,
  VISIBILITY_LABELS,
  type ScheduleEntry,
  type ScheduleUser,
  type ScheduleTemplateEntry,
  type UpdateScheduleRequest,
  type CreateScheduleEntryRequest,
  type UpdateScheduleEntryRequest,
  type CreateTemplateEntryRequest,
  type CreateBatchTemplateEntriesRequest,
  type ShiftType,
} from '../types/schedule.types';
import { templateApi, scheduleApi } from '../api/schedule.api';
import { usePendingChanges, executeBatchSave } from '../hooks/usePendingChanges';
import { useScheduleAbsences } from '../hooks/useScheduleAbsences';
import type { AbsenceType } from '@features/absences/types/absence.types';
import type { ScheduleStackParamList } from '../navigation/types';

type RouteProps = RouteProp<ScheduleStackParamList, 'ScheduleDetail'>;

export const ScheduleDetailScreen: React.FC = () => {
  const { theme } = useTheme();
  const animationType = useAnimationType('fade');
  const navigation = useNavigation();
  const route = useRoute<RouteProps>();
  const { scheduleId } = route.params;
  const isWideScreen = useIsWideScreen();
  const { showConfirm, showOptions } = useActionModal();
  const { showSuccess, showError } = useNotification();
  const deleteSchedule = useScheduleStore((state) => state.deleteSchedule);
  const updateSchedule = useScheduleStore((state) => state.updateSchedule);
  const createEntry = useScheduleStore((state) => state.createEntry);
  const updateEntry = useScheduleStore((state) => state.updateEntry);
  const deleteEntry = useScheduleStore((state) => state.deleteEntry);

  // Pending changes for batch mode in Grid View
  const {
    changes: pendingChanges,
    pendingCount,
    hasPendingChanges,
    isSaving: isSavingPending,
    setIsSaving: setIsSavingPending,
    setSaveErrors,
    addChange: addPendingChange,
    addDelete: addPendingDelete,
    removeSucceeded,
    discardAll: discardPendingChanges,
  } = usePendingChanges();

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

  // Group members for the schedule's linked user group
  const [groupMembers, setGroupMembers] = useState<ScheduleUser[]>([]);

  // User filter state for recurring schedules
  const [showUserFilterPicker, setShowUserFilterPicker] = useState(false);
  const [filterUserId, setFilterUserId] = useState<number | null>(null);
  const [filterUserName, setFilterUserName] = useState<string | null>(null);

  // Check if running in Electron
  const isElectron = Platform.OS === 'web' && typeof window !== 'undefined' && window.electron;

  // View mode for desktop: 'list', 'grid' (employees x dates), or 'shifts' (dates x shifts)
  const [viewMode, setViewMode] = useState<ScheduleViewMode>('list');
  const viewModeInitialized = useRef(false);

  // Load saved view mode from localStorage when schedule type is known (Electron only)
  useEffect(() => {
    if (isElectron && schedule?.type && typeof localStorage !== 'undefined') {
      const key = `schedule_view_mode_${schedule.type}`;
      const saved = localStorage.getItem(key);
      if (saved === 'list' || saved === 'grid' || saved === 'shifts') {
        setViewMode(saved);
      }
      viewModeInitialized.current = true;
    }
  }, [isElectron, schedule?.type]);

  // Save view mode to localStorage when it changes (Electron only)
  useEffect(() => {
    if (isElectron && schedule?.type && viewModeInitialized.current && typeof localStorage !== 'undefined') {
      const key = `schedule_view_mode_${schedule.type}`;
      localStorage.setItem(key, viewMode);
    }
  }, [isElectron, schedule?.type, viewMode]);

  // Load group members when schedule has a linked user group
  useEffect(() => {
    if (schedule?.user_group_id) {
      scheduleApi.getScheduleGroupMembers(schedule.id)
        .then((members) => setGroupMembers(members))
        .catch((err) => console.error('Failed to load group members:', err));
    } else {
      setGroupMembers([]);
    }
  }, [schedule?.id, schedule?.user_group_id]);

  // Fetch absences for all grid users in the schedule date range
  const gridUserIds = useMemo(
    () => groupMembers.map((m) => m.id),
    [groupMembers],
  );

  const { absenceMap } = useScheduleAbsences({
    userIds: gridUserIds,
    startDate: schedule?.start_date || '',
    endDate: schedule?.end_date || '',
    enabled: !!schedule && gridUserIds.length > 0 && viewMode === 'grid',
  });

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
    // На Electron позиция устанавливается через onMenuButtonLayout из TitleBar
    if (isElectron && isWideScreen) {
      setShowActionMenu(true);
      return;
    }
    // На обычном веб/мобильном - измеряем позицию кнопки
    if (isWideScreen && menuButtonRef.current) {
      menuButtonRef.current.measure((_x: number, _y: number, width: number, height: number, pageX: number, pageY: number) => {
        setMenuButtonPosition({ x: pageX, y: pageY, width, height });
        setShowActionMenu(true);
      });
    } else {
      setShowActionMenu(true);
    }
  }, [isElectron, isWideScreen]);

  // Callback для получения позиции кнопки из TitleBar
  const handleMenuButtonLayout = useCallback((layout: { x: number; y: number; width: number; height: number }) => {
    setMenuButtonPosition(layout);
  }, []);

  // Handler for batch saving all pending changes in Grid View
  const handleSavePendingChanges = useCallback(async () => {
    if (!schedule || pendingChanges.size === 0) return;

    setIsSavingPending(true);
    setSaveErrors([]);

    try {
      const { succeeded, failed } = await executeBatchSave(
        schedule.id,
        pendingChanges,
        { createEntry, updateEntry, deleteEntry },
      );

      if (failed.length > 0) {
        removeSucceeded(succeeded);
        setSaveErrors(failed);
        showError(`${failed.length} из ${succeeded.length + failed.length} изменений не сохранено`);
      } else {
        discardPendingChanges();
        showSuccess(`Сохранено ${succeeded.length} изменений`);
      }
    } catch (err) {
      showError('Не удалось сохранить изменения');
    } finally {
      setIsSavingPending(false);
      refresh();
    }
  }, [schedule, pendingChanges, createEntry, updateEntry, deleteEntry, removeSucceeded, discardPendingChanges, refresh, showSuccess, showError, setIsSavingPending, setSaveErrors]);

  // Handler for discarding all pending changes with confirmation
  const handleDiscardPendingChanges = useCallback(() => {
    if (!hasPendingChanges) return;
    showConfirm(
      'Отменить изменения?',
      `Вы потеряете ${pendingCount} несохранённых изменений.`,
      () => {
        discardPendingChanges();
      },
      undefined,
      { confirmText: 'Отменить', cancelText: 'Назад', destructive: true },
    );
  }, [hasPendingChanges, pendingCount, discardPendingChanges, showConfirm]);

  // Guard view mode switching when there are pending changes
  const handleViewModeChange = useCallback((newMode: ScheduleViewMode) => {
    if (viewMode === 'grid' && newMode !== 'grid' && hasPendingChanges) {
      showOptions(
        'Несохранённые изменения',
        [
          {
            text: `Сохранить (${pendingCount})`,
            onPress: async () => {
              await handleSavePendingChanges();
              setViewMode(newMode);
            },
            style: 'primary',
          },
          {
            text: 'Не сохранять',
            onPress: () => {
              discardPendingChanges();
              setViewMode(newMode);
            },
            style: 'destructive',
          },
        ],
        `У вас ${pendingCount} несохранённых изменений.`,
      );
      return;
    }
    setViewMode(newMode);
  }, [viewMode, hasPendingChanges, pendingCount, handleSavePendingChanges, discardPendingChanges, showOptions]);

  // TitleBar left controls - back button + view switcher
  const titleBarLeftControls = useMemo(() => {
    if (!isElectron || !isWideScreen) return null;
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <TitleBarBackButton onGoBack={handleGoBack} />
        {schedule && (
          <TitleBarScheduleDetailControls
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
            showViewSwitcher={schedule.mode === 'monthly'}
            showViewSwitcherOnly
          />
        )}
      </View>
    );
  }, [isElectron, isWideScreen, handleGoBack, schedule, viewMode, handleViewModeChange]);

  // TitleBar right controls - menu button + pending changes controls
  const titleBarRightControls = useMemo(() => {
    if (!isElectron || !isWideScreen || !schedule) return null;
    return (
      <TitleBarScheduleDetailControls
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        showViewSwitcher={false}
        canEdit={canEdit}
        onOpenMenu={handleOpenMenu}
        onMenuButtonLayout={handleMenuButtonLayout}
        showMenuOnly
        pendingChangesCount={viewMode === 'grid' ? pendingCount : 0}
        onSavePendingChanges={handleSavePendingChanges}
        onDiscardPendingChanges={handleDiscardPendingChanges}
        isSavingChanges={isSavingPending}
      />
    );
  }, [isElectron, isWideScreen, schedule, viewMode, canEdit, handleOpenMenu, handleMenuButtonLayout, handleViewModeChange, pendingCount, handleSavePendingChanges, handleDiscardPendingChanges, isSavingPending]);

  // Integrate controls with TitleBar in Electron
  useTitleBarControlsIntegration({
    pageTitle: schedule?.title || 'График',
    leftControls: titleBarLeftControls,
    rightControls: titleBarRightControls,
    enabled: isElectron && isWideScreen,
  });

  // Navigation guard: prevent navigating away with unsaved pending changes
  useEffect(() => {
    if (!hasPendingChanges) return;

    const unsubscribe = navigation.addListener('beforeRemove' as any, (e: any) => {
      e.preventDefault();

      showOptions(
        'Несохранённые изменения',
        [
          {
            text: `Сохранить (${pendingCount})`,
            onPress: async () => {
              await handleSavePendingChanges();
              navigation.dispatch(e.data.action);
            },
            style: 'primary',
          },
          {
            text: 'Не сохранять',
            onPress: () => {
              discardPendingChanges();
              navigation.dispatch(e.data.action);
            },
            style: 'destructive',
          },
        ],
        `У вас ${pendingCount} несохранённых изменений в графике.`,
      );
    });

    return unsubscribe;
  }, [hasPendingChanges, pendingCount, navigation, handleSavePendingChanges, discardPendingChanges, showOptions]);

  // Keyboard shortcuts (Electron): Ctrl/Cmd+S to save, Escape to discard
  useEffect(() => {
    if (!isElectron || viewMode !== 'grid') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && hasPendingChanges) {
        e.preventDefault();
        handleSavePendingChanges();
      }
      if (e.key === 'Escape' && hasPendingChanges) {
        e.preventDefault();
        handleDiscardPendingChanges();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isElectron, viewMode, hasPendingChanges, handleSavePendingChanges, handleDiscardPendingChanges]);

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

  // Filtered template entries for recurring mode
  const filteredTemplateEntries = useMemo(() => {
    const allEntries = schedule?.template?.entries || [];
    if (!filterUserId) return allEntries;
    return allEntries.filter(
      (entry) => entry.user_id === filterUserId || !entry.user_id
    );
  }, [schedule?.template?.entries, filterUserId]);

  // Filtered entries for monthly mode
  const filteredEntries = useMemo(() => {
    if (!filterUserId) return entries;
    return entries.filter((entry) => entry.user_id === filterUserId);
  }, [entries, filterUserId]);

  // Unique users from schedule entries (for filter picker)
  const scheduleUsers = useMemo(() => {
    const userMap = new Map<number, { id: number; name: string; avatar?: string }>();
    if (schedule?.mode === 'recurring') {
      (schedule.template?.entries || []).forEach((entry) => {
        if (entry.user_id && entry.user) {
          userMap.set(entry.user_id, { id: entry.user.id, name: entry.user.name, avatar: entry.user.avatar });
        }
      });
    } else {
      entries.forEach((entry) => {
        if (entry.user_id && entry.user) {
          userMap.set(entry.user_id, { id: entry.user.id, name: entry.user.name, avatar: entry.user.avatar });
        }
      });
    }
    return Array.from(userMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [schedule?.mode, schedule?.template?.entries, entries]);

  const handleUserFilterChange = useCallback((userId: number | null, userName: string | null) => {
    setFilterUserId(userId);
    setFilterUserName(userName);
  }, []);

  // Handler for adding entry from Shifts View
  const handleShiftsAddEntry = useCallback(async (
    userId: number,
    dateKey: string, // YYYY-MM-DD
    shiftType: ShiftType
  ) => {
    if (!schedule) return;

    const createData: CreateScheduleEntryRequest = {
      user_id: userId,
      date: `${dateKey}T00:00:00Z`,
      shift_type: shiftType,
    };
    await createEntry(schedule.id, createData);
    // Store updates entries optimistically, no refresh needed
  }, [schedule, createEntry]);

  // Handler for updating entry (replace user) from Shifts View
  const handleShiftsUpdateEntry = useCallback(async (entryId: number, userId: number) => {
    if (!schedule) return;
    await updateEntry(schedule.id, entryId, { user_id: userId });
    // Store updates entries optimistically, no refresh needed
  }, [schedule, updateEntry]);

  // Handler for entry deletion from Shifts View
  const handleShiftsEntryDelete = useCallback(async (entryId: number) => {
    if (!schedule) return;
    await deleteEntry(schedule.id, entryId);
    // Store updates entries optimistically, no refresh needed
  }, [schedule, deleteEntry]);

  // Handler for absence confirmation dialog in Grid View
  const handleAbsenceShiftConfirm = useCallback(async (
    _userId: number,
    dateKey: string,
    _absenceType: AbsenceType,
    absenceLabel: string,
    userName: string,
  ): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      showConfirm(
        'Сотрудник отсутствует',
        `${userName} — ${absenceLabel} (${dateKey}).\nВы уверены, что хотите назначить смену?`,
        () => resolve(true),
        () => resolve(false),
        {
          confirmText: 'Назначить',
          cancelText: 'Отмена',
          destructive: false,
        },
      );
    });
  }, [showConfirm]);

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
      {/* Header - hide on Electron desktop since controls are in TitleBar */}
      {!(isElectron && isWideScreen) && (
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
                {/* Pending changes Save/Discard buttons (non-Electron) */}
                {hasPendingChanges && viewMode === 'grid' && (
                  <View style={styles.pendingHeaderControls}>
                    <TouchableOpacity
                      onPress={handleDiscardPendingChanges}
                      style={styles.headerDiscardButton}
                    >
                      <Ionicons name="close-circle-outline" size={22} color={theme.error} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleSavePendingChanges}
                      disabled={isSavingPending}
                      style={[styles.headerSaveButton, { backgroundColor: theme.primary }]}
                    >
                      {isSavingPending ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.headerSaveText}>
                          Сохранить ({pendingCount})
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
                {/* View mode switcher - only on desktop for monthly mode */}
                {isWideScreen && schedule.mode === 'monthly' && (
                  <View style={[styles.viewSwitcher, { backgroundColor: theme.backgroundSecondary }]}>
                    <TouchableOpacity
                      style={[
                        styles.viewButton,
                        viewMode === 'list' && { backgroundColor: theme.primary },
                      ]}
                      onPress={() => handleViewModeChange('list')}
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
                      onPress={() => handleViewModeChange('grid')}
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
                      onPress={() => handleViewModeChange('shifts')}
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
      )}

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
                    <ScheduleGridView
                      schedule={schedule}
                      entries={entries}
                      groupMembers={groupMembers}
                      canEdit={canManageEntries}
                      pendingChanges={pendingChanges}
                      onPendingShiftSelect={addPendingChange}
                      onPendingEntryDelete={addPendingDelete}
                      absenceMap={absenceMap}
                      onAbsenceShiftConfirm={handleAbsenceShiftConfirm}
                    />
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
                    <ScheduleShiftsView
                      schedule={schedule}
                      entries={entries}
                      canEdit={canManageEntries}
                      onAddEntry={handleShiftsAddEntry}
                      onUpdateEntry={handleShiftsUpdateEntry}
                      onDeleteEntry={handleShiftsEntryDelete}
                    />
                  )}
                </View>
              ) : (
                // Standard List View
                <View style={[styles.desktopCard, { backgroundColor: theme.card }]}>
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>
                      {schedule.mode === 'recurring' ? 'Шаблон недели' : 'Записи'} (
                      {schedule.mode === 'recurring'
                        ? filteredTemplateEntries.length
                        : filteredEntries.length}
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

                  {/* User filter chip */}
                  <View style={styles.userFilterContainer}>
                    <TouchableOpacity
                      style={[
                        styles.userFilterChip,
                        { backgroundColor: theme.card, borderColor: theme.border },
                        filterUserId ? { borderColor: theme.primary, backgroundColor: theme.backgroundSecondary } : null,
                      ]}
                      onPress={() => setShowUserFilterPicker(true)}
                    >
                      <Ionicons
                        name="person"
                        size={16}
                        color={filterUserId ? theme.primary : theme.textSecondary}
                      />
                      <Text
                        style={[
                          styles.userFilterText,
                          { color: filterUserId ? theme.primary : theme.textSecondary },
                        ]}
                        numberOfLines={1}
                      >
                        {filterUserName || 'Все сотрудники'}
                      </Text>
                      {filterUserId ? (
                        <TouchableOpacity
                          onPress={() => handleUserFilterChange(null, null)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Ionicons name="close-circle" size={18} color={theme.primary} />
                        </TouchableOpacity>
                      ) : (
                        <Ionicons name="chevron-down" size={16} color={theme.textSecondary} />
                      )}
                    </TouchableOpacity>
                  </View>

                  {schedule.mode === 'recurring' ? (
                    // Recurring mode - show template entries by day of week
                    <TemplateEntriesList
                      entries={filteredTemplateEntries}
                      onEntryPress={canManageEntries ? (templateEntry) => {
                        setSelectedTemplateEntry(templateEntry);
                        setShowEditEntryModal(true);
                      } : undefined}
                    />
                  ) : isLoadingEntries ? (
                    <View style={styles.entriesLoader}>
                      <ActivityIndicator size="small" color={theme.primary} />
                    </View>
                  ) : filteredEntries.length > 0 ? (
                    <ScheduleEntriesList entries={filteredEntries} onEntryPress={canManageEntries ? handleEntryPress : undefined} />
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
                        {filterUserId ? 'Нет записей для выбранного сотрудника' : 'Нет записей в этом графике'}
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
                    ? filteredTemplateEntries.length
                    : filteredEntries.length}
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

              {/* User filter chip */}
              <View style={styles.userFilterContainer}>
                <TouchableOpacity
                  style={[
                    styles.userFilterChip,
                    { backgroundColor: theme.card, borderColor: theme.border },
                    filterUserId ? { borderColor: theme.primary, backgroundColor: theme.backgroundSecondary } : null,
                  ]}
                  onPress={() => setShowUserFilterPicker(true)}
                >
                  <Ionicons
                    name="person"
                    size={16}
                    color={filterUserId ? theme.primary : theme.textSecondary}
                  />
                  <Text
                    style={[
                      styles.userFilterText,
                      { color: filterUserId ? theme.primary : theme.textSecondary },
                    ]}
                    numberOfLines={1}
                  >
                    {filterUserName || 'Все сотрудники'}
                  </Text>
                  {filterUserId ? (
                    <TouchableOpacity
                      onPress={() => handleUserFilterChange(null, null)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="close-circle" size={18} color={theme.primary} />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons name="chevron-down" size={16} color={theme.textSecondary} />
                  )}
                </TouchableOpacity>
              </View>

              {schedule.mode === 'recurring' ? (
                // Recurring mode - show template entries by day of week
                <TemplateEntriesList
                  entries={filteredTemplateEntries}
                  onEntryPress={canManageEntries ? (templateEntry) => {
                    setSelectedTemplateEntry(templateEntry);
                    setShowEditEntryModal(true);
                  } : undefined}
                />
              ) : isLoadingEntries ? (
                <View style={styles.entriesLoader}>
                  <ActivityIndicator size="small" color={theme.primary} />
                </View>
              ) : filteredEntries.length > 0 ? (
                <ScheduleEntriesList entries={filteredEntries} onEntryPress={canManageEntries ? handleEntryPress : undefined} />
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
                    {filterUserId ? 'Нет записей для выбранного сотрудника' : 'Нет записей в этом графике'}
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

      {/* User Filter Picker - shows only users from the schedule */}
      <Modal
        visible={showUserFilterPicker}
        transparent
        animationType={animationType}
        onRequestClose={() => setShowUserFilterPicker(false)}
      >
        <TouchableOpacity
          style={styles.filterModalOverlay}
          activeOpacity={1}
          onPress={() => setShowUserFilterPicker(false)}
        >
          <View style={[styles.filterModalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.filterModalTitle, { color: theme.text }]}>
              Фильтр по сотруднику
            </Text>

            {/* "All employees" option */}
            <TouchableOpacity
              style={[
                styles.filterModalItem,
                { borderBottomColor: theme.border },
                !filterUserId && { backgroundColor: theme.backgroundSecondary },
              ]}
              onPress={() => {
                handleUserFilterChange(null, null);
                setShowUserFilterPicker(false);
              }}
            >
              <Ionicons name="people-outline" size={20} color={theme.primary} />
              <Text style={[styles.filterModalItemText, { color: theme.text }]}>
                Все сотрудники
              </Text>
              {!filterUserId && (
                <Ionicons name="checkmark" size={20} color={theme.primary} />
              )}
            </TouchableOpacity>

            <FlatList
              data={scheduleUsers}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.filterModalItem,
                    { borderBottomColor: theme.border },
                    filterUserId === item.id && { backgroundColor: theme.backgroundSecondary },
                  ]}
                  onPress={() => {
                    handleUserFilterChange(item.id, item.name);
                    setShowUserFilterPicker(false);
                  }}
                >
                  <Avatar name={item.name} imageUrl={item.avatar} size={28} />
                  <Text style={[styles.filterModalItemText, { color: theme.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {filterUserId === item.id && (
                    <Ionicons name="checkmark" size={20} color={theme.primary} />
                  )}
                </TouchableOpacity>
              )}
              style={styles.filterModalList}
            />
          </View>
        </TouchableOpacity>
      </Modal>
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
  pendingHeaderControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerDiscardButton: {
    padding: 4,
  },
  headerSaveButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  headerSaveText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
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

  // User filter styles
  userFilterContainer: {
    marginBottom: 12,
  },
  userFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  userFilterText: {
    fontSize: 14,
    fontWeight: '500',
    maxWidth: 200,
  },

  // Filter modal styles
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  filterModalContent: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  filterModalTitle: {
    fontSize: 17,
    fontWeight: '600',
    padding: 16,
    paddingBottom: 12,
  },
  filterModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filterModalItemText: {
    fontSize: 15,
    flex: 1,
  },
  filterModalList: {
    flexGrow: 0,
  },
});
