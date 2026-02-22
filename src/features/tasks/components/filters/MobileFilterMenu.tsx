import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { useAnimationType } from '@shared/hooks/useAnimationType';
import type { TaskFilter } from '../../utils/taskListHelpers';
import { FILTER_CHIPS } from '../../utils/taskListHelpers';

interface MobileFilterMenuProps {
  visible: boolean;
  currentFilter: TaskFilter;
  onFilterChange: (filter: TaskFilter) => void;
  onClose: () => void;
  buttonPosition?: { x: number; y: number; width: number; height: number };
}

export const MobileFilterMenu: React.FC<MobileFilterMenuProps> = ({
  visible,
  currentFilter,
  onFilterChange,
  onClose,
  buttonPosition,
}) => {
  const { theme } = useTheme();
  const animationType = useAnimationType('fade');

  const handleFilterSelect = (filter: TaskFilter) => {
    onFilterChange(filter);
    onClose();
  };

  // Calculate menu position based on button position
  const menuTop = buttonPosition
    ? buttonPosition.y + buttonPosition.height + (Platform.OS === 'ios' ? 4 : 8)
    : 60;

  return (
    <Modal
      visible={visible}
      animationType={animationType}
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={[styles.filterMenu, { top: menuTop, backgroundColor: theme.card }]}>
          {FILTER_CHIPS.map((chip) => (
            <TouchableOpacity
              key={chip.key}
              style={[
                styles.filterMenuItem,
                currentFilter === chip.key && [styles.filterMenuItemActive, { backgroundColor: theme.backgroundSecondary }],
              ]}
              onPress={() => handleFilterSelect(chip.key)}
            >
              <Text
                style={[
                  styles.filterMenuItemText,
                  { color: theme.text },
                  currentFilter === chip.key && { color: theme.primary, fontWeight: '600' },
                ]}
              >
                {chip.label}
              </Text>
              {currentFilter === chip.key && (
                <Ionicons name="checkmark" size={20} color={theme.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
    shadowRadius: 8,
    elevation: 8,
  },
  filterMenuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
  },
  filterMenuItemActive: {},
  filterMenuItemText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
