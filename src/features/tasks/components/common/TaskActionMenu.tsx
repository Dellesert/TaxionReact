/**
 * Task Action Menu
 * Меню действий для задачи (редактировать, делегировать, удалить и т.д.)
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Platform, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import type { Task, TaskPermissions } from '../../types/task.types';

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
  const { theme } = useTheme();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;

  // Internal visibility state to control Modal
  const [isModalVisible, setIsModalVisible] = React.useState(false);

  useEffect(() => {
    if (visible) {
      // Show modal immediately
      setIsModalVisible(true);

      // Reset to initial position first
      fadeAnim.setValue(0);
      slideAnim.setValue(300);

      // Then show animations with small delay
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.spring(slideAnim, {
            toValue: 0,
            damping: 20,
            stiffness: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }, 50);
    } else if (isModalVisible) {
      // Hide animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 300,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Hide modal after animation completes
        setIsModalVisible(false);
      });
    }
  }, [visible, fadeAnim, slideAnim, isModalVisible]);

  const handleAction = (action: () => void) => {
    onClose();
    // Small delay to let modal close animation finish
    setTimeout(action, 250);
  };

  const menuItems = [];

  // Edit option
  if (permissions.can_edit) {
    menuItems.push({
      key: 'edit',
      icon: 'create-outline' as const,
      label: 'Редактировать',
      color: theme.text,
      onPress: () => handleAction(onEdit),
    });
  }

  // Delegate option (only for active tasks)
  if (permissions.can_delegate && task?.status !== 'done' && task?.status !== 'cancelled') {
    menuItems.push({
      key: 'delegate',
      icon: 'git-branch-outline' as const,
      label: 'Передать задачу',
      color: theme.text,
      onPress: () => handleAction(onDelegate),
    });
  }

  // Add subtask option
  if (permissions.can_create_subtasks) {
    menuItems.push({
      key: 'subtask',
      icon: 'add-circle-outline' as const,
      label: 'Добавить подзадачу',
      color: theme.text,
      onPress: () => handleAction(onAddSubtask),
    });
  }

  // Emergency complete option (only for active tasks)
  if (permissions.can_emergency_complete && task?.status !== 'done') {
    menuItems.push({
      key: 'emergency',
      icon: 'warning-outline' as const,
      label: 'Аварийное завершение',
      color: '#F59E0B',
      onPress: () => handleAction(onEmergencyComplete),
    });
  }

  // Delete option
  if (permissions.can_delete) {
    menuItems.push({
      key: 'delete',
      icon: 'trash-outline' as const,
      label: 'Удалить',
      color: '#EF4444',
      onPress: () => handleAction(onDelete),
    });
  }

  if (menuItems.length === 0) {
    return null;
  }

  const renderMenu = () => (
    <View
      style={[
        styles.menu,
        { backgroundColor: theme.card, borderColor: theme.border },
        isDesktop && buttonPosition && {
          position: 'absolute',
          top: buttonPosition.y + buttonPosition.height + 8,
          right: 16,
        },
      ]}
    >
      {menuItems.map((item, index) => (
        <React.Fragment key={item.key}>
          <TouchableOpacity
            style={[
              styles.menuItem,
              index === menuItems.length - 1 && styles.menuItemLast,
            ]}
            onPress={item.onPress}
            activeOpacity={0.7}
          >
            <Ionicons name={item.icon} size={20} color={item.color} />
            <Text style={[styles.menuItemText, { color: item.color }]}>
              {item.label}
            </Text>
          </TouchableOpacity>
          {index < menuItems.length - 1 && (
            <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />
          )}
        </React.Fragment>
      ))}
    </View>
  );

  if (isDesktop) {
    // Desktop: positioned menu
    return (
      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <TouchableOpacity
          style={styles.desktopOverlay}
          activeOpacity={1}
          onPress={onClose}
        >
          {renderMenu()}
        </TouchableOpacity>
      </Modal>
    );
  }

  // Mobile: bottom sheet
  return (
    <Modal
      visible={isModalVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
          }
        ]}
      >
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={onClose}
        />
        <Animated.View
          style={[
            styles.bottomSheet,
            {
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          {renderMenu()}
          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: theme.backgroundSecondary }]}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={[styles.cancelButtonText, { color: theme.text }]}>
              Отмена
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  overlayTouchable: {
    flex: 1,
  },
  desktopOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  bottomSheet: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  menu: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
      },
    }),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
    minHeight: 52,
  },
  menuItemLast: {
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  menuDivider: {
    height: 1,
    marginHorizontal: 16,
  },
  cancelButton: {
    marginTop: 12,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
