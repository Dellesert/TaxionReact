import React, { useEffect, useRef, useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { useAnimationStore } from '@shared/store/animationStore';

interface ChatActionBarProps {
  selectedCount: number;
  onMarkAsRead: () => void;
  onDelete: () => void;
}

export const ChatActionBar: React.FC<ChatActionBarProps> = ({
  selectedCount,
  onMarkAsRead,
  onDelete,
}) => {
  const { theme } = useTheme();
  const reduceAnimations = useAnimationStore((s) => s.reduceAnimations);
  const isVisible = selectedCount > 0;
  const [shouldRender, setShouldRender] = useState(isVisible);
  const animValue = useRef(new Animated.Value(isVisible ? 1 : 0)).current;

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
    }
    if (reduceAnimations) {
      animValue.setValue(isVisible ? 1 : 0);
      if (!isVisible) setShouldRender(false);
    } else {
      Animated.timing(animValue, {
        toValue: isVisible ? 1 : 0,
        duration: 220,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && !isVisible) {
          setShouldRender(false);
        }
      });
    }
  }, [isVisible]);

  if (!shouldRender) return null;

  const translateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-8, 0],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: theme.background, borderBottomColor: theme.border },
        { opacity: animValue, transform: [{ translateY }] },
      ]}
    >
      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: theme.backgroundTertiary }]}
        onPress={onMarkAsRead}
      >
        <Ionicons name="checkmark-done" size={20} color={theme.text} />
        <Text style={[styles.actionButtonText, { color: theme.text }]}>
          Прочитано ({selectedCount})
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: theme.error + '15' }]}
        onPress={onDelete}
      >
        <Ionicons name="trash" size={20} color={theme.error} />
        <Text style={[styles.actionButtonText, { color: theme.error }]}>
          Удалить ({selectedCount})
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
