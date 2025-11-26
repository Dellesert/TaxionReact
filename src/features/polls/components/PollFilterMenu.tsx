import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { PollFilter, getFilterOptions } from '../utils/pollListHelpers';

interface PollFilterMenuProps {
  visible: boolean;
  currentFilter: PollFilter;
  onClose: () => void;
  onFilterSelect: (filter: PollFilter) => void;
  buttonPosition?: { x: number; y: number; width: number; height: number };
}

export const PollFilterMenu: React.FC<PollFilterMenuProps> = ({
  visible,
  currentFilter,
  onClose,
  onFilterSelect,
  buttonPosition,
}) => {
  const { theme } = useTheme();
  const filterOptions = getFilterOptions();

  const handleFilterSelect = (filter: PollFilter) => {
    onFilterSelect(filter);
    onClose();
  };

  // Calculate menu position based on button position
  const menuTop = buttonPosition
    ? buttonPosition.y + buttonPosition.height + (Platform.OS === 'ios' ? 4 : 8)
    : 60;

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    filterMenu: {
      position: 'absolute',
      top: menuTop,
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
                  currentFilter === option.key && styles.filterMenuItemTextActive,
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
