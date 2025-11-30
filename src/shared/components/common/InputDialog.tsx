import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';
import { AutoCorrectedTextInput, AutoCorrectedTextInputRef } from '@shared/components/ui/AutoCorrectedTextInput';

interface InputDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  placeholder?: string;
  initialValue?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export const InputDialog: React.FC<InputDialogProps> = ({
  visible,
  title,
  message,
  placeholder = '',
  initialValue = '',
  confirmText = 'Сохранить',
  cancelText = 'Отмена',
  onConfirm,
  onCancel,
}) => {
  const { theme } = useTheme();
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<AutoCorrectedTextInputRef>(null);

  React.useEffect(() => {
    if (visible) {
      setValue(initialValue);
    }
  }, [visible, initialValue]);

  const handleConfirm = () => {
    // Применяем iOS автокоррекцию перед подтверждением
    inputRef.current?.commitAutocorrection();

    setTimeout(() => {
      setValue((currentValue) => {
        if (currentValue.trim()) {
          onConfirm(currentValue.trim());
          return '';
        }
        return currentValue;
      });
    }, 10);
  };

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
    input: {
      backgroundColor: theme.input,
      borderColor: theme.border,
      color: theme.text,
    },
    cancelButton: {
      backgroundColor: theme.backgroundTertiary,
    },
    cancelButtonText: {
      color: theme.text,
    },
    confirmButton: {
      backgroundColor: theme.primary,
    },
    confirmButtonText: {
      color: '#FFFFFF',
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={[styles.overlay, dynamicStyles.overlay]}>
        <View style={[styles.dialog, dynamicStyles.dialog]}>
          <Text style={[styles.title, dynamicStyles.title]}>{title}</Text>
          {message && (
            <Text style={[styles.message, dynamicStyles.message]}>{message}</Text>
          )}

          <AutoCorrectedTextInput
            ref={inputRef}
            style={[styles.input, dynamicStyles.input]}
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            placeholderTextColor={theme.inputPlaceholder}
            autoFocus
            onSubmitEditing={handleConfirm}
          />

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
              onPress={handleConfirm}
              activeOpacity={0.7}
              disabled={!value.trim()}
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
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
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
