import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';
import { formatHour, getHourOptions } from '@/features/notifications/utils/notificationHelpers';

interface TimePickerModalProps {
  visible: boolean;
  type: 'start' | 'end';
  selectedHour: number | null;
  onSelect: (hour: number) => void;
  onClose: () => void;
}

/**
 * Modal for selecting quiet hours time
 */
export const TimePickerModal: React.FC<TimePickerModalProps> = ({
  visible,
  type,
  selectedHour,
  onSelect,
  onClose,
}) => {
  const { theme } = useTheme();

  const dynamicStyles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      backgroundColor: theme.backgroundSecondary,
      borderRadius: 16,
      width: '100%',
      maxWidth: 400,
      maxHeight: '80%',
    },
    modalHeader: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      textAlign: 'center',
    },
    modalBody: {
      maxHeight: 400,
    },
    modalOption: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    modalOptionLast: {
      borderBottomWidth: 0,
    },
    modalOptionText: {
      fontSize: 16,
      color: theme.text,
    },
    modalOptionSelected: {
      color: theme.primary,
      fontWeight: '600',
    },
  });

  const hours = getHourOptions();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={dynamicStyles.modalOverlay} onPress={onClose}>
        <Pressable style={dynamicStyles.modalContent} onPress={(e) => e.stopPropagation()}>
          <View style={dynamicStyles.modalHeader}>
            <Text style={dynamicStyles.modalTitle}>
              {type === 'start' ? 'Начало тихих часов' : 'Конец тихих часов'}
            </Text>
          </View>
          <ScrollView style={dynamicStyles.modalBody}>
            {hours.map((hour) => (
              <TouchableOpacity
                key={hour}
                style={[
                  dynamicStyles.modalOption,
                  hour === 23 && dynamicStyles.modalOptionLast,
                ]}
                onPress={() => {
                  onSelect(hour);
                  onClose();
                }}
              >
                <Text
                  style={[
                    dynamicStyles.modalOptionText,
                    selectedHour === hour && dynamicStyles.modalOptionSelected,
                  ]}
                >
                  {formatHour(hour)}
                </Text>
                {selectedHour === hour && (
                  <Ionicons name="checkmark" size={24} color={theme.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
