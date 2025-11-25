import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';
import type { TaskFilter } from '../../../utils/taskListHelpers';
import { FILTER_CHIPS } from '../../../utils/taskListHelpers';

interface TaskFilterMenuProps {
  visible: boolean;
  currentFilter: TaskFilter;
  onFilterChange: (filter: TaskFilter) => void;
  onClose: () => void;
}

export const TaskFilterMenu: React.FC<TaskFilterMenuProps> = ({
  visible,
  currentFilter,
  onFilterChange,
  onClose,
}) => {
  const { theme } = useTheme();

  const handleFilterSelect = (filter: TaskFilter) => {
    onFilterChange(filter);
    onClose();
  };

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    filterMenu: {
      position: 'absolute',
      top: 60,
      right: 16,
      minWidth: 180,
      borderRadius: 12,
      padding: 8,
      backgroundColor: theme.card,
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
    filterMenuItemActive: {
      backgroundColor: theme.backgroundSecondary,
    },
    filterMenuItemText: {
      fontSize: 15,
      fontWeight: '500',
      color: theme.text,
    },
    filterMenuItemTextActive: {
      color: theme.primary,
      fontWeight: '600',
    },
  });

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
        <View style={styles.filterMenu}>
          {FILTER_CHIPS.map((chip) => (
            <TouchableOpacity
              key={chip.key}
              style={[
                styles.filterMenuItem,
                currentFilter === chip.key && styles.filterMenuItemActive,
              ]}
              onPress={() => handleFilterSelect(chip.key)}
            >
              <Text
                style={[
                  styles.filterMenuItemText,
                  currentFilter === chip.key && styles.filterMenuItemTextActive,
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
