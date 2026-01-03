/**
 * MessageSearchOverlay Component
 * Панель поиска сообщений в чате (только поле поиска, без списка результатов)
 */

import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated as RNAnimated,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

interface MessageSearchOverlayProps {
  isVisible: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSubmitSearch: () => void;
  onClose: () => void;
}

export const MessageSearchOverlay: React.FC<MessageSearchOverlayProps> = ({
  isVisible,
  searchQuery,
  onSearchChange,
  onSubmitSearch,
  onClose,
}) => {
  const { theme } = useTheme();
  const slideAnimation = useRef(new RNAnimated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    RNAnimated.timing(slideAnimation, {
      toValue: isVisible ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();

    if (isVisible) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isVisible]);

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    onClose();
  }, [onClose]);

  if (!isVisible) return null;

  return (
    <RNAnimated.View
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          transform: [
            {
              translateY: slideAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [-100, 0],
              }),
            },
          ],
          opacity: slideAnimation,
        },
      ]}
    >
      {/* Search Input */}
      <View style={[styles.searchBar, { backgroundColor: theme.backgroundSecondary }]}>
        <View style={[styles.inputContainer, { backgroundColor: theme.backgroundTertiary }]}>
          <Ionicons name="search" size={18} color={theme.textTertiary} />
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Поиск сообщений..."
            placeholderTextColor={theme.inputPlaceholder}
            value={searchQuery}
            onChangeText={onSearchChange}
            onSubmitEditing={onSubmitSearch}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => onSearchChange('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={18} color={theme.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={handleClose} style={styles.cancelButton}>
          <Text style={[styles.cancelText, { color: theme.primary }]}>Отмена</Text>
        </TouchableOpacity>
      </View>
    </RNAnimated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 100,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 12,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    height: 36,
    borderRadius: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
    outlineStyle: 'none',
  } as any,
  clearButton: {
    padding: 2,
  },
  cancelButton: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '400',
  },
});
