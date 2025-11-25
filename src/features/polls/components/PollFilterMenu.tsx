import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';
import { PollFilter, getFilterOptions } from '../utils/pollListHelpers';

interface PollFilterMenuProps {
  visible: boolean;
  currentFilter: PollFilter;
  onClose: () => void;
  onFilterSelect: (filter: PollFilter) => void;
}

export const PollFilterMenu: React.FC<PollFilterMenuProps> = ({
  visible,
  currentFilter,
  onClose,
  onFilterSelect,
}) => {
  const { theme } = useTheme();
  const filterOptions = getFilterOptions();

  const handleFilterSelect = (filter: PollFilter) => {
    onFilterSelect(filter);
    onClose();
  };

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
        <View style={[styles.filterMenu, { backgroundColor: theme.card }]}>
          {filterOptions.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.filterMenuItem,
                currentFilter === option.key && styles.filterMenuItemActive,
              ]}
              onPress={() => handleFilterSelect(option.key)}
            >
              <Text
                style={[
                  styles.filterMenuItemText,
                  { color: theme.text },
                  currentFilter === option.key && {
                    color: theme.primary,
                    fontWeight: '600',
                  },
                ]}
              >
                {option.label}
              </Text>
              {currentFilter === option.key && (
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
    top: 60,
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
  filterMenuItemActive: {
    backgroundColor: 'rgba(233, 68, 68, 0.1)',
  },
  filterMenuItemText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
