import React from 'react';
import { TouchableOpacity, StyleSheet, View, Text, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

interface ScrollToBottomButtonProps {
  visible: boolean;
  onPress: () => void;
  unreadCount?: number;
  keyboardHeight?: number;
  inputHeight?: number;
}

/**
 * Плавающая кнопка для быстрой прокрутки к последним сообщениям
 */
export const ScrollToBottomButton: React.FC<ScrollToBottomButtonProps> = ({
  visible,
  onPress,
  unreadCount = 0,
  keyboardHeight = 0,
  inputHeight = 72,
}) => {
  const { theme } = useTheme();

  if (!visible) return null;

  // Базовое положение - чуть выше поля ввода
  // На web кнопка позиционируется относительно всего экрана (fixed)
  // На iOS используется KeyboardStickyView для инпута, кнопка внутри flex контейнера
  // На Android инпут абсолютно позиционирован, нужно учитывать его высоту
  const baseBottom = Platform.OS === 'web'
    ? 90
    : Platform.OS === 'android'
      ? inputHeight + 16 // На Android учитываем высоту инпута + отступ
      : 16; // На iOS достаточно небольшого отступа
  const bottom = keyboardHeight > 0 ? baseBottom + keyboardHeight : baseBottom;

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: theme.primary, bottom }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name="chevron-down" size={24} color="#FFFFFF" />
      {unreadCount > 0 && (
        <View style={[styles.badge, { backgroundColor: '#FF3B30' }]}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 999,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
