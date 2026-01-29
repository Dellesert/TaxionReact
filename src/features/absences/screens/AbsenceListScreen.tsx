import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
  TextInput,
  Dimensions,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { useIsWideScreen } from '@shared/hooks/useIsWideScreen';
import { useTitleBarSearchIntegration } from '@shared/hooks/useTitleBarSearchIntegration';
import { useTitleBarControlsIntegration } from '@shared/hooks/useTitleBarControlsIntegration';
import { useNavigation } from '@react-navigation/native';
import { ScreenHeader } from '@shared/components/common/ScreenHeader';
import { useAbsenceStore } from '../store/absenceStore';
import { AbsenceList } from '../components/AbsenceList';
import { CreateAbsenceModal } from '../components/CreateAbsenceModal';
import { EditAbsenceModal } from '../components/EditAbsenceModal';
import { YearPicker } from '../components/YearPicker';
import { TitleBarAbsenceControls, AbsenceViewMode } from '../components/TitleBarAbsenceControls';
import { AbsenceYearCalendar } from '../components/AbsenceYearCalendar';
import UserSelectorModal from '@shared/components/common/UserSelectorModal';
import {
  Absence,
  AbsenceType,
  ABSENCE_TYPES,
  ABSENCE_TYPE_LABELS,
  ABSENCE_TYPE_COLORS,
} from '../types/absence.types';
import { AbsenceCard } from '../components/AbsenceCard';

// Type for sections grouped by absence type
interface AbsenceSection {
  type: AbsenceType;
  title: string;
  color: string;
  data: Absence[];
}

// Helper to get year date range
const getYearRange = (year: number): { start_date: string; end_date: string } => ({
  start_date: `${year}-01-01`,
  end_date: `${year}-12-31`,
});

// Storage key for view mode
const ABSENCE_VIEW_MODE_STORAGE_KEY = '@absence_view_mode';

// Filter options for the dropdown menu
const FILTER_OPTIONS: { key: AbsenceType | 'all'; label: string }[] = [
  { key: 'all', label: 'Все' },
  ...ABSENCE_TYPES.map((type) => ({ key: type, label: ABSENCE_TYPE_LABELS[type] })),
];

export const AbsenceListScreen: React.FC = () => {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();
  const filterButtonRef = useRef<View>(null);
  const isDesktop = useIsWideScreen();

  // Check if running in Electron
  const isElectron = Platform.OS === 'web' && typeof window !== 'undefined' && window.electron;

  const {
    absences,
    isLoading,
    hasMore,
    filters,
    loadAbsences,
    setFilters,
  } = useAbsenceStore();

  // Search state for desktop
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAbsence, setSelectedAbsence] = useState<Absence | null>(null);

  // Filter state
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [filterButtonPosition, setFilterButtonPosition] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<AbsenceType | null>(
    filters.type || null
  );
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());

  // User filter state
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string | null>(null);

  // View mode state (list vs calendar) - only for desktop
  const [viewMode, setViewMode] = useState<AbsenceViewMode>('list');
  const [isViewModeLoaded, setIsViewModeLoaded] = useState(false);

  // Load saved view mode on mount
  useEffect(() => {
    const loadViewMode = async () => {
      try {
        const saved = await AsyncStorage.getItem(ABSENCE_VIEW_MODE_STORAGE_KEY);
        if (saved && (saved === 'list' || saved === 'calendar')) {
          setViewMode(saved as AbsenceViewMode);
        }
      } catch (error) {
        console.error('Failed to load absence view mode:', error);
      } finally {
        setIsViewModeLoaded(true);
      }
    };
    loadViewMode();
  }, []);

  // Save view mode when it changes
  const handleViewModeChange = useCallback((mode: AbsenceViewMode) => {
    setViewMode(mode);
    AsyncStorage.setItem(ABSENCE_VIEW_MODE_STORAGE_KEY, mode).catch((error) => {
      console.error('Failed to save absence view mode:', error);
    });
  }, []);

  // Initial load with current year filter
  useEffect(() => {
    const yearRange = getYearRange(selectedYear);
    loadAbsences({ sort_order: 'asc', ...yearRange }, true);
  }, []);

  // Handle year change
  const handleYearChange = useCallback((year: number) => {
    setSelectedYear(year);
    const yearRange = getYearRange(year);
    const newFilters = { ...filters, ...yearRange };
    setFilters(newFilters);
    loadAbsences(newFilters, true);
  }, [filters, setFilters, loadAbsences]);

  const handleRefresh = useCallback(() => {
    loadAbsences(filters, true);
  }, [loadAbsences, filters]);

  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      loadAbsences(filters, false);
    }
  }, [loadAbsences, filters, isLoading, hasMore]);

  const handleAbsencePress = useCallback((absence: Absence) => {
    setSelectedAbsence(absence);
    setShowEditModal(true);
  }, []);


  const handleApplyFilter = useCallback((type: AbsenceType | null) => {
    setSelectedTypeFilter(type);
    const yearRange = getYearRange(selectedYear);
    const newFilters = {
      ...filters,
      ...yearRange,
      type: type || undefined,
      user_id: selectedUserId || undefined,
    };
    setFilters(newFilters);
    loadAbsences(newFilters, true);
    setShowFilterMenu(false);
  }, [filters, setFilters, loadAbsences, selectedYear, selectedUserId]);

  const handleUserFilterChange = useCallback((userId: number | null, userName: string | null) => {
    setSelectedUserId(userId);
    setSelectedUserName(userName);
    const yearRange = getYearRange(selectedYear);
    const newFilters = {
      ...filters,
      ...yearRange,
      user_id: userId || undefined,
    };
    setFilters(newFilters);
    loadAbsences(newFilters, true);
  }, [filters, setFilters, loadAbsences, selectedYear]);

  const handleFilterToggle = useCallback(() => {
    if (filterButtonRef.current) {
      filterButtonRef.current.measure((_x, _y, width, height, pageX, pageY) => {
        setFilterButtonPosition({ x: pageX, y: pageY, width, height });
      });
    }
    setShowFilterMenu(!showFilterMenu);
  }, [showFilterMenu]);

  const handleAbsenceCreated = useCallback(() => {
    loadAbsences(filters, true);
  }, [loadAbsences, filters]);

  const handleAbsenceUpdated = useCallback(() => {
    loadAbsences(filters, true);
  }, [loadAbsences, filters]);

  const handleAbsenceDeleted = useCallback(() => {
    loadAbsences(filters, true);
  }, [loadAbsences, filters]);

  // Handler for creating absence (defined early for TitleBar integration)
  const handleCreateAbsence = useCallback(() => {
    setShowCreateModal(true);
  }, []);

  // Integrate with TitleBar search in Electron
  useTitleBarSearchIntegration({
    searchQuery,
    onSearchChange: setSearchQuery,
    placeholder: 'Поиск нерабочих дней...',
    enabled: true,
  });

  // TitleBar left controls - year picker and view toggle
  const titleBarLeftControls = useMemo(() => {
    if (!isElectron || !isDesktop) return null;
    return (
      <TitleBarAbsenceControls
        selectedYear={selectedYear}
        onYearChange={handleYearChange}
        viewMode={viewMode}
        onViewModeChange={isViewModeLoaded ? handleViewModeChange : undefined}
        showYearPickerOnly
      />
    );
  }, [isElectron, isDesktop, selectedYear, handleYearChange, viewMode, handleViewModeChange, isViewModeLoaded]);

  // TitleBar right controls - filter and create buttons
  const titleBarRightControls = useMemo(() => {
    if (!isElectron || !isDesktop) return null;
    return (
      <TitleBarAbsenceControls
        selectedYear={selectedYear}
        onYearChange={handleYearChange}
        onFilterPress={handleFilterToggle}
        selectedTypeFilter={selectedTypeFilter}
        onCreatePress={handleCreateAbsence}
        showActionsOnly
        filterButtonRef={filterButtonRef}
      />
    );
  }, [isElectron, isDesktop, selectedYear, handleYearChange, handleFilterToggle, selectedTypeFilter, handleCreateAbsence]);

  // Integrate controls with TitleBar in Electron
  useTitleBarControlsIntegration({
    pageTitle: 'Нерабочие дни',
    leftControls: titleBarLeftControls,
    rightControls: titleBarRightControls,
    enabled: isElectron && isDesktop,
  });

  // Filter absences by search query
  const filteredAbsences = useMemo(() => {
    if (!searchQuery.trim()) return absences;
    const query = searchQuery.toLowerCase();
    return absences.filter(absence =>
      absence.user?.name?.toLowerCase().includes(query) ||
      ABSENCE_TYPE_LABELS[absence.type]?.toLowerCase().includes(query)
    );
  }, [absences, searchQuery]);

  // Group absences by type for desktop columns view
  const absenceSections = useMemo((): AbsenceSection[] => {
    const grouped = new Map<AbsenceType, Absence[]>();

    // Initialize groups for all types
    for (const type of ABSENCE_TYPES) {
      grouped.set(type, []);
    }

    // Group filtered absences by type
    for (const absence of filteredAbsences) {
      const typeAbsences = grouped.get(absence.type);
      if (typeAbsences) {
        typeAbsences.push(absence);
      }
    }

    // Convert to sections, filtering out empty groups
    return ABSENCE_TYPES
      .filter(type => (grouped.get(type)?.length ?? 0) > 0)
      .map(type => ({
        type,
        title: ABSENCE_TYPE_LABELS[type],
        color: ABSENCE_TYPE_COLORS[type],
        data: grouped.get(type) ?? [],
      }));
  }, [filteredAbsences]);

  // Render empty state for desktop
  const renderDesktopEmpty = useCallback(() => {
    if (isLoading) {
      return (
        <View style={styles.emptyContainerDesktop}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      );
    }

    return (
      <View style={styles.emptyContainerDesktop}>
        <Ionicons name="calendar-outline" size={48} color={theme.textSecondary} />
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          {searchQuery
            ? `Ничего не найдено по запросу "${searchQuery}"`
            : selectedTypeFilter
              ? `Нет типа "${ABSENCE_TYPE_LABELS[selectedTypeFilter]}" за ${selectedYear}`
              : `Нет отпусков за ${selectedYear}`}
        </Text>
      </View>
    );
  }, [isLoading, theme, searchQuery, selectedTypeFilter, selectedYear]);

  // Calculate menu position (under the filter button)
  const menuTop = filterButtonPosition
    ? filterButtonPosition.y + filterButtonPosition.height + (Platform.OS === 'ios' ? 4 : 8)
    : 60;

  // Calculate menu right position to align with button's right edge
  const screenWidth = Dimensions.get('window').width;
  const menuRight = filterButtonPosition
    ? screenWidth - (filterButtonPosition.x + filterButtonPosition.width)
    : 16;

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: (isElectron && isDesktop) ? theme.background : (isDesktop ? theme.card : theme.card) }
      ]}
      edges={['left', 'right']}
    >
      {Platform.OS === 'ios' && <StatusBar style={isDark ? 'light' : 'dark'} />}

      {/* Header - hide on Electron desktop since controls are in TitleBar */}
      {!(isElectron && isDesktop) && (
        isDesktop ? (
          // Desktop Header
          <View style={[styles.desktopHeader, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.desktopHeaderLeft}>
              <Text style={[styles.desktopTitle, { color: theme.text }]}>Нерабочие дни</Text>
              <YearPicker
                selectedYear={selectedYear}
                onYearChange={handleYearChange}
              />
            </View>
            <View style={styles.desktopHeaderRight}>
              {/* Search Input */}
              <View style={[styles.desktopSearchContainer, { backgroundColor: theme.input, borderColor: theme.inputBorder }]}>
                <Ionicons name="search" size={16} color={theme.textSecondary} />
                <TextInput
                  style={[styles.desktopSearchInput, { color: theme.text }]}
                  placeholder="Поиск..."
                  placeholderTextColor={theme.inputPlaceholder}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={16} color={theme.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
              {/* Filter Button */}
              <View ref={filterButtonRef} collapsable={false}>
                <TouchableOpacity
                  onPress={handleFilterToggle}
                  style={[styles.desktopIconButton, { backgroundColor: theme.backgroundSecondary }]}
                >
                  <Ionicons name="filter" size={20} color={selectedTypeFilter ? theme.primary : theme.textSecondary} />
                </TouchableOpacity>
              </View>
              {/* Add Button */}
              <TouchableOpacity
                onPress={handleCreateAbsence}
                style={[styles.desktopAddButton, { backgroundColor: theme.primary }]}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
                <Text style={styles.desktopAddButtonText}>Добавить</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          // Mobile Header
          <ScreenHeader
            title="Нерабочие дни"
            customContent={
              <>
                <View style={styles.headerRow}>
                  <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                      <Ionicons name="arrow-back" size={24} color={theme.primary} />
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.title, { color: theme.text }]}>Нерабочие дни</Text>

                  <View style={[styles.headerRight, styles.headerActions]}>
                    {/* Filter Button */}
                    <View ref={filterButtonRef} collapsable={false}>
                      <TouchableOpacity
                        onPress={handleFilterToggle}
                        style={styles.iconButton}
                      >
                        <Ionicons
                          name="filter"
                          size={24}
                          color={theme.error}
                        />
                        {selectedTypeFilter && (
                          <View style={[styles.filterIndicator, { backgroundColor: theme.primary }]} />
                        )}
                      </TouchableOpacity>
                    </View>

                    {/* Add Button */}
                    <TouchableOpacity
                      onPress={handleCreateAbsence}
                      style={styles.iconButton}
                    >
                      <Ionicons name="add" size={30} color={theme.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            }
          />
        )
      )}

      {/* Content */}
      <View style={[styles.contentContainer, { backgroundColor: theme.background }]}>
        {/* Year Picker - show only on mobile (desktop has it in header/titlebar) */}
        {!isDesktop && (
          <YearPicker
            selectedYear={selectedYear}
            onYearChange={handleYearChange}
          />
        )}

        {/* User Filter Chip - hide when in calendar mode (sidebar has user selection) */}
        {!(isElectron && isDesktop && viewMode === 'calendar') && (
          <View style={styles.userFilterContainer}>
            <TouchableOpacity
              style={[
                styles.userFilterChip,
                { backgroundColor: theme.card, borderColor: theme.border },
                selectedUserId ? { borderColor: theme.primary, backgroundColor: theme.backgroundSecondary } : null,
              ]}
              onPress={() => setShowUserPicker(true)}
            >
              <Ionicons
                name="person"
                size={16}
                color={selectedUserId ? theme.primary : theme.textSecondary}
              />
              <Text
                style={[
                  styles.userFilterText,
                  { color: selectedUserId ? theme.primary : theme.textSecondary },
                ]}
                numberOfLines={1}
              >
                {selectedUserName || 'Все сотрудники'}
              </Text>
              {selectedUserId ? (
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
        )}

        {/* Desktop layout for Electron - calendar or columns view */}
        {isElectron && isDesktop ? (
          viewMode === 'calendar' ? (
            <AbsenceYearCalendar
              year={selectedYear}
              absences={filteredAbsences}
              selectedTypeFilter={selectedTypeFilter}
              onAbsencePress={handleAbsencePress}
            />
          ) : (
            <ScrollView
              contentContainerStyle={styles.columnsScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {absenceSections.length === 0 ? (
                renderDesktopEmpty()
              ) : (
                <View style={styles.columnsContainer}>
                  {absenceSections.map((section) => (
                    <View
                      key={section.type}
                      style={[styles.typeColumn, { backgroundColor: theme.card, borderColor: theme.border }]}
                    >
                      <View style={[styles.columnHeader, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                        <View style={styles.columnHeaderLeft}>
                          <View style={[styles.columnColorDot, { backgroundColor: section.color }]} />
                          <Text style={[styles.columnTitle, { color: theme.text }]}>
                            {section.title}
                          </Text>
                        </View>
                        <View style={[styles.columnCount, { backgroundColor: theme.background }]}>
                          <Text style={[styles.columnCountText, { color: theme.textSecondary }]}>
                            {section.data.length}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.columnContentInner}>
                        {section.data.map((absence) => (
                          <AbsenceCard
                            key={absence.id}
                            absence={absence}
                            onPress={() => handleAbsencePress(absence)}
                          />
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          )
        ) : (
          // Mobile/tablet list layout
          <AbsenceList
            absences={filteredAbsences}
            isLoading={isLoading}
            onRefresh={handleRefresh}
            onLoadMore={handleLoadMore}
            onItemPress={handleAbsencePress}
            emptyMessage={
              searchQuery
                ? `Ничего не найдено по запросу "${searchQuery}"`
                : selectedTypeFilter
                  ? `Нет типа "${ABSENCE_TYPE_LABELS[selectedTypeFilter]}" за ${selectedYear}`
                  : `Нет отпусков за ${selectedYear}`
            }
          />
        )}
      </View>

      {/* Filter Menu Modal */}
      <Modal
        visible={showFilterMenu}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowFilterMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterMenu(false)}
        >
          <View style={[styles.filterMenu, { top: menuTop, right: menuRight, backgroundColor: theme.card }]}>
            {FILTER_OPTIONS.map((option) => {
              const isSelected = option.key === 'all' ? !selectedTypeFilter : selectedTypeFilter === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.filterMenuItem,
                    isSelected && [styles.filterMenuItemActive, { backgroundColor: theme.backgroundSecondary }],
                  ]}
                  onPress={() => handleApplyFilter(option.key === 'all' ? null : option.key)}
                >
                  <Text
                    style={[
                      styles.filterMenuItemText,
                      { color: theme.text },
                      isSelected && { color: theme.primary, fontWeight: '600' },
                    ]}
                  >
                    {option.label}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark" size={20} color={theme.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modals */}
      <CreateAbsenceModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onAbsenceCreated={handleAbsenceCreated}
      />

      <EditAbsenceModal
        visible={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedAbsence(null);
        }}
        absence={selectedAbsence}
        onAbsenceUpdated={handleAbsenceUpdated}
        onAbsenceDeleted={handleAbsenceDeleted}
      />

      {/* User Filter Modal */}
      <UserSelectorModal
        visible={showUserPicker}
        onClose={() => setShowUserPicker(false)}
        selectedUserIds={selectedUserId ? [selectedUserId] : []}
        onSelectionChange={(userIds, selectedUsers) => {
          if (userIds.length > 0) {
            handleUserFilterChange(userIds[0], selectedUsers?.[0]?.name || null);
          }
          setShowUserPicker(false);
        }}
        multiSelect={false}
        title="Фильтр по сотруднику"
        mode="radio"
        includeCurrentUser={true}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    overflow: 'hidden',
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
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerRight: {
    width: 100,
    justifyContent: 'flex-end',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconButton: {
    paddingHorizontal: 4,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  // Filter menu modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  filterMenu: {
    position: 'absolute',
    minWidth: 180,
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  filterMenuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 8,
  },
  filterMenuItemActive: {},
  filterMenuItemText: {
    fontSize: 15,
    fontWeight: '500',
  },
  // User filter styles
  userFilterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  userFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  userFilterText: {
    fontSize: 14,
    fontWeight: '500',
    maxWidth: 200,
  },
  // Desktop styles
  desktopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  desktopHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  desktopTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  desktopHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  desktopSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 200,
    gap: 8,
  },
  desktopSearchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
    height: 20,
  },
  desktopIconButton: {
    padding: 8,
    borderRadius: 8,
  },
  desktopAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  desktopAddButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  // Desktop columns layout
  columnsScrollContent: {
    flexGrow: 1,
  },
  columnsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 16,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  emptyContainerDesktop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
    minWidth: '100%',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 300,
  },
  typeColumn: {
    width: 320,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    flexShrink: 0,
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  columnHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  columnColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  columnTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  columnCount: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  columnCountText: {
    fontSize: 12,
    fontWeight: '500',
  },
  columnContentInner: {
    padding: 8,
    gap: 8,
    paddingBottom: 12,
  },
});

export default AbsenceListScreen;
