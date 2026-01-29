/**
 * ActionMenu
 * Универсальный компонент меню действий (bottom sheet на мобильном, dropdown на десктопе)
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Platform, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/hooks/useTheme';

export interface ActionMenuItem {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color?: string;
  onPress: () => void;
  disabled?: boolean;
}

interface ActionMenuProps {
  visible: boolean;
  items: ActionMenuItem[];
  onClose: () => void;
  isDesktop?: boolean;
  buttonPosition?: { x: number; y: number; width: number; height: number };
}

export const ActionMenu: React.FC<ActionMenuProps> = ({
  visible,
  items,
  onClose,
  isDesktop = false,
  buttonPosition,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;

  // Internal visibility state to control Modal
  const [isModalVisible, setIsModalVisible] = React.useState(false);

  // Store pending action to execute after modal closes
  const pendingActionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (visible) {
      // Show modal immediately
      setIsModalVisible(true);
      pendingActionRef.current = null;

      // Reset to initial position first
      fadeAnim.setValue(0);
      slideAnim.setValue(100);

      // Then show animations with small delay
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 250,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 280,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
      }, 10);
    } else if (isModalVisible) {
      // Hide animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 100,
          duration: 200,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Hide modal after animation completes
        setIsModalVisible(false);

        // Execute pending action after modal is fully closed
        if (pendingActionRef.current) {
          const action = pendingActionRef.current;
          pendingActionRef.current = null;
          // Small delay to ensure modal is fully unmounted
          setTimeout(action, 50);
        }
      });
    }
  }, [visible, fadeAnim, slideAnim, isModalVisible]);

  const handleAction = useCallback((action: () => void) => {
    // Store action to execute after close animation
    pendingActionRef.current = action;
    onClose();
  }, [onClose]);

  if (items.length === 0) {
    return null;
  }

  const renderMenu = () => (
    <View
      style={[
        styles.menu,
        { backgroundColor: theme.card, borderColor: theme.border },
        isDesktop && styles.menuDesktop,
        isDesktop && buttonPosition && {
          position: 'absolute',
          top: buttonPosition.y + buttonPosition.height + 8,
          left: buttonPosition.x + buttonPosition.width - 220, // Выравнивание правого края меню с кнопкой
        },
      ]}
    >
      {items.map((item, index) => (
        <React.Fragment key={item.key}>
          <TouchableOpacity
            style={[
              styles.menuItem,
              index === items.length - 1 && styles.menuItemLast,
              item.disabled && styles.menuItemDisabled,
            ]}
            onPress={() => handleAction(item.onPress)}
            activeOpacity={0.7}
            disabled={item.disabled}
          >
            <Ionicons name={item.icon} size={20} color={item.color || theme.text} />
            <Text style={[styles.menuItemText, { color: item.color || theme.text }]}>
              {item.label}
            </Text>
          </TouchableOpacity>
          {index < items.length - 1 && (
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
              paddingBottom: 16 + insets.bottom, // Учитываем safe area для Android navigation bar
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
    // paddingBottom задаётся динамически с учётом safe area
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
  menuDesktop: {
    width: 220,
    maxWidth: 280,
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
  menuItemDisabled: {
    opacity: 0.5,
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
