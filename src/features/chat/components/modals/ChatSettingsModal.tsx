/**
 * Chat Settings Modal
 * Modal wrapper for ChatSettingsScreen in desktop mode
 */

import React from 'react';
import { Modal, View, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';
import ChatSettingsScreen from '../../screens/ChatSettingsScreen';

interface ChatSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  chatId: number;
  chatName: string;
}

export const ChatSettingsModal: React.FC<ChatSettingsModalProps> = ({
  visible,
  onClose,
  chatId,
  chatName,
}) => {
  const { theme } = useTheme();

  if (!visible) return null;

  const modalContainerStyle: ViewStyle = {
    ...styles.modalContainer,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  };

  const contentStyle: ViewStyle = {
    ...styles.content,
    backgroundColor: theme.background,
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      transparent
    >
      <TouchableOpacity
        style={modalContainerStyle}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={contentStyle}
        >
          <ChatSettingsScreen
            route={{
              key: `chat-settings-${chatId}`,
              name: 'ChatSettings',
              params: {
                chatId,
                chatName,
              },
            } as any}
            navigation={{
              goBack: onClose,
              navigate: (screen: string) => {
                // При удалении/выходе из чата закрываем модальное окно
                if (screen === 'ChatList') {
                  onClose();
                } else {
                  console.log('🚫 Navigation blocked in desktop modal');
                }
              },
              replace: () => {
                console.log('🚫 Navigation.replace blocked in desktop modal');
              },
              setOptions: () => {},
            } as any}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 700,
    maxHeight: '90%',
    borderRadius: 12,
    overflow: 'hidden',
  },
});
