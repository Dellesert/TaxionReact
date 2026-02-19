/**
 * PasskeyNameModal Component
 * Модальное окно для ввода/редактирования имени устройства
 */

import React from 'react';
import { View, Text, StyleSheet, TextInput, Modal, TouchableOpacity } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';
import { useAnimationType } from '@shared/hooks/useAnimationType';

interface PasskeyNameModalProps {
  visible: boolean;
  deviceName: string;
  isEditing: boolean;
  onChangeText: (text: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export const PasskeyNameModal: React.FC<PasskeyNameModalProps> = ({
  visible,
  deviceName,
  isEditing,
  onChangeText,
  onCancel,
  onConfirm,
}) => {
  const { theme } = useTheme();
  const animationType = useAnimationType('fade');

  return (
    <Modal visible={visible} transparent animationType={animationType} onRequestClose={onCancel}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.backgroundSecondary }]}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>
            {isEditing ? 'Переименовать устройство' : 'Название устройства'}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.background,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            placeholder="Введите название устройства"
            placeholderTextColor={theme.textTertiary}
            value={deviceName}
            onChangeText={onChangeText}
            autoFocus
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[
                styles.modalButton,
                styles.modalButtonCancel,
                { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
              ]}
              onPress={onCancel}
            >
              <Text style={[styles.modalButtonText, { color: theme.text }]}>Отмена</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonConfirm, { backgroundColor: theme.primary }]}
              onPress={onConfirm}
            >
              <Text style={[styles.modalButtonText, styles.modalButtonTextConfirm]}>
                {isEditing ? 'Сохранить' : 'Готово'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  input: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginLeft: 8,
  },
  modalButtonCancel: {
    borderWidth: 1,
  },
  modalButtonConfirm: {},
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextConfirm: {
    color: '#FFFFFF',
  },
});
