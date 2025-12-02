import React, { useRef, useEffect, useState } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  Text,
  Animated,
  Platform,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Task, TaskPermissions } from '../types/task.types';
import { useTheme } from '@shared/hooks/useTheme';

interface TaskActionMenuProps {
  visible: boolean;
  task: Task | null;
  permissions: TaskPermissions;
  onClose: () => void;
  onEdit: () => void;
  onDelegate: () => void;
  onAddSubtask: () => void;
  onEmergencyComplete: () => void;
  onDelete: () => void;
  isDesktop?: boolean;
  buttonPosition?: { x: number; y: number; width: number; height: number };
}

export const TaskActionMenu: React.FC<TaskActionMenuProps> = ({
  visible,
  task,
  permissions,
  onClose,
  onEdit,
  onDelegate,
  onAddSubtask,
  onEmergencyComplete,
  onDelete,
  isDesktop = false,
  buttonPosition,
}) => {
  const { theme, isDark } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const backgroundOpacity = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      // Reset animation values before starting
      backgroundOpacity.setValue(0);
      slideAnim.setValue(Dimensions.get('window').height);

      Animated.parallel([
        Animated.timing(backgroundOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 25,
          stiffness: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (modalVisible) {
      Animated.parallel([
        Animated.timing(backgroundOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: Dimensions.get('window').height,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setModalVisible(false);
      });
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(backgroundOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: Dimensions.get('window').height,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const handleMenuItemPress = (onPress: () => void) => {
    // Immediately hide modal without animation
    setModalVisible(false);
    // Call onClose and action immediately
    onClose();
    // Use requestAnimationFrame to ensure modal is unmounted before action
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        onPress();
      });
    });
  };

  const renderMenuItem = (
    icon: string,
    title: string,
    subtitle: string,
    color: string,
    onPress: () => void,
    isDestructive = false
  ) => (
    <TouchableOpacity
      style={[
        isDesktop ? styles.menuItemDesktop : styles.menuItem,
        !isDesktop && { backgroundColor: theme.backgroundSecondary }
      ]}
      onPress={() => handleMenuItemPress(onPress)}
    >
      <View
        style={[
          styles.menuIconContainer,
          {
            backgroundColor: isDark ? `${color}26` : `${color}14`,
          },
        ]}
      >
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <View style={styles.menuTextContainer}>
        <Text
          style={[
            styles.menuTitle,
            { color: isDestructive ? color : theme.text },
          ]}
        >
          {title}
        </Text>
        {!isDesktop && (
          <Text style={[styles.menuSubtitle, { color: theme.textSecondary }]}>
            {subtitle}
          </Text>
        )}
      </View>
      {!isDesktop && <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />}
    </TouchableOpacity>
  );

  // Calculate menu position for desktop dropdown
  const menuTop = buttonPosition
    ? buttonPosition.y + buttonPosition.height + 8
    : 60;

  // Desktop Dropdown Render
  if (isDesktop) {
    return (
      <Modal
        visible={visible}
        animationType="fade"
        transparent={true}
        onRequestClose={onClose}
      >
        <TouchableOpacity
          style={styles.desktopOverlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <View style={[
            styles.desktopMenu,
            {
              top: menuTop,
              backgroundColor: theme.card,
              shadowColor: theme.shadow || '#000',
            }
          ]}>
            {/* Edit Task Option */}
            {permissions.can_edit &&
              renderMenuItem(
                'create-outline',
                'Редактировать',
                'Изменить детали задачи',
                '#3b82f6',
                onEdit
              )}

            {/* Delegate Task Option */}
            {permissions.can_delegate &&
              task?.status !== 'done' &&
              task?.status !== 'cancelled' &&
              renderMenuItem(
                'git-branch-outline',
                'Передать задачу',
                'Назначить другого исполнителя',
                '#8b5cf6',
                onDelegate
              )}

            {/* Add Subtask Option */}
            {permissions.can_create_subtasks &&
              renderMenuItem(
                'add-circle-outline',
                'Добавить подзадачу',
                'Разбить задачу на этапы',
                theme.primary,
                onAddSubtask
              )}

            {/* Emergency Complete Option */}
            {permissions.can_emergency_complete &&
              task?.status !== 'done' &&
              renderMenuItem(
                'warning-outline',
                'Аварийное завершение',
                'Завершить просроченную задачу',
                '#f59e0b',
                onEmergencyComplete
              )}

            {/* Delete Task Option */}
            {permissions.can_delete &&
              renderMenuItem(
                'trash-outline',
                'Удалить задачу',
                'Это действие нельзя отменить',
                '#ef4444',
                onDelete,
                true
              )}
          </View>
        </TouchableOpacity>
      </Modal>
    );
  }

  // Mobile Bottom Sheet Render
  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View
        style={[
          styles.modalBackground,
          {
            opacity: backgroundOpacity,
          },
        ]}
      >
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={handleClose}
        />
        <Animated.View
          style={[
            styles.menuContainer,
            {
              backgroundColor: theme.card,
              transform: [{ translateY: slideAnim }],
              paddingBottom: Platform.OS === 'ios' ? 34 : 16,
            },
          ]}
          onStartShouldSetResponder={() => true}
        >
          {/* Handle Bar */}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: theme.border }]} />
          </View>

          {/* Menu Items */}
          <View style={styles.menuItemsContainer}>
            {/* Edit Task Option */}
            {permissions.can_edit &&
              renderMenuItem(
                'create-outline',
                'Редактировать',
                'Изменить детали задачи',
                '#3b82f6',
                onEdit
              )}

            {/* Delegate Task Option */}
            {permissions.can_delegate &&
              task?.status !== 'done' &&
              task?.status !== 'cancelled' &&
              renderMenuItem(
                'git-branch-outline',
                'Передать задачу',
                'Назначить другого исполнителя',
                '#8b5cf6',
                onDelegate
              )}

            {/* Add Subtask Option */}
            {permissions.can_create_subtasks &&
              renderMenuItem(
                'add-circle-outline',
                'Добавить подзадачу',
                'Разбить задачу на этапы',
                theme.primary,
                onAddSubtask
              )}

            {/* Emergency Complete Option */}
            {permissions.can_emergency_complete &&
              task?.status !== 'done' &&
              renderMenuItem(
                'warning-outline',
                'Аварийное завершение',
                'Завершить просроченную задачу',
                '#f59e0b',
                onEmergencyComplete
              )}

            {/* Delete Task Option */}
            {permissions.can_delete &&
              renderMenuItem(
                'trash-outline',
                'Удалить задачу',
                'Это действие нельзя отменить',
                '#ef4444',
                onDelete,
                true
              )}

            {/* Cancel Button */}
            <View style={[styles.cancelSection, { borderTopColor: theme.border }]}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: theme.backgroundSecondary }]}
                onPress={handleClose}
              >
                <Text style={[styles.cancelButtonText, { color: theme.text }]}>
                  Отмена
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  menuItemsContainer: {
    paddingHorizontal: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 13,
  },
  cancelSection: {
    borderTopWidth: 1,
    marginTop: 16,
    paddingTop: 16,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Desktop styles
  desktopOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  desktopMenu: {
    position: 'absolute',
    right: 16,
    minWidth: 240,
    borderRadius: 12,
    padding: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  menuItemDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
});
