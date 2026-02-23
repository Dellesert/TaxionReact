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
  FlatList,
} from 'react-native';
import { StatusBar, setStatusBarStyle } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { useIsWideScreen } from '@shared/hooks/useIsWideScreen';
import { useAnimationType } from '@shared/hooks/useAnimationType';
import { useTitleBarControlsIntegration } from '@shared/hooks/useTitleBarControlsIntegration';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ScreenHeader } from '@shared/components/common/ScreenHeader';
import { useAbsenceStore } from '../store/absenceStore';
import { AbsenceList } from '../components/AbsenceList';
import { CreateAbsenceModal } from '../components/CreateAbsenceModal';
import { EditAbsenceModal } from '../components/EditAbsenceModal';
import { YearPicker } from '../components/YearPicker';
import { TitleBarAbsenceControls, AbsenceViewMode } from '../components/TitleBarAbsenceControls';
import { AbsenceYearCalendar } from '../components/AbsenceYearCalendar';
import { AbsenceTimeline } from '../components/AbsenceTimeline';
import {
  Absence,
  AbsenceType,
  AbsenceColorMode,
  ABSENCE_TYPES,
  ABSENCE_TYPE_LABELS,
  ABSENCE_TYPE_COLORS,
} from '../types/absence.types';
import { AbsenceCard } from '../components/AbsenceCard';
import { Avatar } from '@shared/components/common/Avatar';
import { CustomScrollView } from '@shared/components/common/CustomScrollView';
import { getUserColorById } from '../constants/userColors.constants';

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

// Storage keys
const ABSENCE_VIEW_MODE_STORAGE_KEY = '@absence_view_mode';
const ABSENCE_COLOR_MODE_STORAGE_KEY = '@absence_color_mode';

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
  const animationType = useAnimationType('fade');

  // Reset status bar style when screen gains focus (fixes white status bar after visiting Profile)
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle(isDark ? 'light' : 'dark');
    }, [isDark])
  );

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
  const userFilterButtonRef = useRef<any>(null);
  const [userFilterButtonPosition, setUserFilterButtonPosition] = useState<{ x: number; y: number; width: number; height: number } | undefined>();

  // View mode state (list vs calendar) - only for desktop
  const [viewMode, setViewMode] = useState<AbsenceViewMode>('list');
  const [isViewModeLoaded, setIsViewModeLoaded] = useState(false);

  // Color mode state (by_type vs by_user)
  const [colorMode, setColorMode] = useState<AbsenceColorMode>('by_type');

  // Load saved view mode and color mode on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [savedViewMode, savedColorMode] = await Promise.all([
          AsyncStorage.getItem(ABSENCE_VIEW_MODE_STORAGE_KEY),
          AsyncStorage.getItem(ABSENCE_COLOR_MODE_STORAGE_KEY),
        ]);
        if (savedViewMode && (savedViewMode === 'list' || savedViewMode === 'calendar' || savedViewMode === 'timeline')) {
          setViewMode(savedViewMode as AbsenceViewMode);
        }
        if (savedColorMode && (savedColorMode === 'by_type' || savedColorMode === 'by_user')) {
          setColorMode(savedColorMode as AbsenceColorMode);
        }
      } catch (error) {
        console.error('Failed to load absence settings:', error);
      } finally {
        setIsViewModeLoaded(true);
      }
    };
    loadSettings();
  }, []);

  // Save view mode when it changes
  const handleViewModeChange = useCallback((mode: AbsenceViewMode) => {
    setViewMode(mode);
    AsyncStorage.setItem(ABSENCE_VIEW_MODE_STORAGE_KEY, mode).catch((error) => {
      console.error('Failed to save absence view mode:', error);
    });
  }, []);

  // Save color mode when it changes
  const handleColorModeChange = useCallback((mode: AbsenceColorMode) => {
    setColorMode(mode);
    AsyncStorage.setItem(ABSENCE_COLOR_MODE_STORAGE_KEY, mode).catch((error) => {
      console.error('Failed to save absence color mode:', error);
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


  // TitleBar left controls - year picker and view toggle
  // In calendar view, year picker is shown in the card header instead
  const titleBarLeftControls = useMemo(() => {
    if (!isElectron || !isDesktop) return null;
    return (
      <TitleBarAbsenceControls
        selectedYear={selectedYear}
        onYearChange={handleYearChange}
        viewMode={viewMode}
        onViewModeChange={isViewModeLoaded ? handleViewModeChange : undefined}
        colorMode={colorMode}
        onColorModeChange={handleColorModeChange}
        showYearPickerOnly
        hideYearPicker={viewMode === 'calendar'}
      />
    );
  }, [isElectron, isDesktop, selectedYear, handleYearChange, viewMode, handleViewModeChange, isViewModeLoaded, colorMode, handleColorModeChange]);

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

  // Unique users from absences for the filter dropdown
  const absenceUsers = useMemo(() => {
    const usersMap = new Map<number, { id: number; name: string; avatar?: string }>();
    for (const absence of absences) {
      if (absence.user && !usersMap.has(absence.user.id)) {
        usersMap.set(absence.user.id, {
          id: absence.user.id,
          name: absence.user.name,
          avatar: absence.user.avatar,
        });
      }
    }
    return Array.from(usersMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [absences]);

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
      <StatusBar style={isDark ? 'light' : 'dark'} />

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

        {/* User Filter Chip - hide on desktop Electron (integrated into view headers) */}
        {!(isElectron && isDesktop) && (
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

        {/* Desktop layout for Electron - calendar, timeline or columns view */}
        {isElectron && isDesktop ? (
          viewMode === 'calendar' ? (
            <View style={styles.calendarDesktopRow}>
              {/* Left Sidebar - Employees */}
              <View style={[styles.calendarSidebar, { backgroundColor: isDark ? theme.card : '#FFFFFF', borderColor: theme.border }]}>
                <View style={[styles.calendarSidebarHeader, { borderColor: theme.border }]}>
                  <Text style={[styles.calendarSidebarTitle, { color: theme.text }]}>Сотрудники</Text>
                </View>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.calendarSidebarContent}>
                  {/* All employees option */}
                  <TouchableOpacity
                    style={[
                      styles.employeeItem,
                      { backgroundColor: !selectedUserId ? theme.primary + '15' : 'transparent' },
                    ]}
                    onPress={() => handleUserFilterChange(null, null)}
                  >
                    <View style={[styles.employeeAvatar, { backgroundColor: theme.backgroundSecondary }]}>
                      <Ionicons name="people" size={18} color={theme.textSecondary} />
                    </View>
                    <Text style={[styles.employeeName, { color: !selectedUserId ? theme.primary : theme.text }]}>
                      Все сотрудники
                    </Text>
                    {!selectedUserId && (
                      <Ionicons name="checkmark" size={18} color={theme.primary} />
                    )}
                  </TouchableOpacity>
                  {/* Unique users from absences */}
                  {(() => {
                    const usersMap = new Map<number, { id: number; name: string; avatar?: string; count: number }>();
                    for (const absence of filteredAbsences) {
                      if (absence.user) {
                        const existing = usersMap.get(absence.user.id);
                        if (existing) {
                          existing.count++;
                        } else {
                          usersMap.set(absence.user.id, {
                            id: absence.user.id,
                            name: absence.user.name,
                            avatar: absence.user.avatar,
                            count: 1,
                          });
                        }
                      }
                    }
                    const users = Array.from(usersMap.values()).sort((a, b) => a.name.localeCompare(b.name));
                    return users.map((user) => (
                      <TouchableOpacity
                        key={user.id}
                        style={[
                          styles.employeeItem,
                          { backgroundColor: selectedUserId === user.id ? theme.primary + '15' : 'transparent' },
                        ]}
                        onPress={() => handleUserFilterChange(user.id, user.name)}
                      >
                        <Avatar name={user.name} imageUrl={user.avatar} size={32} />
                        <Text
                          style={[styles.employeeName, { color: selectedUserId === user.id ? theme.primary : theme.text }]}
                          numberOfLines={1}
                        >
                          {user.name}
                        </Text>
                        <View style={[styles.employeeCount, { backgroundColor: theme.backgroundSecondary }]}>
                          <Text style={[styles.employeeCountText, { color: theme.textSecondary }]}>{user.count}</Text>
                        </View>
                        {selectedUserId === user.id && (
                          <Ionicons name="checkmark" size={18} color={theme.primary} />
                        )}
                      </TouchableOpacity>
                    ));
                  })()}
                </ScrollView>
                {/* Legend by color mode */}
                <View style={[styles.sidebarLegend, { borderColor: theme.border }]}>
                  <View style={styles.legendItems}>
                    {colorMode === 'by_user' ? (
                      (() => {
                        const usersMap = new Map<number, { id: number; name: string; color?: string }>();
                        for (const absence of filteredAbsences) {
                          if (absence.user && !usersMap.has(absence.user.id)) {
                            usersMap.set(absence.user.id, {
                              id: absence.user.id,
                              name: absence.user.name,
                              color: absence.user.color,
                            });
                          }
                        }
                        return Array.from(usersMap.values())
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map((user) => (
                            <View key={user.id} style={styles.legendItem}>
                              <View style={[styles.legendColorBar, { backgroundColor: user.color || getUserColorById(user.id) }]} />
                              <Text style={[styles.legendText, { color: theme.textSecondary }]} numberOfLines={1}>
                                {user.name}
                              </Text>
                            </View>
                          ));
                      })()
                    ) : (
                      ABSENCE_TYPES
                        .filter(type => filteredAbsences.some(a => a.type === type))
                        .map((type) => (
                          <View key={type} style={styles.legendItem}>
                            <View style={[styles.legendColorBar, { backgroundColor: ABSENCE_TYPE_COLORS[type] }]} />
                            <Text style={[styles.legendText, { color: theme.textSecondary }]}>
                              {ABSENCE_TYPE_LABELS[type]}
                            </Text>
                          </View>
                        ))
                    )}
                  </View>
                </View>
              </View>
              {/* Main Panel - Year Calendar */}
              <View style={[styles.calendarMainPanel, { backgroundColor: isDark ? theme.card : '#FFFFFF', borderColor: theme.border }]}>
                <View style={[styles.calendarMainHeader, { borderColor: theme.border }]}>
                  <Text style={[styles.calendarMainTitle, { color: theme.text }]}>Календарь</Text>
                  {/* Year Picker in card header */}
                  <View style={styles.calendarHeaderYearPicker}>
                    <TouchableOpacity
                      onPress={() => handleYearChange(selectedYear - 1)}
                      style={styles.calendarHeaderArrow}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="chevron-back" size={16} color={theme.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleYearChange(new Date().getFullYear())}
                      activeOpacity={selectedYear === new Date().getFullYear() ? 1 : 0.6}
                      disabled={selectedYear === new Date().getFullYear()}
                    >
                      <Text style={[styles.calendarHeaderYearText, { color: theme.text }]}>
                        {selectedYear}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleYearChange(selectedYear + 1)}
                      style={styles.calendarHeaderArrow}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>
                <AbsenceYearCalendar
                  year={selectedYear}
                  absences={filteredAbsences}
                  selectedTypeFilter={selectedTypeFilter}
                  colorMode={colorMode}
                  onAbsencePress={handleAbsencePress}
                />
              </View>
            </View>
          ) : viewMode === 'timeline' ? (
            <AbsenceTimeline
              year={selectedYear}
              absences={filteredAbsences}
              selectedTypeFilter={selectedTypeFilter}
              colorMode={colorMode}
              onAbsencePress={handleAbsencePress}
            />
          ) : (
            <View style={[styles.listCard, { backgroundColor: isDark ? theme.card : '#FFFFFF', borderColor: theme.border }]}>
              {/* List Header - year picker left, user filter right */}
              <View style={[styles.listCardHeader, { borderColor: theme.border }]}>
                <View style={styles.listCardHeaderLeft}>
                  <TouchableOpacity
                    onPress={() => handleYearChange(selectedYear - 1)}
                    style={styles.listHeaderArrow}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="chevron-back" size={16} color={theme.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleYearChange(new Date().getFullYear())}
                    activeOpacity={selectedYear === new Date().getFullYear() ? 1 : 0.6}
                    disabled={selectedYear === new Date().getFullYear()}
                  >
                    <Text style={[styles.listHeaderYearText, { color: theme.text }]}>
                      {selectedYear}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleYearChange(selectedYear + 1)}
                    style={styles.listHeaderArrow}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  ref={userFilterButtonRef}
                  style={[
                    styles.listHeaderUserFilter,
                    { borderColor: theme.border },
                    selectedUserId ? { borderColor: theme.primary, backgroundColor: theme.primary + '10' } : null,
                  ]}
                  onPress={() => {
                    if (isElectron && userFilterButtonRef.current) {
                      const rect = userFilterButtonRef.current.getBoundingClientRect?.();
                      if (rect) {
                        setUserFilterButtonPosition({ x: rect.left, y: rect.top, width: rect.width, height: rect.height });
                      }
                    }
                    setShowUserPicker(true);
                  }}
                >
                  <Ionicons
                    name="person"
                    size={15}
                    color={selectedUserId ? theme.primary : theme.textSecondary}
                  />
                  <Text
                    style={[
                      styles.listHeaderUserFilterText,
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
                      <Ionicons name="close-circle" size={16} color={theme.primary} />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons name="chevron-down" size={14} color={theme.textSecondary} />
                  )}
                </TouchableOpacity>
              </View>
              {/* List Content */}
              <ScrollView
                contentContainerStyle={styles.rowsScrollContent}
                showsVerticalScrollIndicator={false}
              >
                {absenceSections.length === 0 ? (
                  renderDesktopEmpty()
                ) : (
                  <View style={styles.rowsContainer}>
                    {absenceSections.map((section) => (
                      <View
                        key={section.type}
                        style={styles.typeRow}
                      >
                        <View style={[styles.rowHeader, { backgroundColor: theme.card, borderColor: theme.border }]}>
                          <View style={[styles.rowColorDot, { backgroundColor: section.color }]} />
                          <Text style={[styles.rowTitle, { color: theme.text }]}>
                            {section.title}
                          </Text>
                          <View style={[styles.rowCount, { backgroundColor: theme.background }]}>
                            <Text style={[styles.rowCountText, { color: theme.textSecondary }]}>
                              {section.data.length}
                            </Text>
                          </View>
                        </View>
                        <CustomScrollView
                          horizontal
                          thumbColor={`${section.color}66`}
                          style={styles.rowCardsScroll}
                        >
                          {section.data.map((absence) => (
                            <View key={absence.id} style={styles.rowCardWrapper}>
                              <AbsenceCard
                                absence={absence}
                                onPress={() => handleAbsencePress(absence)}
                                style={styles.rowCardStretch}
                              />
                            </View>
                          ))}
                        </CustomScrollView>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            </View>
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
        animationType={animationType}
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

      {/* User Filter Picker - desktop: dropdown under button, mobile: centered modal */}
      {isElectron && isDesktop && showUserPicker && userFilterButtonPosition ? (
        <View
          style={{ position: 'fixed' as any, top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 }}
          // @ts-ignore - Web-only
          onClick={() => setShowUserPicker(false)}
        >
          <View
            style={[
              styles.userFilterDropdown,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                top: userFilterButtonPosition.y + userFilterButtonPosition.height + 4,
                left: userFilterButtonPosition.x + userFilterButtonPosition.width - 280,
              },
            ]}
            // @ts-ignore - Web-only: prevent closing when clicking inside
            onClick={(e: any) => e.stopPropagation()}
          >
            <TouchableOpacity
              style={[
                styles.userFilterDropdownItem,
                { borderBottomColor: theme.border },
                !selectedUserId && { backgroundColor: theme.backgroundSecondary },
              ]}
              onPress={() => {
                handleUserFilterChange(null, null);
                setShowUserPicker(false);
              }}
            >
              <Ionicons name="people-outline" size={20} color={theme.primary} />
              <Text style={[styles.userFilterDropdownItemText, { color: theme.text }]}>
                Все сотрудники
              </Text>
              {!selectedUserId && (
                <Ionicons name="checkmark" size={20} color={theme.primary} />
              )}
            </TouchableOpacity>
            <FlatList
              data={absenceUsers}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.userFilterDropdownItem,
                    { borderBottomColor: theme.border },
                    selectedUserId === item.id && { backgroundColor: theme.backgroundSecondary },
                  ]}
                  onPress={() => {
                    handleUserFilterChange(item.id, item.name);
                    setShowUserPicker(false);
                  }}
                >
                  <Avatar name={item.name} imageUrl={item.avatar} size={28} />
                  <Text style={[styles.userFilterDropdownItemText, { color: theme.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {selectedUserId === item.id && (
                    <Ionicons name="checkmark" size={20} color={theme.primary} />
                  )}
                </TouchableOpacity>
              )}
              style={styles.userFilterDropdownList}
            />
          </View>
        </View>
      ) : (
        <Modal
          visible={showUserPicker}
          transparent
          animationType={animationType}
          onRequestClose={() => setShowUserPicker(false)}
        >
          <TouchableOpacity
            style={styles.userFilterModalOverlay}
            activeOpacity={1}
            onPress={() => setShowUserPicker(false)}
          >
            <View style={[styles.userFilterModalContent, { backgroundColor: theme.card }]}>
              <Text style={[styles.userFilterModalTitle, { color: theme.text }]}>
                Фильтр по сотруднику
              </Text>
              <TouchableOpacity
                style={[
                  styles.userFilterDropdownItem,
                  { borderBottomColor: theme.border },
                  !selectedUserId && { backgroundColor: theme.backgroundSecondary },
                ]}
                onPress={() => {
                  handleUserFilterChange(null, null);
                  setShowUserPicker(false);
                }}
              >
                <Ionicons name="people-outline" size={20} color={theme.primary} />
                <Text style={[styles.userFilterDropdownItemText, { color: theme.text }]}>
                  Все сотрудники
                </Text>
                {!selectedUserId && (
                  <Ionicons name="checkmark" size={20} color={theme.primary} />
                )}
              </TouchableOpacity>
              <FlatList
                data={absenceUsers}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.userFilterDropdownItem,
                      { borderBottomColor: theme.border },
                      selectedUserId === item.id && { backgroundColor: theme.backgroundSecondary },
                    ]}
                    onPress={() => {
                      handleUserFilterChange(item.id, item.name);
                      setShowUserPicker(false);
                    }}
                  >
                    <Avatar name={item.name} imageUrl={item.avatar} size={28} />
                    <Text style={[styles.userFilterDropdownItemText, { color: theme.text }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {selectedUserId === item.id && (
                      <Ionicons name="checkmark" size={20} color={theme.primary} />
                    )}
                  </TouchableOpacity>
                )}
                style={styles.userFilterDropdownList}
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
  // User filter dropdown styles
  userFilterDropdown: {
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
  userFilterDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  userFilterDropdownItemText: {
    fontSize: 15,
    flex: 1,
  },
  userFilterDropdownList: {
    flexGrow: 0,
  },
  userFilterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  userFilterModalContent: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  userFilterModalTitle: {
    fontSize: 17,
    fontWeight: '600',
    padding: 16,
    paddingBottom: 12,
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
  // Desktop list card layout
  listCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    margin: 16,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      // @ts-ignore - web only
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    }),
  },
  listCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    minHeight: 56,
  },
  listCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  listHeaderArrow: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listHeaderYearText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 24,
    marginHorizontal: 4,
  },
  listHeaderUserFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  listHeaderUserFilterText: {
    fontSize: 13,
    fontWeight: '500',
    maxWidth: 180,
  },
  // Desktop horizontal rows layout
  rowsScrollContent: {
    flexGrow: 1,
  },
  rowsContainer: {
    padding: 16,
    gap: 20,
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
  typeRow: {
    gap: 10,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'flex-start',
    gap: 8,
  },
  rowColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  rowCount: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  rowCountText: {
    fontSize: 12,
    fontWeight: '500',
  },
  rowCardsScroll: {
    gap: 10,
    paddingHorizontal: 2,
    paddingTop: 2,
    paddingBottom: 14,
  },
  rowCardWrapper: {
    width: 280,
    alignSelf: 'stretch' as const,
  },
  rowCardStretch: {
    flex: 1,
    marginBottom: 0,
  },
  // Calendar desktop two-panel layout
  calendarDesktopRow: {
    flex: 1,
    flexDirection: 'row',
  },
  calendarSidebar: {
    width: 380,
    borderRadius: 16,
    borderWidth: 1,
    margin: 16,
    marginRight: 0,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      // @ts-ignore - web only
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    }),
  },
  calendarSidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    minHeight: 56,
  },
  calendarSidebarTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  calendarSidebarContent: {
    padding: 8,
  },
  employeeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  employeeAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  employeeName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  employeeCount: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  employeeCountText: {
    fontSize: 12,
    fontWeight: '500',
  },
  sidebarLegend: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendColorBar: {
    width: 16,
    height: 4,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '500',
  },
  calendarMainPanel: {
    flex: 1,
    minWidth: 0,
    borderRadius: 16,
    borderWidth: 1,
    margin: 16,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      // @ts-ignore - web only
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    }),
  },
  calendarMainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    minHeight: 56,
  },
  calendarMainTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  calendarHeaderYearPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  calendarHeaderArrow: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarHeaderYearText: {
    fontSize: 15,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'center',
    lineHeight: 24,
    marginHorizontal: 12,
  },
});

export default AbsenceListScreen;
