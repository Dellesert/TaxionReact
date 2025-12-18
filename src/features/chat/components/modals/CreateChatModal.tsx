/**
 * Create Chat Modal
 * Modal wrapper for CreateChatScreen in desktop mode
 */

import React from 'react';
import { Modal, View, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';
import CreateChatScreen from '../../screens/CreateChatScreen';
import { ChatType, Chat } from '../../types/chat.types';

interface CreateChatModalProps {
  visible: boolean;
  onClose: () => void;
  initialChatType?: ChatType;
  onChatCreated?: (chat: Chat) => void;
}

export const CreateChatModal: React.FC<CreateChatModalProps> = ({
  visible,
  onClose,
  initialChatType = 'group',
  onChatCreated,
}) => {
  const { theme } = useTheme();

  if (!visible) return null;

  // Different max width for private vs group chats
  const maxWidth = initialChatType === 'private' ? 500 : 600;

  const modalContainerStyle: ViewStyle = {
    ...styles.modalContainer,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  };

  const contentStyle: ViewStyle = {
    ...styles.content,
    backgroundColor: theme.background,
    maxWidth,
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
          <CreateChatScreen
            route={{
              key: 'create-chat-modal',
              name: 'CreateChat',
              params: {
                initialChatType,
                onChatCreated: (chat: Chat) => {
                  if (onChatCreated) {
                    onChatCreated(chat);
                  } else {
                    console.error('❌ onChatCreated is undefined in wrapper!');
                  }
                },
              },
            } as any}
            navigation={{
              goBack: onClose,
              navigate: () => {
              },
              replace: () => {
              },
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
    maxWidth: 600,
    maxHeight: '90%',
    borderRadius: 12,
    overflow: 'hidden',
  },
});
