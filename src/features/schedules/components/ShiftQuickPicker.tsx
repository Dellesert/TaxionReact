/**
 * ShiftQuickPicker
 * Компактный popup для быстрого выбора типа смены в Grid View
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import type { ShiftType, ScheduleEntry } from '../types/schedule.types';

interface ShiftOption {
  value: ShiftType;
  label: string;
  color: string;
}

const SHIFT_OPTIONS: ShiftOption[] = [
  { value: 'morning', label: 'У', color: '#F59E0B' },
  { value: 'evening', label: 'В', color: '#8B5CF6' },
  { value: 'full_day', label: 'Д', color: '#10B981' },
];

interface ShiftQuickPickerProps {
  visible: boolean;
  entry: ScheduleEntry | null;
  position: { x: number; y: number };
  onSelectShift: (shiftType: ShiftType) => void;
  onDelete: () => void;
  onClose: () => void;
  isLoading?: boolean;
}

export const ShiftQuickPicker: React.FC<ShiftQuickPickerProps> = ({
  visible,
  entry,
  position,
  onSelectShift,
  onDelete,
  onClose,
  isLoading = false,
}) => {
  const { theme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
    }
  }, [visible, fadeAnim, scaleAnim]);

  const currentShiftType = entry?.shift_type;
  const hasEntry = !!entry;

  // Calculate popup position to stay within screen bounds
  const POPUP_WIDTH = hasEntry ? 200 : 160;
  const POPUP_HEIGHT = 48;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View
          style={[
            styles.popup,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              left: Math.max(8, position.x - POPUP_WIDTH / 2),
              top: Math.max(8, position.y - POPUP_HEIGHT - 8),
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
            Platform.select({
              web: {
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
              },
              default: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 20,
                elevation: 8,
              },
            }),
          ]}
        >
          {/* Shift Options */}
          <View style={styles.shiftOptions}>
            {SHIFT_OPTIONS.map((option) => {
              const isSelected = currentShiftType === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.shiftButton,
                    { backgroundColor: option.color + '20' },
                    isSelected && { backgroundColor: option.color },
                  ]}
                  onPress={() => !isLoading && onSelectShift(option.value)}
                  disabled={isLoading}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.shiftLabel,
                      { color: option.color },
                      isSelected && { color: '#FFFFFF' },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Delete Button (only for existing entries) */}
          {hasEntry && (
            <>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => !isLoading && onDelete()}
                disabled={isLoading}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  popup: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  shiftOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  shiftButton: {
    width: 40,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      },
    }),
  },
  shiftLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  divider: {
    width: 1,
    height: 24,
    marginHorizontal: 8,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
});

export default ShiftQuickPicker;
