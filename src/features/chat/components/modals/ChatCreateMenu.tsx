import React from 'react';
import { View, Modal, TouchableOpacity, Text, StyleSheet, Platform, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { ChatType } from '../../types/chat.types';

interface ChatCreateMenuProps {
  visible: boolean;
  onClose: () => void;
  onCreateChatType: (chatType: ChatType) => void;
  isDesktopMode?: boolean;
}

export const ChatCreateMenu: React.FC<ChatCreateMenuProps> = ({
  visible,
  onClose,
  onCreateChatType,
  isDesktopMode = false,
}) => {
  const { theme } = useTheme();

  // In desktop mode, align menu to the right edge of chat list
  // Chat list: starts at 80px (SideNavBar), width 420px, ends at 500px
  // Menu: width 200px, positioned at 500px - 200px - 16px (padding) = 284px from left
  const menuContainerStyle: ViewStyle = isDesktopMode
    ? {
        ...styles.menuContainer,
        backgroundColor: theme.card,
        // Align to right edge of chat list area
        right: undefined,
        left: 284, // 80px (SideNavBar) + 420px (chat list) - 200px (menu width) - 16px (padding)
        top: Platform.OS === 'web' ? 60 : 100,
      }
    : {
        ...styles.menuContainer,
        backgroundColor: theme.card,
      };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={menuContainerStyle}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => onCreateChatType('private')}
          >
            <Ionicons name="person" size={24} color={theme.primary} />
            <Text style={[styles.menuItemText, { color: theme.text }]}>Личный чат</Text>
          </TouchableOpacity>

          <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => onCreateChatType('group')}
          >
            <Ionicons name="people" size={24} color={theme.primary} />
            <Text style={[styles.menuItemText, { color: theme.text }]}>Групповой чат</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menuContainer: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 60 : 100,
    right: 16,
    width: 200,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  menuItemText: {
    fontSize: 17,
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    marginHorizontal: 16,
  },
});
