/**
 * ActionModal Component
 * Кастомное модальное окно с выбором действий
 * Замена стандартным Alert.alert()
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';
import { useAnimationType } from '@shared/hooks/useAnimationType';
import { Ionicons } from '@expo/vector-icons';
import { ActionModalProps, ActionModalButton } from '@types/modal.types';

export const ActionModal: React.FC<ActionModalProps> = ({
  visible,
  title,
  message,
  customContent,
  actions,
  onDismiss,
  dismissable = true,
  checkbox,
}) => {
  const { theme } = useTheme();
  const animationType = useAnimationType('fade');
  const [isLoading, setIsLoading] = useState(false);

  const handleDismiss = () => {
    if (dismissable && onDismiss) {
      onDismiss();
    }
  };

  const getButtonStyle = (buttonStyle: ActionModalButton['style']) => {
    switch (buttonStyle) {
      case 'primary':
        return {
          backgroundColor: theme.primary,
          textColor: '#FFFFFF',
        };
      case 'destructive':
        return {
          backgroundColor: theme.error || '#FF3B30',
          textColor: '#FFFFFF',
        };
      case 'cancel':
        return {
          backgroundColor: theme.backgroundTertiary,
          textColor: theme.textSecondary,
        };
      default:
        return {
          backgroundColor: theme.backgroundSecondary,
          textColor: theme.text,
          borderColor: theme.border,
          borderWidth: 1,
        };
    }
  };

  const dynamicStyles = StyleSheet.create({
    overlay: {
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modal: {
      backgroundColor: theme.backgroundSecondary,
      shadowColor: '#000',
    },
    title: {
      color: theme.text,
    },
    message: {
      color: theme.textSecondary,
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType={animationType}
      onRequestClose={handleDismiss}
      statusBarTranslucent
    >
      <Pressable style={[styles.overlay, dynamicStyles.overlay]} onPress={handleDismiss}>
        <View style={styles.centeredView} onStartShouldSetResponder={() => true}>
          <View style={[styles.modal, dynamicStyles.modal]}>
            {/* Заголовок */}
            <Text style={[styles.title, dynamicStyles.title]}>{title}</Text>

            {/* Сообщение (опционально) */}
            {message && (
              <Text style={[styles.message, dynamicStyles.message]}>{message}</Text>
            )}

            {/* Кастомный контент */}
            {customContent}

            {/* Чекбокс (опционально) */}
            {checkbox && (
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => checkbox.onChange(!checkbox.checked)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: theme.border,
                      backgroundColor: checkbox.checked ? theme.primary : theme.backgroundSecondary,
                    },
                    checkbox.checked && { borderColor: theme.primary },
                  ]}
                >
                  {checkbox.checked && <Ionicons name="checkmark" size={18} color="#FFF" />}
                </View>
                <Text style={[styles.checkboxLabel, { color: theme.text }]}>
                  {checkbox.label}
                </Text>
              </TouchableOpacity>
            )}

            {/* Кнопки действий */}
            <ScrollView
              style={styles.actionsContainer}
              contentContainerStyle={styles.actionsContent}
              showsVerticalScrollIndicator={false}
            >
              {actions.map((action, index) => {
                const buttonStyle = getButtonStyle(action.style);
                const isLastButton = index === actions.length - 1;

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.actionButton,
                      {
                        backgroundColor: buttonStyle.backgroundColor,
                        borderColor: buttonStyle.borderColor,
                        borderWidth: buttonStyle.borderWidth,
                        marginBottom: isLastButton ? 0 : 12,
                      },
                    ]}
                    onPress={async () => {
                      if (isLoading) return;
                      setIsLoading(true);
                      try {
                        await action.onPress();
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    activeOpacity={0.7}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color={buttonStyle.textColor} />
                    ) : (
                      <>
                        {action.icon && (
                          <Ionicons
                            name={action.icon as any}
                            size={20}
                            color={buttonStyle.textColor}
                            style={styles.buttonIcon}
                          />
                        )}
                        <Text
                          style={[
                            styles.actionButtonText,
                            { color: buttonStyle.textColor },
                          ]}
                        >
                          {action.text}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centeredView: {
    width: '85%',
    maxWidth: 400,
  },
  modal: {
    borderRadius: 16,
    padding: 24,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxLabel: {
    fontSize: 15,
    flex: 1,
  },
  actionsContainer: {
    maxHeight: 350,
  },
  actionsContent: {
    flexGrow: 1,
  },
  actionButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minHeight: 50,
  },
  buttonIcon: {
    marginRight: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
