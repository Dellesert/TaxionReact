import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

interface ScrollToBottomButtonProps {
  visible: boolean;
  onPress: () => void;
}

/**
 * Плавающая кнопка для быстрой прокрутки к последним сообщениям
 */
export const ScrollToBottomButton: React.FC<ScrollToBottomButtonProps> = ({
  visible,
  onPress,
}) => {
  const { theme } = useTheme();

  if (!visible) return null;

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: theme.primary }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name="chevron-down" size={24} color="#FFFFFF" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 16,
    bottom: 80,
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
});
