import React, { useRef, useEffect } from 'react';
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
}) => {
  const { theme, isDark } = useTheme();
  const backgroundOpacity = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;

  useEffect(() => {
    if (visible) {
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
    } else {
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
      ]).start();
    }
  }, [visible]);

  const renderMenuItem = (
    icon: string,
    title: string,
    subtitle: string,
    color: string,
    onPress: () => void,
    isDestructive = false
  ) => (
    <TouchableOpacity
      style={[styles.menuItem, { backgroundColor: theme.backgroundSecondary }]}
      onPress={() => {
        onClose();
        onPress();
      }}
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
        <Text style={[styles.menuSubtitle, { color: theme.textSecondary }]}>
          {subtitle}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
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
          onPress={onClose}
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
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>
                Отмена
              </Text>
            </TouchableOpacity>
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
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
