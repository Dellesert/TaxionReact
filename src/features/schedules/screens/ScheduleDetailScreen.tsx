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
import { useDesktopNavigation, type NavigationGuard } from '@shared/contexts/DesktopNavigationContext';

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
  type ScheduleEntryWarning,
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
  const { registerNavigationGuard, unregisterNavigationGuard } = useDesktopNavigation();
  const { showConfirm, showOptions } = useActionModal();
  const { showSuccess, showError } = useNotification();
  const deleteSchedule = useScheduleStore((state) => state.deleteSchedule);
  const updateSchedule = useScheduleStore((state) => state.updateSchedule);
  const publishScheduleAction = useScheduleStore((state) => state.publishSchedule);
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
    markForForce,
    discardAll: discardPendingChanges,
  } = usePendingChanges();

  const { schedule, entries, isLoading, isLoadingEntries, error, refresh } =
    useScheduleDetails(scheduleId);

  const { canEdit, canManageEntries } = useSchedulePermissions(schedule);

  const isDraft = schedule?.status === 'draft';

  const [showProfileModal, setShowProfileModal] = React.useState(false);
  const [selectedUserId, setSelectedUserId] = React.useState<number | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [menuButtonPosition, setMenuButtonPosition] = useState<{ x: number; y: number; width: number; height: number } | undefined>();
  const menuButtonRef = useRef<any>(null);

  // Info card collapsed state (desktop) — hidden by default only in grid view
  const [showInfoCard, setShowInfoCard] = useState(true);

  // Edit modals state
  const [showEditScheduleModal, setShowEditScheduleModal] = useState(false);
  const [showEditEntryModal, setShowEditEntryModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<ScheduleEntry | null>(null);
  const [selectedTemplateEntry, setSelectedTemplateEntry] = useState<ScheduleTemplateEntry | null>(null);

  // Group members for the schedule's linked user group
  const [groupMembers, setGroupMembers] = useState<ScheduleUser[]>([]);

  // Warnings for cells that had validation warnings (absence/conflict)
  const [cellWarnings, setCellWarnings] = useState<Map<string, ScheduleEntryWarning[]>>(new Map());

  // Publish state
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublishSchedule = useCallback(async () => {
    if (!schedule || schedule.status !== 'draft') return;
    setIsPublishing(true);
    try {
      await publishScheduleAction(schedule.id);
      showSuccess('График опубликован');
      refresh();
    } catch (err) {
      showError('Не удалось опубликовать график');
    } finally {
      setIsPublishing(false);
    }
  }, [schedule, publishScheduleAction, refresh, showSuccess, showError]);

  // Helper: render styled warning list for confirmation dialogs
  const renderWarningList = useCallback((warnings: ScheduleEntryWarning[], questionText: string) => (
    <View style={warningStyles.container}>
      {warnings.map((w, i) => (
        <View key={i} style={warningStyles.warningItem}>
          <Text style={warningStyles.warningIcon}>
            {w.type === 'absence' ? '📅' : '⚠️'}
          </Text>
          <Text style={[warningStyles.warningText, { color: '#92400E' }]}>
            {w.message}
          </Text>
        </View>
      ))}
      <Text style={[warningStyles.question, { color: theme.text }]}>
        {questionText}
      </Text>
    </View>
  ), [theme.text]);

  // User filter state for recurring schedules
  const [showUserFilterPicker, setShowUserFilterPicker] = useState(false);
  const [filterUserId, setFilterUserId] = useState<number | null>(null);
  const [filterUserName, setFilterUserName] = useState<string | null>(null);
  const filterButtonRef = useRef<any>(null);
  const [filterButtonPosition, setFilterButtonPosition] = useState<{ x: number; y: number; width: number; height: number } | undefined>();

  // Check if running in Electron
  const isElectron = Platform.OS === 'web' && typeof window !== 'undefined' && window.electron;

  // View mode for desktop: 'list', 'grid' (employees x dates), or 'shifts' (dates x shifts)
  const [viewMode, setViewMode] = useState<ScheduleViewMode>('list');
  const viewModeInitialized = useRef(false);
  const [displayedViewMode, setDisplayedViewMode] = useState<ScheduleViewMode>('list');
  const [viewTransitioning, setViewTransitioning] = useState(false);

  // Load saved view mode from localStorage when schedule type is known (Electron only)
  useEffect(() => {
    if (isElectron && schedule?.type && typeof localStorage !== 'undefined') {
      const key = `schedule_view_mode_${schedule.type}`;
      const saved = localStorage.getItem(key);
      if (saved === 'list' || saved === 'grid' || saved === 'shifts') {
        setViewMode(saved);
        setDisplayedViewMode(saved);
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

  // Show/hide info card based on view mode: hidden by default in grid, shown in others
  useEffect(() => {
    setShowInfoCard(displayedViewMode !== 'grid');
  }, [displayedViewMode]);

  // Smooth view mode transition on Electron desktop
  useEffect(() => {
    if (viewMode === displayedViewMode) return;
    if (isElectron && isWideScreen) {
      setViewTransitioning(true);
      const timer = setTimeout(() => {
        setDisplayedViewMode(viewMode);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setViewTransitioning(false);
          });
        });
      }, 150);
      return () => clearTimeout(timer);
    } else {
      setDisplayedViewMode(viewMode);
    }
  }, [viewMode, displayedViewMode, isElectron, isWideScreen]);

  // Load group members (from user group or schedule assignments for imported schedules)
  useEffect(() => {
    if (schedule?.id) {
      scheduleApi.getScheduleGroupMembers(schedule.id)
        .then((members) => setGroupMembers(members))
        .catch((err) => console.error('Failed to load group members:', err));
    }
  }, [schedule?.id]);

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
      const { succeeded, failed, warned } = await executeBatchSave(
        schedule.id,
        pendingChanges,
        { createEntry, updateEntry, deleteEntry },
      );

      // Remove succeeded from pending
      if (succeeded.length > 0) {
        removeSucceeded(succeeded);
      }

      if (warned.length > 0) {
        // Store warnings so the grid can show indicators
        const newWarnings = new Map<string, ScheduleEntryWarning[]>();
        for (const w of warned) {
          newWarnings.set(w.cellKey, w.warnings);
        }
        setCellWarnings(newWarnings);

        // Build styled warning content for confirmation dialog
        const total = succeeded.length + failed.length + warned.length;

        // Group warnings by user for better readability
        const warningsByUser = new Map<number, { userName: string; dateKey: string; warnings: ScheduleEntryWarning[] }[]>();
        for (const w of warned) {
          const dashIdx = w.cellKey.indexOf('-');
          const uId = Number(w.cellKey.substring(0, dashIdx));
          const dKey = w.cellKey.substring(dashIdx + 1);
          const member = groupMembers.find(m => m.id === uId);
          if (!warningsByUser.has(uId)) {
            warningsByUser.set(uId, []);
          }
          warningsByUser.get(uId)!.push({
            userName: member?.name || `#${uId}`,
            dateKey: dKey,
            warnings: w.warnings,
          });
        }

        const warningContent = (
          <View style={warningStyles.container}>
            {Array.from(warningsByUser.entries()).map(([userId, items]) => (
              <View key={userId} style={[warningStyles.userGroup, { backgroundColor: theme.backgroundTertiary, borderColor: theme.border }]}>
                <Text style={[warningStyles.userName, { color: theme.text }]}>
                  {items[0].userName}
                </Text>
                {items.map((item, idx) => (
                  <View key={idx} style={warningStyles.warningRow}>
                    <Text style={[warningStyles.dateLabel, { color: theme.textSecondary }]}>
                      {item.dateKey}
                    </Text>
                    {item.warnings.map((w, wi) => (
                      <View key={wi} style={warningStyles.warningItem}>
                        <Text style={[warningStyles.warningIcon]}>
                          {w.type === 'absence' ? '📅' : '⚠️'}
                        </Text>
                        <Text style={[warningStyles.warningText, { color: '#92400E' }]}>
                          {w.message}
                        </Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            ))}
            <Text style={[warningStyles.question, { color: theme.text }]}>
              Назначить все равно?
            </Text>
          </View>
        );

        showConfirm(
          `Предупреждения (${warned.length})`,
          '',
          () => {
            // User confirmed — mark warned entries for force and re-save
            markForForce(warned.map(w => w.cellKey));
            setCellWarnings(new Map());
            // Trigger re-save after state update (will be called manually)
          },
          () => {
            // User cancelled — keep warned entries as pending with visual indicators
          },
          {
            confirmText: 'Назначить',
            cancelText: 'Отменить',
            destructive: false,
            customContent: warningContent,
          },
        );

        if (failed.length > 0) {
          setSaveErrors(failed);
          showError(`${failed.length} из ${total} изменений не сохранено`);
        } else if (succeeded.length > 0) {
          showSuccess(`Сохранено ${succeeded.length} из ${total} изменений`);
        }
      } else if (failed.length > 0) {
        setSaveErrors(failed);
        showError(`${failed.length} из ${succeeded.length + failed.length} изменений не сохранено`);
      } else {
        discardPendingChanges();
        setCellWarnings(new Map());
        showSuccess(`Сохранено ${succeeded.length} изменений`);
      }
    } catch (err) {
      showError('Не удалось сохранить изменения');
    } finally {
      setIsSavingPending(false);
      refresh();
    }
  }, [schedule, pendingChanges, createEntry, updateEntry, deleteEntry, removeSucceeded, markForForce, discardPendingChanges, refresh, showSuccess, showError, showConfirm, setIsSavingPending, setSaveErrors, theme, groupMembers]);

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

  const handleAddEntry = useCallback(() => {
    setSelectedEntry(null); // null means create new
    setSelectedTemplateEntry(null);
    setShowEditEntryModal(true);
  }, []);

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
        isDraft={isDraft}
        onPublish={canEdit ? handlePublishSchedule : undefined}
        isPublishing={isPublishing}
        onAddEntry={canManageEntries ? handleAddEntry : undefined}
      />
    );
  }, [isElectron, isWideScreen, schedule, viewMode, canEdit, canManageEntries, handleOpenMenu, handleMenuButtonLayout, handleViewModeChange, pendingCount, handleSavePendingChanges, handleDiscardPendingChanges, isSavingPending, isDraft, handlePublishSchedule, isPublishing, handleAddEntry]);

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

  // Desktop navigation guard: prevent switching tabs via SideNavBar with unsaved changes
  useEffect(() => {
    if (!hasPendingChanges) return;

    const guard: NavigationGuard = (_targetTab) => {
      return new Promise<boolean>((resolve) => {
        showOptions(
          'Несохранённые изменения',
          [
            {
              text: `Сохранить (${pendingCount})`,
              onPress: async () => {
                await handleSavePendingChanges();
                resolve(true);
              },
              style: 'primary',
            },
            {
              text: 'Не сохранять',
              onPress: () => {
                discardPendingChanges();
                resolve(true);
              },
              style: 'destructive',
            },
          ],
          `У вас ${pendingCount} несохранённых изменений в графике.`,
          () => resolve(false), // onCancel — user dismissed the dialog
        );
      });
    };

    registerNavigationGuard(guard);
    return () => unregisterNavigationGuard(guard);
  }, [hasPendingChanges, pendingCount, handleSavePendingChanges, discardPendingChanges, showOptions, registerNavigationGuard, unregisterNavigationGuard]);

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
      const result = await updateEntry(schedule.id, entryId, data as UpdateScheduleEntryRequest);
      if (!result.created && result.warnings?.length) {
        // Warnings returned — ask user to confirm
        const content = renderWarningList(result.warnings, 'Сохранить изменения?');
        showConfirm(
          'Предупреждение',
          '',
          async () => {
            await updateEntry(schedule.id, entryId, { ...data, force: true } as UpdateScheduleEntryRequest);
            refresh();
          },
          undefined,
          { confirmText: 'Сохранить', cancelText: 'Отмена', destructive: false, customContent: content },
        );
        return;
      }
    } else {
      // Create new entry
      const result = await createEntry(schedule.id, data as CreateScheduleEntryRequest);
      if (!result.created && result.warnings?.length) {
        // Warnings returned — ask user to confirm
        const content = renderWarningList(result.warnings, 'Назначить смену?');
        showConfirm(
          'Предупреждение',
          '',
          async () => {
            await createEntry(schedule.id, { ...data, force: true } as CreateScheduleEntryRequest);
            refresh();
          },
          undefined,
          { confirmText: 'Назначить', cancelText: 'Отмена', destructive: false, customContent: content },
        );
        return;
      }
    }
    refresh();
  }, [schedule, createEntry, updateEntry, refresh, showConfirm]);

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

  // Handler for adding entry from Shifts View (immediate mode)
  const handleShiftsAddEntry = useCallback(async (
    userId: number,
    dateKey: string, // YYYY-MM-DD
    shiftType: ShiftType
  ) => {
    if (!schedule) return;

    try {
      const result = await createEntry(schedule.id, {
        user_id: userId,
        date: `${dateKey}T00:00:00Z`,
        shift_type: shiftType,
      });

      // If warnings returned without creation, ask user to confirm
      if (!result.created && result.warnings?.length) {
        const content = renderWarningList(result.warnings, 'Назначить смену?');
        showConfirm(
          'Предупреждение',
          '',
          async () => {
            try {
              await createEntry(schedule.id, {
                user_id: userId,
                date: `${dateKey}T00:00:00Z`,
                shift_type: shiftType,
                force: true,
              });
            } catch {
              showError('Не удалось создать запись');
            }
          },
          undefined,
          { confirmText: 'Назначить', cancelText: 'Отмена', destructive: false, customContent: content },
        );
      }
    } catch {
      showError('Не удалось создать запись');
    }
  }, [schedule, createEntry, showConfirm, showError]);

  // Handler for updating entry (replace user) from Shifts View
  const handleShiftsUpdateEntry = useCallback(async (entryId: number, userId: number) => {
    if (!schedule) return;
    try {
      const result = await updateEntry(schedule.id, entryId, { user_id: userId });
      if (!result.created && result.warnings?.length) {
        const content = renderWarningList(result.warnings, 'Сохранить изменения?');
        showConfirm(
          'Предупреждение',
          '',
          async () => {
            try {
              await updateEntry(schedule.id, entryId, { user_id: userId, force: true });
            } catch {
              showError('Не удалось обновить запись');
            }
          },
          undefined,
          { confirmText: 'Сохранить', cancelText: 'Отмена', destructive: false, customContent: content },
        );
      }
    } catch {
      showError('Не удалось обновить запись');
    }
  }, [schedule, updateEntry, showConfirm, showError]);

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
          // Desktop layout
          <View style={[
            styles.desktopLayout,
            isElectron && styles.viewTransitionContent,
            isElectron && viewTransitioning && styles.viewTransitionFadeOut,
          ]}>
            {/* Left sidebar - Collapsible Info Card */}
            {showInfoCard && (
              <View style={[styles.infoCardPanel, { backgroundColor: theme.card }]}>
                <View style={[styles.sidebarColorBar, { backgroundColor: typeColor }]} />

                <View style={styles.infoCardContent}>
                  <View style={styles.infoCardSection}>
                    <Text style={[styles.sidebarLabel, { color: theme.textSecondary }]}>Тип</Text>
                    <Text style={[styles.sidebarValue, { color: theme.text }]}>
                      {SCHEDULE_TYPE_LABELS[schedule.type]}
                    </Text>
                  </View>

                  <View style={styles.infoCardSection}>
                    <Text style={[styles.sidebarLabel, { color: theme.textSecondary }]}>Период</Text>
                    <Text style={[styles.sidebarValue, { color: theme.text }]}>
                      {formatScheduleDate(schedule.start_date, 'dd.MM.yyyy')} — {formatScheduleDate(schedule.end_date, 'dd.MM.yyyy')}
                    </Text>
                  </View>

                  <View style={styles.infoCardSection}>
                    <Text style={[styles.sidebarLabel, { color: theme.textSecondary }]}>Видимость</Text>
                    <Text style={[styles.sidebarValue, { color: theme.text }]}>
                      {VISIBILITY_LABELS[schedule.visibility]}
                    </Text>
                  </View>

                  {isDraft && (
                    <View style={[styles.infoCardDraftBadge, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
                      <Ionicons name="document-text-outline" size={14} color="#D97706" />
                      <Text style={styles.sidebarDraftText}>Черновик</Text>
                    </View>
                  )}

                  {schedule.description && (
                    <View style={[styles.infoCardSection, styles.infoCardDescriptionRow]}>
                      <Text style={[styles.sidebarLabel, { color: theme.textSecondary }]}>Описание</Text>
                      <Text style={[styles.sidebarDescription, { color: theme.text }]}>
                        {schedule.description}
                      </Text>
                    </View>
                  )}

                  {schedule.creator && (
                    <TouchableOpacity
                      style={[styles.infoCardCreator, { borderTopColor: theme.border }]}
                      onPress={handleCreatorPress}
                      activeOpacity={0.7}
                    >
                      <Avatar
                        name={schedule.creator.name}
                        imageUrl={schedule.creator.avatar}
                        size={32}
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
            )}

            {/* Right - Main Content (Entries) */}
            <View style={styles.desktopLeftColumn}>
              {/* Entries Section - Grid/Shifts View for desktop or List View */}
              {displayedViewMode === 'grid' && schedule.mode === 'monthly' ? (
                // Desktop Grid View - employees as rows, dates as columns
                <View style={[styles.desktopCard, { backgroundColor: theme.card }]}>
                  <View style={[styles.sectionHeader, styles.sectionHeaderFullWidth, { borderBottomColor: theme.border, backgroundColor: theme.card }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                      <TouchableOpacity
                        style={[styles.infoToggleButton, { width: 28, height: 28, borderColor: showInfoCard ? theme.primary : theme.border, backgroundColor: showInfoCard ? theme.primary + '12' : 'transparent' }]}
                        onPress={() => setShowInfoCard(!showInfoCard)}
                      >
                        <Ionicons name="information-circle-outline" size={16} color={showInfoCard ? theme.primary : theme.textSecondary} />
                      </TouchableOpacity>
                      <Text style={[styles.sectionTitle, { color: theme.text, fontSize: 14 }]} numberOfLines={1}>
                        {schedule.title}
                      </Text>
                    </View>
                  </View>
                  {/* Warning panel for cells with validation warnings */}
                  {cellWarnings.size > 0 && (
                    <View style={[styles.warningPanel, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
                      <View style={styles.warningPanelHeader}>
                        <View style={styles.warningPanelTitleRow}>
                          <Ionicons name="warning" size={16} color="#D97706" />
                          <Text style={[styles.warningPanelTitle, { color: '#92400E' }]}>
                            Предупреждения ({cellWarnings.size})
                          </Text>
                        </View>
                        <View style={styles.warningPanelActions}>
                          <TouchableOpacity
                            style={[styles.warningPanelButton, { backgroundColor: '#D97706' }]}
                            onPress={() => {
                              markForForce(Array.from(cellWarnings.keys()));
                              setCellWarnings(new Map());
                              handleSavePendingChanges();
                            }}
                          >
                            <Text style={styles.warningPanelButtonText}>Назначить все равно</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.warningPanelButton, { backgroundColor: '#9CA3AF' }]}
                            onPress={() => {
                              // Remove warned pending changes
                              for (const key of cellWarnings.keys()) {
                                const change = pendingChanges.get(key);
                                if (change) {
                                  removeSucceeded([key]);
                                }
                              }
                              setCellWarnings(new Map());
                            }}
                          >
                            <Text style={styles.warningPanelButtonText}>Отменить</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                      <View style={styles.warningPanelList}>
                        {Array.from(cellWarnings.entries()).map(([cellKey, warnings]) => {
                          const [userIdStr, dateKey] = cellKey.split('-', 2);
                          const fullDateKey = cellKey.substring(userIdStr.length + 1);
                          const member = groupMembers.find(m => m.id === Number(userIdStr));
                          return (
                            <View key={cellKey} style={styles.warningPanelItem}>
                              <Text style={[styles.warningPanelItemUser, { color: '#92400E' }]}>
                                {member?.name || `#${userIdStr}`} ({fullDateKey})
                              </Text>
                              {warnings.map((w, i) => (
                                <Text key={i} style={[styles.warningPanelItemMessage, { color: '#B45309' }]}>
                                  {w.type === 'absence' ? '📅' : '⚠️'} {w.message}
                                </Text>
                              ))}
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  )}
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
                      warningMap={cellWarnings}
                    />
                  )}
                </View>
              ) : displayedViewMode === 'shifts' && schedule.mode === 'monthly' ? (
                // Desktop Shifts View - dates as rows, morning/evening columns
                <View style={[styles.desktopCard, { backgroundColor: theme.card }]}>
                  <View style={[styles.sectionHeader, styles.sectionHeaderFullWidth, { borderBottomColor: theme.border, backgroundColor: theme.card }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                      <TouchableOpacity
                        style={[styles.infoToggleButton, { width: 28, height: 28, borderColor: showInfoCard ? theme.primary : theme.border, backgroundColor: showInfoCard ? theme.primary + '12' : 'transparent' }]}
                        onPress={() => setShowInfoCard(!showInfoCard)}
                      >
                        <Ionicons name="information-circle-outline" size={16} color={showInfoCard ? theme.primary : theme.textSecondary} />
                      </TouchableOpacity>
                      <Text style={[styles.sectionTitle, { color: theme.text, fontSize: 14 }]} numberOfLines={1}>
                        Смены ({filteredEntries.length})
                      </Text>
                    </View>
                    <TouchableOpacity
                      ref={filterButtonRef}
                      style={[
                        styles.userFilterChip,
                        { backgroundColor: theme.card, borderColor: theme.border },
                        filterUserId ? { borderColor: theme.primary, backgroundColor: theme.backgroundSecondary } : null,
                      ]}
                      onPress={() => {
                        if (isElectron && filterButtonRef.current) {
                          const rect = filterButtonRef.current.getBoundingClientRect?.();
                          if (rect) {
                            setFilterButtonPosition({ x: rect.left, y: rect.top, width: rect.width, height: rect.height });
                          }
                        }
                        setShowUserFilterPicker(true);
                      }}
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
                  {isLoadingEntries ? (
                    <View style={styles.entriesLoader}>
                      <ActivityIndicator size="small" color={theme.primary} />
                    </View>
                  ) : (
                    <ScheduleShiftsView
                      schedule={schedule}
                      entries={filteredEntries}
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
                  <View style={[styles.sectionHeader, styles.sectionHeaderFullWidth, { borderBottomColor: theme.border, backgroundColor: theme.card }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                      <TouchableOpacity
                        style={[styles.infoToggleButton, { width: 28, height: 28, borderColor: showInfoCard ? theme.primary : theme.border, backgroundColor: showInfoCard ? theme.primary + '12' : 'transparent' }]}
                        onPress={() => setShowInfoCard(!showInfoCard)}
                      >
                        <Ionicons name="information-circle-outline" size={16} color={showInfoCard ? theme.primary : theme.textSecondary} />
                      </TouchableOpacity>
                      <Text style={[styles.sectionTitle, { color: theme.text, fontSize: 14 }]} numberOfLines={1}>
                        {schedule.mode === 'recurring' ? 'Шаблон недели' : 'Смены'} (
                        {schedule.mode === 'recurring'
                          ? filteredTemplateEntries.length
                          : filteredEntries.length}
                        )
                      </Text>
                    </View>
                    <TouchableOpacity
                      ref={filterButtonRef}
                      style={[
                        styles.userFilterChip,
                        { backgroundColor: theme.card, borderColor: theme.border },
                        filterUserId ? { borderColor: theme.primary, backgroundColor: theme.backgroundSecondary } : null,
                      ]}
                      onPress={() => {
                        if (isElectron && filterButtonRef.current) {
                          const rect = filterButtonRef.current.getBoundingClientRect?.();
                          if (rect) {
                            setFilterButtonPosition({ x: rect.left, y: rect.top, width: rect.width, height: rect.height });
                          }
                        }
                        setShowUserFilterPicker(true);
                      }}
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

          </View>
        ) : (
          // Mobile: Original single-column layout
          <>
            {/* Draft banner with publish button (mobile) */}
            {isDraft && canEdit && !hasPendingChanges && (
              <View style={[styles.mobileDraftBanner, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
                <View style={styles.mobileDraftInfo}>
                  <Ionicons name="document-text-outline" size={18} color="#D97706" />
                  <Text style={styles.mobileDraftText}>
                    Черновик — не виден другим пользователям
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.mobilePublishButton, { opacity: isPublishing ? 0.6 : 1 }]}
                  onPress={handlePublishSchedule}
                  disabled={isPublishing}
                >
                  {isPublishing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="send" size={16} color="#FFFFFF" />
                      <Text style={styles.mobilePublishText}>Опубликовать</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

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

      {/* User Filter Picker - desktop: dropdown under button, mobile: centered modal */}
      {isElectron && isWideScreen && showUserFilterPicker && filterButtonPosition ? (
        <View
          style={{ position: 'fixed' as any, top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 }}
          // @ts-ignore - Web-only
          onClick={() => setShowUserFilterPicker(false)}
        >
          <View
            style={[
              styles.filterDropdown,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                top: filterButtonPosition.y + filterButtonPosition.height + 4,
                left: filterButtonPosition.x + filterButtonPosition.width - 280,
              },
            ]}
            // @ts-ignore - Web-only: prevent closing when clicking inside
            onClick={(e: any) => e.stopPropagation()}
          >
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
        </View>
      ) : (
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
      )}
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
  sectionHeaderFullWidth: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
    marginTop: -20,
    paddingTop: 12,
    paddingBottom: 10,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
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
    paddingBottom: 40,
  },
  desktopLayout: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 20,
  },
  desktopLeftColumn: {
    flex: 1,
  },
  viewTransitionContent: {
    ...Platform.select({
      web: {
        transition: 'opacity 0.15s ease-in-out',
      },
    }),
  } as any,
  viewTransitionFadeOut: {
    opacity: 0,
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

  // Info card panel styles (collapsible, above content)
  infoCardPanel: {
    width: 360,
    flexShrink: 0,
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
  infoCardContent: {
    padding: 16,
    paddingTop: 20,
    paddingVertical: 26,
  },
  infoCardSection: {
    marginBottom: 14,
  },
  infoCardDraftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
  },
  infoCardDescriptionRow: {
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
  },
  infoCardCreator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  sidebarColorBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
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
  sidebarDraftText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D97706',
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
  // Section header actions (Добавить + info button)
  sectionHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoToggleButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // User filter styles
  filterDropdown: {
    position: 'fixed' as any,
    width: 280,
    maxHeight: 360,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
      },
    }),
  } as any,
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

  // Warning panel styles
  warningPanel: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  warningPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  warningPanelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  warningPanelTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  warningPanelActions: {
    flexDirection: 'row',
    gap: 6,
  },
  warningPanelButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  warningPanelButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  warningPanelList: {
    marginTop: 8,
    gap: 4,
  },
  warningPanelItem: {
    gap: 2,
  },
  warningPanelItemUser: {
    fontSize: 12,
    fontWeight: '600',
  },
  warningPanelItemMessage: {
    fontSize: 11,
    paddingLeft: 4,
  },

  // Draft banner styles (mobile)
  mobileDraftBanner: {
    margin: 16,
    marginBottom: 0,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  mobileDraftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mobileDraftText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#92400E',
    flex: 1,
  },
  mobilePublishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingVertical: 10,
    borderRadius: 8,
  },
  mobilePublishText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

// Styles for warning confirmation dialogs
const warningStyles = StyleSheet.create({
  container: {
    gap: 8,
    marginBottom: 16,
  },
  userGroup: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    gap: 6,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
  },
  warningRow: {
    gap: 4,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingVertical: 2,
  },
  warningIcon: {
    fontSize: 13,
    lineHeight: 18,
  },
  warningText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  question: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
});
