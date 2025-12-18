import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { PollFilter, getFilterOptions } from '../../utils/pollListHelpers';

interface PollFilterMenuProps {
  visible: boolean;
  currentFilter: PollFilter;
  onClose: () => void;
  onFilterSelect: (filter: PollFilter) => void;
  buttonPosition?: { x: number; y: number; width: number; height: number };
}

const MENU_WIDTH = 180;

export const PollFilterMenu: React.FC<PollFilterMenuProps> = ({
  visible,
  currentFilter,
  onClose,
  onFilterSelect,
  buttonPosition,
}) => {
  const { theme } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const filterOptions = getFilterOptions();

  const handleFilterSelect = (filter: PollFilter) => {
    onFilterSelect(filter);
    onClose();
  };

  // Calculate menu position based on button position
  const menuTop = buttonPosition
    ? buttonPosition.y + buttonPosition.height + (Platform.OS === 'ios' ? 4 : 8)
    : 60;

  // Smart positioning: center menu under button, but keep it on screen
  let menuLeft: number | undefined;
  let menuRight: number | undefined;

  if (buttonPosition) {
    // Calculate centered position under the button
    const buttonCenter = buttonPosition.x + buttonPosition.width / 2;
    const menuLeftPos = buttonCenter - MENU_WIDTH / 2;

    // Check if menu would overflow left or right
    const wouldOverflowLeft = menuLeftPos < 16;
    const wouldOverflowRight = menuLeftPos + MENU_WIDTH > windowWidth - 16;

    if (wouldOverflowLeft) {
      // Align to left edge with padding
      menuLeft = 16;
    } else if (wouldOverflowRight) {
      // Align to right edge with padding
      menuRight = 16;
    } else {
      // Center under button
      menuLeft = menuLeftPos;
    }
  } else {
    // Fallback: align to right
    menuRight = 16;
  }

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
            {
              top: menuTop,
              left: menuLeft,
              right: menuRight,
              backgroundColor: theme.card,
            },
          ]}
        >
          {filterOptions.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.filterMenuItem,
                currentFilter === option.key && [
                  styles.filterMenuItemActive,
                  { backgroundColor: theme.backgroundSecondary },
                ],
              ]}
              onPress={() => handleFilterSelect(option.key)}
            >
              <Text
                style={[
                  styles.filterMenuItemText,
                  { color: theme.text },
                  currentFilter === option.key && [
                    styles.filterMenuItemTextActive,
                    { color: theme.primary },
                  ],
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
    minWidth: MENU_WIDTH,
    borderRadius: 12,
    padding: 8,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.15)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 10,
      },
    }),
  },
  filterMenuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 8,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'background-color 0.2s ease',
      },
    }),
  },
  filterMenuItemActive: {},
  filterMenuItemText: {
    fontSize: 15,
    fontWeight: '500',
  },
  filterMenuItemTextActive: {
    fontWeight: '600',
  },
});
