import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/hooks/useTheme';

export interface ActionSheetOption {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

interface ActionSheetProps {
  visible: boolean;
  title?: string;
  options: ActionSheetOption[];
  onCancel: () => void;
}

export const ActionSheet: React.FC<ActionSheetProps> = ({
  visible,
  title,
  options,
  onCancel,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const dynamicStyles = StyleSheet.create({
    overlay: {
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    sheet: {
      backgroundColor: theme.backgroundSecondary,
    },
    title: {
      color: theme.text,
    },
    optionButton: {
      backgroundColor: theme.card,
      borderColor: theme.border,
    },
    optionText: {
      color: theme.text,
    },
    destructiveText: {
      color: theme.error || '#FF3B30',
    },
    cancelButton: {
      backgroundColor: theme.backgroundTertiary,
    },
    cancelText: {
      color: theme.text,
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      presentationStyle="overFullScreen"
      statusBarTranslucent
    >
      <TouchableOpacity
        style={[styles.overlay, dynamicStyles.overlay]}
        activeOpacity={1}
        onPress={onCancel}
      >
        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <View style={[styles.sheet, dynamicStyles.sheet, { marginBottom: insets.bottom }]}>
            {title && (
              <Text style={[styles.title, dynamicStyles.title]}>{title}</Text>
            )}

            <View style={styles.optionsContainer}>
              {options.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.optionButton, dynamicStyles.optionButton]}
                  onPress={() => {
                    option.onPress();
                    onCancel();
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.optionText,
                      option.destructive
                        ? dynamicStyles.destructiveText
                        : dynamicStyles.optionText,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.cancelButton, dynamicStyles.cancelButton]}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelText, dynamicStyles.cancelText]}>
                Отмена
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 16,
  },
  sheet: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  title: {
    fontSize: 13,
    fontWeight: '400',
    textAlign: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    opacity: 0.6,
  },
  optionsContainer: {
    gap: 1,
  },
  optionButton: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 0.5,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '400',
  },
  cancelButton: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 6,
    borderRadius: 14,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
