import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';
import { useAnimationType } from '@shared/hooks/useAnimationType';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  onConfirm,
  onCancel,
  destructive = false,
}) => {
  const { theme } = useTheme();
  const animationType = useAnimationType('fade');

  const dynamicStyles = StyleSheet.create({
    overlay: {
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    dialog: {
      backgroundColor: theme.backgroundSecondary,
      borderRadius: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 5,
    },
    title: {
      color: theme.text,
    },
    message: {
      color: theme.textSecondary,
    },
    cancelButton: {
      backgroundColor: theme.backgroundTertiary,
    },
    cancelButtonText: {
      color: theme.text,
    },
    confirmButton: {
      backgroundColor: destructive ? (theme.error || '#FF3B30') : theme.primary,
    },
    confirmButtonText: {
      color: '#FFFFFF',
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType={animationType}
      onRequestClose={onCancel}
    >
      <View style={[styles.overlay, dynamicStyles.overlay]}>
        <View style={[styles.dialog, dynamicStyles.dialog]}>
          <Text style={[styles.title, dynamicStyles.title]}>{title}</Text>
          <Text style={[styles.message, dynamicStyles.message]}>{message}</Text>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, dynamicStyles.cancelButton]}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={[styles.buttonText, dynamicStyles.cancelButtonText]}>
                {cancelText}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, dynamicStyles.confirmButton]}
              onPress={onConfirm}
              activeOpacity={0.7}
            >
              <Text style={[styles.buttonText, dynamicStyles.confirmButtonText]}>
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    width: '100%',
    maxWidth: 400,
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 24,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
