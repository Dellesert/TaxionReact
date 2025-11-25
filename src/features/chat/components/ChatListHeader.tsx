import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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

  return (
    <View
      style={[
        styles.headerRow,
        { marginTop: isEditMode ? 10 : 0, marginBottom: isEditMode ? 6 : -4 },
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
          <>
            <TouchableOpacity onPress={onToggleEditMode} style={styles.iconButton}>
              <Ionicons name="ellipsis-vertical" size={24} color={theme.error} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onToggleSearch} style={styles.iconButton}>
              <Ionicons
                name={isSearchVisible ? 'close' : 'search'}
                size={24}
                color={theme.error}
              />
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity onPress={onToggleEditMode} style={styles.editButton}>
            <Text style={[styles.editButtonText, { color: theme.error }]}>Готово</Text>
          </TouchableOpacity>
        )}
        {!isEditMode ? (
          <TouchableOpacity onPress={onNewChat} style={styles.addButton}>
            <Ionicons name="add" size={30} color={theme.primary} />
          </TouchableOpacity>
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
    width: 100,
    justifyContent: 'flex-start',
  },
  editButton: {
    width: 100,
    paddingHorizontal: 4,
  },
  editButtonText: {
    fontSize: 16,
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
});
