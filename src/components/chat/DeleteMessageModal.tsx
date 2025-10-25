import React from 'react';
import { Modal, Pressable, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';

interface DeleteMessageModalProps {
  visible: boolean;
  messageContent: string;
  isOwnMessage: boolean;
  isAdmin: boolean;
  onClose: () => void;
  onDeleteForEveryone: () => void;
  onDeleteForMe: () => void;
}

/**
 * Модальное окно для подтверждения удаления сообщения
 */
export const DeleteMessageModal: React.FC<DeleteMessageModalProps> = ({
  visible,
  messageContent,
  isOwnMessage,
  isAdmin,
  onClose,
  onDeleteForEveryone,
  onDeleteForMe,
}) => {
  const { theme } = useTheme();

  const truncatedContent = messageContent.length > 100
    ? messageContent.substring(0, 100) + '...'
    : messageContent;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <BlurView intensity={80} style={styles.blurOverlay} tint="dark">
        <Pressable
          style={styles.deleteModalOverlay}
          onPress={onClose}
        >
          <View style={[styles.deleteModal, { backgroundColor: theme.backgroundSecondary }]}>
            <Text style={[styles.deleteModalTitle, { color: theme.text }]}>
              Удалить сообщение?
            </Text>
            <Text style={[styles.deleteModalMessage, { color: theme.textSecondary }]}>
              {truncatedContent}
            </Text>

            <View style={styles.deleteModalButtons}>
              {/* Удалить для всех - только если своё или админ */}
              {(isOwnMessage || isAdmin) && (
                <TouchableOpacity
                  style={[styles.deleteModalButton, { backgroundColor: '#E94444' }]}
                  onPress={onDeleteForEveryone}
                >
                  <Ionicons name="trash" size={20} color="#FFF" />
                  <Text style={styles.deleteModalButtonText}>
                    Удалить для всех
                  </Text>
                </TouchableOpacity>
              )}

              {/* Удалить для меня - всегда доступно */}
              <TouchableOpacity
                style={[styles.deleteModalButton, { backgroundColor: '#FF6B35' }]}
                onPress={onDeleteForMe}
              >
                <Ionicons name="eye-off-outline" size={20} color="#FFF" />
                <Text style={styles.deleteModalButtonText}>
                  Удалить для меня
                </Text>
              </TouchableOpacity>

              {/* Отмена */}
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.deleteModalCancelButton, { backgroundColor: theme.background }]}
                onPress={onClose}
              >
                <Text style={[styles.deleteModalCancelText, { color: theme.text }]}>
                  Отмена
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  blurOverlay: {
    flex: 1,
  },
  deleteModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  deleteModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  deleteModalMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
  deleteModalButtons: {
    width: '100%',
    gap: 10,
  },
  deleteModalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  deleteModalButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteModalCancelButton: {
    marginTop: 4,
  },
  deleteModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
