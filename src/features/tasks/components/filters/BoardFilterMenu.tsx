import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Platform, ScrollView, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import type { AdvancedTaskFilters } from '../../utils/taskListHelpers';
import { FILTER_CHIPS } from '../../utils/taskListHelpers';
import type { TaskPriority } from '../../types/task.types';

interface BoardFilterMenuProps {
  visible: boolean;
  currentFilters: AdvancedTaskFilters;
  onFiltersChange: (filters: AdvancedTaskFilters) => void;
  onClose: () => void;
  buttonPosition?: { x: number; y: number; width: number; height: number };
  isDesktop?: boolean;
}

const PRIORITY_OPTIONS: { key: TaskPriority; label: string; color: string }[] = [
  { key: 'low', label: 'Низкий', color: '#10B981' },
  { key: 'medium', label: 'Средний', color: '#3B82F6' },
  { key: 'high', label: 'Высокий', color: '#F59E0B' },
  { key: 'critical', label: 'Критичный', color: '#EF4444' },
];

const SORT_OPTIONS: {
  key: 'created_at' | 'updated_at' | 'due_date' | 'priority' | 'title' | 'progress_percentage';
  label: string;
  icon: string
}[] = [
  { key: 'created_at', label: 'По дате создания', icon: 'calendar' },
  { key: 'updated_at', label: 'По дате обновления', icon: 'sync' },
  { key: 'due_date', label: 'По дедлайну', icon: 'time' },
  { key: 'priority', label: 'По приоритету', icon: 'alert-circle' },
  { key: 'title', label: 'По названию', icon: 'text' },
  { key: 'progress_percentage', label: 'По прогрессу', icon: 'stats-chart' },
];

export const BoardFilterMenu: React.FC<BoardFilterMenuProps> = ({
  visible,
  currentFilters,
  onFiltersChange,
  onClose,
  buttonPosition,
  isDesktop = false,
}) => {
  const { theme, isDark } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [tempFilters, setTempFilters] = useState<AdvancedTaskFilters>(currentFilters);

  // Menu width (same as styles below)
  const menuWidth = isDesktop ? 380 : 320;

  // Calculate menu position
  const menuTop = buttonPosition
    ? buttonPosition.y + buttonPosition.height + (Platform.OS === 'ios' ? 4 : 8)
    : isDesktop ? 70 : 60;

  // Smart positioning: check if menu fits on the right, otherwise align to right edge
  let menuRight: number | undefined;
  let menuLeft: number | undefined;

  if (buttonPosition?.x !== undefined) {
    // Calculate if menu would overflow on the right
    const wouldOverflow = buttonPosition.x + menuWidth > windowWidth - 16;

    if (wouldOverflow) {
      // Align menu to right edge of screen with padding
      menuRight = 16;
    } else {
      // Position menu from the left edge of the button
      menuLeft = buttonPosition.x;
    }
  } else {
    // Fallback: align to right
    menuRight = 16;
  }

  // Toggle priority
  const togglePriority = (priority: TaskPriority) => {
    const newPriorities = tempFilters.priorities.includes(priority)
      ? tempFilters.priorities.filter(p => p !== priority)
      : [...tempFilters.priorities, priority];
    setTempFilters({ ...tempFilters, priorities: newPriorities });
  };

  // Apply filters
  const handleApply = () => {
    // Ensure statuses are always cleared for board view
    const filtersForBoard: AdvancedTaskFilters = {
      ...tempFilters,
      statuses: [], // Board doesn't use status filters (columns are already by status)
    };
    onFiltersChange(filtersForBoard);
    onClose();
  };

  // Reset filters
  const handleReset = () => {
    const defaultFilters: AdvancedTaskFilters = {
      baseFilter: 'all',
      statuses: [],
      priorities: [],
      hasSubtasks: null,
      hasOverdueDeadline: false,
      isDelegated: false,
      sortBy: 'created_at',
      sortDirection: 'desc',
    };
    setTempFilters(defaultFilters);
    onFiltersChange(defaultFilters);
    onClose();
  };

  // Check if any filters are active
  const hasActiveFilters =
    tempFilters.baseFilter !== 'all' ||
    tempFilters.priorities.length > 0 ||
    tempFilters.hasSubtasks !== null ||
    tempFilters.hasOverdueDeadline ||
    tempFilters.isDelegated ||
    tempFilters.sortBy !== 'created_at' ||
    tempFilters.sortDirection !== 'desc';

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={[
            styles.filterMenu,
            isDesktop ? styles.filterMenuDesktop : styles.filterMenuMobile,
            {
              top: menuTop,
              right: menuRight,
              left: menuLeft,
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
          onStartShouldSetResponder={() => true}
        >
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
              <Text style={[styles.headerTitle, { color: theme.text }]}>Фильтры</Text>
              {hasActiveFilters && (
                <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
                  <Text style={[styles.resetButtonText, { color: theme.primary }]}>Сбросить</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Base Filter Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Базовый фильтр</Text>
              <View style={styles.chipContainer}>
                {FILTER_CHIPS.map((chip) => (
                  <TouchableOpacity
                    key={chip.key}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: tempFilters.baseFilter === chip.key
                          ? theme.primary + '20'
                          : isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                        borderColor: tempFilters.baseFilter === chip.key ? theme.primary : 'transparent',
                      },
                    ]}
                    onPress={() => setTempFilters({ ...tempFilters, baseFilter: chip.key })}
                  >
                    {tempFilters.baseFilter === chip.key && (
                      <Ionicons name="checkmark-circle" size={16} color={theme.primary} style={styles.chipIcon} />
                    )}
                    <Text
                      style={[
                        styles.chipText,
                        { color: tempFilters.baseFilter === chip.key ? theme.primary : theme.text },
                      ]}
                    >
                      {chip.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Priority Filter Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Приоритеты</Text>
                {tempFilters.priorities.length > 0 && (
                  <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                    <Text style={styles.badgeText}>{tempFilters.priorities.length}</Text>
                  </View>
                )}
              </View>
              <View style={styles.checkboxList}>
                {PRIORITY_OPTIONS.map((priority) => {
                  const isSelected = tempFilters.priorities.includes(priority.key);
                  return (
                    <TouchableOpacity
                      key={priority.key}
                      style={[
                        styles.checkboxItem,
                        {
                          backgroundColor: isSelected
                            ? priority.color + '15'
                            : 'transparent',
                          borderColor: isSelected ? priority.color : theme.border,
                        },
                      ]}
                      onPress={() => togglePriority(priority.key)}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          {
                            backgroundColor: isSelected ? priority.color : 'transparent',
                            borderColor: isSelected ? priority.color : theme.border,
                          },
                        ]}
                      >
                        {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                      </View>
                      <View style={[styles.priorityDot, { backgroundColor: priority.color }]} />
                      <Text style={[styles.checkboxLabel, { color: theme.text }]}>{priority.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Additional Filters Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Дополнительно</Text>
              <View style={styles.checkboxList}>
                {/* Subtasks filter */}
                <TouchableOpacity
                  style={[
                    styles.checkboxItem,
                    {
                      backgroundColor: tempFilters.hasSubtasks === true
                        ? theme.primary + '15'
                        : 'transparent',
                      borderColor: tempFilters.hasSubtasks === true ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => setTempFilters({
                    ...tempFilters,
                    hasSubtasks: tempFilters.hasSubtasks === true ? null : true
                  })}
                >
                  <View
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: tempFilters.hasSubtasks === true ? theme.primary : 'transparent',
                        borderColor: tempFilters.hasSubtasks === true ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    {tempFilters.hasSubtasks === true && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                  <Ionicons name="git-branch-outline" size={16} color={theme.textSecondary} style={styles.itemIcon} />
                  <Text style={[styles.checkboxLabel, { color: theme.text }]}>С подзадачами</Text>
                </TouchableOpacity>

                {/* No subtasks filter */}
                <TouchableOpacity
                  style={[
                    styles.checkboxItem,
                    {
                      backgroundColor: tempFilters.hasSubtasks === false
                        ? theme.primary + '15'
                        : 'transparent',
                      borderColor: tempFilters.hasSubtasks === false ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => setTempFilters({
                    ...tempFilters,
                    hasSubtasks: tempFilters.hasSubtasks === false ? null : false
                  })}
                >
                  <View
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: tempFilters.hasSubtasks === false ? theme.primary : 'transparent',
                        borderColor: tempFilters.hasSubtasks === false ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    {tempFilters.hasSubtasks === false && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                  <Ionicons name="document-outline" size={16} color={theme.textSecondary} style={styles.itemIcon} />
                  <Text style={[styles.checkboxLabel, { color: theme.text }]}>Без подзадач</Text>
                </TouchableOpacity>

                {/* Overdue deadline filter */}
                <TouchableOpacity
                  style={[
                    styles.checkboxItem,
                    {
                      backgroundColor: tempFilters.hasOverdueDeadline
                        ? '#EF4444' + '15'
                        : 'transparent',
                      borderColor: tempFilters.hasOverdueDeadline ? '#EF4444' : theme.border,
                    },
                  ]}
                  onPress={() => setTempFilters({
                    ...tempFilters,
                    hasOverdueDeadline: !tempFilters.hasOverdueDeadline
                  })}
                >
                  <View
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: tempFilters.hasOverdueDeadline ? '#EF4444' : 'transparent',
                        borderColor: tempFilters.hasOverdueDeadline ? '#EF4444' : theme.border,
                      },
                    ]}
                  >
                    {tempFilters.hasOverdueDeadline && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                  <Ionicons name="alarm-outline" size={16} color="#EF4444" style={styles.itemIcon} />
                  <Text style={[styles.checkboxLabel, { color: theme.text }]}>Просрочено</Text>
                </TouchableOpacity>

                {/* Delegated filter */}
                <TouchableOpacity
                  style={[
                    styles.checkboxItem,
                    {
                      backgroundColor: tempFilters.isDelegated
                        ? theme.primary + '15'
                        : 'transparent',
                      borderColor: tempFilters.isDelegated ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => setTempFilters({
                    ...tempFilters,
                    isDelegated: !tempFilters.isDelegated
                  })}
                >
                  <View
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: tempFilters.isDelegated ? theme.primary : 'transparent',
                        borderColor: tempFilters.isDelegated ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    {tempFilters.isDelegated && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                  <Ionicons name="people-outline" size={16} color={theme.textSecondary} style={styles.itemIcon} />
                  <Text style={[styles.checkboxLabel, { color: theme.text }]}>Делегировано</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Sort Section */}
            <View style={[styles.section, styles.lastSection]}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Сортировка</Text>
              <View style={styles.sortContainer}>
                {SORT_OPTIONS.map((sort) => (
                  <TouchableOpacity
                    key={sort.key}
                    style={[
                      styles.sortItem,
                      {
                        backgroundColor: tempFilters.sortBy === sort.key
                          ? theme.primary + '15'
                          : isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                        borderColor: tempFilters.sortBy === sort.key ? theme.primary : 'transparent',
                      },
                    ]}
                    onPress={() => setTempFilters({ ...tempFilters, sortBy: sort.key })}
                  >
                    <Ionicons
                      name={sort.icon as any}
                      size={16}
                      color={tempFilters.sortBy === sort.key ? theme.primary : theme.textSecondary}
                      style={styles.sortIcon}
                    />
                    <Text
                      style={[
                        styles.sortText,
                        { color: tempFilters.sortBy === sort.key ? theme.primary : theme.text },
                      ]}
                    >
                      {sort.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Sort direction */}
              <View style={styles.sortDirectionContainer}>
                <TouchableOpacity
                  style={[
                    styles.sortDirectionButton,
                    {
                      backgroundColor: tempFilters.sortDirection === 'asc'
                        ? theme.primary
                        : isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                    },
                  ]}
                  onPress={() => setTempFilters({ ...tempFilters, sortDirection: 'asc' })}
                >
                  <Ionicons
                    name="arrow-up"
                    size={16}
                    color={tempFilters.sortDirection === 'asc' ? '#fff' : theme.textSecondary}
                  />
                  <Text
                    style={[
                      styles.sortDirectionText,
                      { color: tempFilters.sortDirection === 'asc' ? '#fff' : theme.textSecondary },
                    ]}
                  >
                    По возрастанию
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.sortDirectionButton,
                    {
                      backgroundColor: tempFilters.sortDirection === 'desc'
                        ? theme.primary
                        : isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                    },
                  ]}
                  onPress={() => setTempFilters({ ...tempFilters, sortDirection: 'desc' })}
                >
                  <Ionicons
                    name="arrow-down"
                    size={16}
                    color={tempFilters.sortDirection === 'desc' ? '#fff' : theme.textSecondary}
                  />
                  <Text
                    style={[
                      styles.sortDirectionText,
                      { color: tempFilters.sortDirection === 'desc' ? '#fff' : theme.textSecondary },
                    ]}
                  >
                    По убыванию
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* Footer - Apply Button */}
          <View style={[styles.footer, { borderTopColor: theme.border, backgroundColor: theme.card }]}>
            <TouchableOpacity
              style={[styles.applyButton, { backgroundColor: theme.primary }]}
              onPress={handleApply}
            >
              <Text style={styles.applyButtonText}>Применить</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  filterMenu: {
    position: 'absolute',
    borderRadius: 16,
    borderWidth: 1,
    maxHeight: '80%',
    ...Platform.select({
      web: {
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 32,
        elevation: 12,
      },
    }),
  },
  filterMenuMobile: {
    width: 320,
  },
  filterMenuDesktop: {
    width: 360,
  },
  scrollView: {
    maxHeight: 500,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  resetButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  lastSection: {
    borderBottomWidth: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 2,
    gap: 6,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transitionProperty: 'all',
        transitionDuration: '0.2s',
      },
    }),
  },
  chipIcon: {
    marginRight: 2,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  checkboxList: {
    gap: 8,
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transitionProperty: 'all',
        transitionDuration: '0.2s',
      },
    }),
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxLabel: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  itemIcon: {
    marginLeft: -2,
  },
  sortContainer: {
    gap: 8,
  },
  sortItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    gap: 10,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transitionProperty: 'all',
        transitionDuration: '0.2s',
      },
    }),
  },
  sortIcon: {
    marginRight: 2,
  },
  sortText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  sortDirectionContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  sortDirectionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transitionProperty: 'all',
        transitionDuration: '0.2s',
      },
    }),
  },
  sortDirectionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  applyButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transitionProperty: 'transform, box-shadow',
        transitionDuration: '0.2s',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 4,
      },
    }),
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
