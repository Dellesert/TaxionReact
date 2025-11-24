import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';
import { NotificationPriority } from '@api/notificationPreferences.api';
import { getPriorityLabel, getPriorityOptions } from '@utils/notificationHelpers';

interface PriorityPickerModalProps {
  visible: boolean;
  selectedPriority: NotificationPriority;
  onSelect: (priority: NotificationPriority) => void;
  onClose: () => void;
}

/**
 * Modal for selecting notification priority
 */
export const PriorityPickerModal: React.FC<PriorityPickerModalProps> = ({
  visible,
  selectedPriority,
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

  const priorities = getPriorityOptions();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={dynamicStyles.modalOverlay} onPress={onClose}>
        <Pressable style={dynamicStyles.modalContent} onPress={(e) => e.stopPropagation()}>
          <View style={dynamicStyles.modalHeader}>
            <Text style={dynamicStyles.modalTitle}>Минимальный приоритет</Text>
          </View>
          <ScrollView style={dynamicStyles.modalBody}>
            {priorities.map((priority, index) => (
              <TouchableOpacity
                key={priority}
                style={[
                  dynamicStyles.modalOption,
                  index === priorities.length - 1 && dynamicStyles.modalOptionLast,
                ]}
                onPress={() => {
                  onSelect(priority);
                  onClose();
                }}
              >
                <Text
                  style={[
                    dynamicStyles.modalOptionText,
                    selectedPriority === priority && dynamicStyles.modalOptionSelected,
                  ]}
                >
                  {getPriorityLabel(priority)}
                </Text>
                {selectedPriority === priority && (
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
