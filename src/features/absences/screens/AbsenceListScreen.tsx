import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { useNavigation } from '@react-navigation/native';
import { ScreenHeader } from '@shared/components/common/ScreenHeader';
import { useAbsenceStore } from '../store/absenceStore';
import { AbsenceList } from '../components/AbsenceList';
import { CreateAbsenceModal } from '../components/CreateAbsenceModal';
import { EditAbsenceModal } from '../components/EditAbsenceModal';
import {
  Absence,
  AbsenceType,
  ABSENCE_TYPES,
  ABSENCE_TYPE_LABELS,
} from '../types/absence.types';

// Filter options for the dropdown menu
const FILTER_OPTIONS: { key: AbsenceType | 'all'; label: string }[] = [
  { key: 'all', label: 'Все' },
  ...ABSENCE_TYPES.map((type) => ({ key: type, label: ABSENCE_TYPE_LABELS[type] })),
];

export const AbsenceListScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const filterButtonRef = useRef<View>(null);

  const {
    absences,
    isLoading,
    hasMore,
    filters,
    loadAbsences,
    setFilters,
  } = useAbsenceStore();

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

  // Initial load
  useEffect(() => {
    loadAbsences({}, true);
  }, []);

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

  const handleEditAbsence = useCallback((absence: Absence) => {
    setSelectedAbsence(absence);
    setShowEditModal(true);
  }, []);

  const handleApplyFilter = useCallback((type: AbsenceType | null) => {
    setSelectedTypeFilter(type);
    setFilters({ ...filters, type: type || undefined });
    loadAbsences({ ...filters, type: type || undefined }, true);
    setShowFilterMenu(false);
  }, [filters, setFilters, loadAbsences]);

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

  // Calculate menu position
  const menuTop = filterButtonPosition
    ? filterButtonPosition.y + filterButtonPosition.height + (Platform.OS === 'ios' ? 4 : 8)
    : 60;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.card }]} edges={['left', 'right']}>
      {/* Header */}
      <ScreenHeader
        title="Отсутствия"
        customContent={
          <>
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={24} color={theme.primary} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.title, { color: theme.text }]}>Отсутствия</Text>

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
                  onPress={() => setShowCreateModal(true)}
                  style={styles.iconButton}
                >
                  <Ionicons name="add" size={30} color={theme.primary} />
                </TouchableOpacity>
              </View>
            </View>
          </>
        }
      />

      {/* Content */}
      <View style={[styles.contentContainer, { backgroundColor: theme.background }]}>
        <AbsenceList
          absences={absences}
          isLoading={isLoading}
          onRefresh={handleRefresh}
          onLoadMore={handleLoadMore}
          onItemPress={handleAbsencePress}
          onItemEdit={handleEditAbsence}
          emptyMessage={
            selectedTypeFilter
              ? `Нет отсутствий типа "${ABSENCE_TYPE_LABELS[selectedTypeFilter]}"`
              : 'Нет отсутствий'
          }
        />
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
          <View style={[styles.filterMenu, { top: menuTop, backgroundColor: theme.card }]}>
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
    right: 16,
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
});

export default AbsenceListScreen;
