/**
 * NotificationBell Component
 * Иконка колокольчика с badge для доступа к уведомлениям
 */

import React, { useState } from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotificationStore } from '@shared/store/notificationStore';
import { useTheme } from '@shared/hooks/useTheme';
import { NotificationModal } from '@components/notification/NotificationModal';

export const NotificationBell: React.FC = () => {
  const { theme } = useTheme();
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const [modalVisible, setModalVisible] = useState(false);

  const handlePress = () => {
    setModalVisible(true);
  };

  return (
    <>
      <TouchableOpacity
        onPress={handlePress}
        style={styles.container}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <View style={styles.iconContainer}>
          <Ionicons
            name={unreadCount > 0 ? 'notifications' : 'notifications-outline'}
            size={24}
            color={theme.primary}
          />
          {unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: theme.primary, borderColor: theme.card }]}>
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      <NotificationModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
  },
  iconContainer: {
    position: 'relative',
    width: 24,
    height: 24,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
});
