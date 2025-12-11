import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NotificationBell } from '@shared/components/common/NotificationBell';
import { ConnectionStatus } from '@shared/components/common/ConnectionStatus';
import { useTheme } from '@shared/hooks/useTheme';

interface ChatListHeaderProps {
  isEditMode: boolean;
  isConnected: boolean;
  onToggleEditMode: () => void;
  onToggleSearch: () => void;
  onNewChat: () => void;
  isSearchVisible: boolean;
}

export const ChatListHeader: React.FC<ChatListHeaderProps> = ({
  isEditMode,
  isConnected,
  onToggleEditMode,
  onToggleSearch,
  onNewChat,
  isSearchVisible,
}) => {
  const { theme } = useTheme();

  // Простая анимация fade для кнопок в header
  const buttonOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Простая плавная анимация без bounce и scale
    Animated.sequence([
      // Сначала скрываем текущие кнопки
      Animated.timing(buttonOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      // Затем показываем новые кнопки
      Animated.timing(buttonOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isEditMode, buttonOpacity]);

  return (
    <View
      style={[
        styles.headerRow,
        { marginTop: isEditMode ? 0 : 0, marginBottom: isEditMode ? -4 : -4 },
      ]}
    >
      {/* Left - Notifications */}
      <View style={styles.headerLeft}>
        <NotificationBell />
      </View>

      {/* Center - Title or Connection Status */}
      {isConnected === false ? (
        <ConnectionStatus compact />
      ) : (
        <Text style={[styles.headerTitle, { color: theme.text }]}>Чаты</Text>
      )}

      {/* Right - Actions */}
      <View style={[styles.headerRight, styles.headerActions]}>
        {!isEditMode ? (
          <Animated.View style={[
            styles.buttonGroup,
          ]}>
            <TouchableOpacity onPress={onToggleEditMode} style={styles.iconButton}>
              <Ionicons name="ellipsis-vertical" size={24} color={theme.error} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onToggleSearch} style={[styles.iconButton, styles.searchButton]}>
              <Ionicons
                name={isSearchVisible ? 'close' : 'search'}
                size={22}
                color={theme.error}
              />
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <Animated.View >
            <TouchableOpacity onPress={onToggleEditMode} style={styles.editButton}>
              <Text style={[styles.editButtonText, { color: theme.error }]}>Готово</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
        {!isEditMode ? (
          <Animated.View >
            <TouchableOpacity onPress={onNewChat} style={styles.addButton}>
              <Ionicons name="add" size={30} color={theme.primary} />
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <View style={styles.addButton} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerLeft: {
    width: 40,
    justifyContent: 'flex-start',
  },
  editButton: {
    paddingHorizontal: 4,
  },
  editButtonText: {
    fontSize: 18,
    fontWeight: '400',
  },
  addButton: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    width: 100,
    justifyContent: 'flex-end',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconButton: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButton: {
    marginLeft: 4,
  },
  buttonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
