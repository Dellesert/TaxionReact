/**
 * ContextMenu
 * Контекстное меню для web/Electron — без затемнения, позиционируется рядом с кнопкой-триггером.
 * На мобильных платформах не рендерится (используйте ActionMenu или ActionModalContext).
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Animated, Easing, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

let ReactDOM: any;
if (Platform.OS === 'web') {
  ReactDOM = require('react-dom');
}

export interface ContextMenuOption {
  key: string;
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  color?: string;
  onPress: () => void;
  disabled?: boolean;
}

interface ContextMenuProps {
  visible: boolean;
  options: ContextMenuOption[];
  onClose: () => void;
  anchorRef: React.RefObject<View | null>;
  preferPosition?: 'above' | 'below';
}

const MENU_WIDTH = 200;
const ITEM_HEIGHT = 48;
const MENU_PADDING = 4;
const MENU_GAP = 6;

export const ContextMenu: React.FC<ContextMenuProps> = ({
  visible,
  options,
  onClose,
  anchorRef,
  preferPosition = 'above',
}) => {
  const { theme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [isRendered, setIsRendered] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  const measureAnchor = useCallback(() => {
    if (!anchorRef.current) return;

    const node = anchorRef.current as any;

    // Web: используем getBoundingClientRect
    if (Platform.OS === 'web' && node && typeof node.getBoundingClientRect === 'function') {
      const rect = node.getBoundingClientRect();
      computePosition(rect);
    } else if (Platform.OS === 'web' && node && node._nativeTag) {
      // Fallback для React Native Web — через measure
      node.measure?.((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
        computePosition({ left: pageX, top: pageY, width, height });
      });
    }
  }, [anchorRef, options.length, preferPosition]);

  const computePosition = (rect: { left: number; top: number; width: number; height: number }) => {
    const menuHeight = options.length * ITEM_HEIGHT + MENU_PADDING * 2 + (options.length - 1);
    const windowHeight = Dimensions.get('window').height;
    const windowWidth = Dimensions.get('window').width;

    let top: number;
    const spaceAbove = rect.top;
    const spaceBelow = windowHeight - rect.top - rect.height;

    if (preferPosition === 'above') {
      top = spaceAbove >= menuHeight + MENU_GAP
        ? rect.top - menuHeight - MENU_GAP
        : rect.top + rect.height + MENU_GAP;
    } else {
      top = spaceBelow >= menuHeight + MENU_GAP
        ? rect.top + rect.height + MENU_GAP
        : rect.top - menuHeight - MENU_GAP;
    }

    let left = rect.left;
    if (left + MENU_WIDTH > windowWidth - 8) {
      left = windowWidth - MENU_WIDTH - 8;
    }
    if (left < 8) {
      left = 8;
    }

    setMenuPosition({ top, left });
  };

  useEffect(() => {
    if (visible) {
      setIsRendered(true);
      pendingActionRef.current = null;
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.95);

      // Измеряем позицию якоря после рендера
      requestAnimationFrame(() => {
        measureAnchor();
      });
    } else if (isRendered) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 150,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsRendered(false);
        setMenuPosition(null);

        if (pendingActionRef.current) {
          const action = pendingActionRef.current;
          pendingActionRef.current = null;
          setTimeout(action, 50);
        }
      });
    }
  }, [visible]);

  // Запускаем анимацию появления после вычисления позиции
  useEffect(() => {
    if (menuPosition && visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [menuPosition, visible]);

  const handleAction = useCallback((action: () => void) => {
    pendingActionRef.current = action;
    onClose();
  }, [onClose]);

  if (Platform.OS !== 'web' || !isRendered || !menuPosition) {
    return null;
  }

  const menuContent = (
    <>
      {/* Прозрачный click-catcher — без затемнения */}
      <View
        style={styles.clickCatcher}
        // @ts-ignore — web-only event
        onClick={onClose}
      />

      <Animated.View
        style={[
          styles.menu,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            top: menuPosition.top,
            left: menuPosition.left,
            width: MENU_WIDTH,
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {options.map((item, index) => (
          <React.Fragment key={item.key}>
            <TouchableOpacity
              style={[
                styles.menuItem,
                item.disabled && styles.menuItemDisabled,
              ]}
              onPress={() => handleAction(item.onPress)}
              activeOpacity={0.7}
              disabled={item.disabled}
            >
              {item.icon && (
                <Ionicons name={item.icon} size={20} color={item.color || theme.primary} />
              )}
              <Text style={[styles.menuItemText, { color: item.color || theme.text }]}>
                {item.label}
              </Text>
            </TouchableOpacity>
            {index < options.length - 1 && (
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
            )}
          </React.Fragment>
        ))}
      </Animated.View>
    </>
  );

  // Рендерим через портал в document.body чтобы не зависеть от родительского layout
  if (typeof document !== 'undefined' && ReactDOM?.createPortal) {
    return ReactDOM.createPortal(menuContent, document.body);
  }

  return menuContent;
};

const styles = StyleSheet.create({
  clickCatcher: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9998,
  },
  menu: {
    position: 'fixed' as any,
    zIndex: 9999,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    paddingVertical: MENU_PADDING,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
      },
      default: {},
    }),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
    height: ITEM_HEIGHT,
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginHorizontal: 12,
  },
});
