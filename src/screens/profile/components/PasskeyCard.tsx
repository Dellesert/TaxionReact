/**
 * PasskeyCard Component
 * Карточка Passkey
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';
import { formatPasskeyDate } from '@utils/passkeyFormatters';
import type { Passkey } from '@types/user.types';

interface PasskeyCardProps {
  passkey: Passkey;
  isLast: boolean;
  isDeleting: boolean;
  onRename: (passkey: Passkey) => void;
  onDelete: (passkey: Passkey) => void;
}

export const PasskeyCard: React.FC<PasskeyCardProps> = ({
  passkey,
  isLast,
  isDeleting,
  onRename,
  onDelete,
}) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.passkeyCard,
        { backgroundColor: theme.backgroundSecondary, borderBottomColor: theme.borderLight },
        isLast && styles.passkeyCardLast,
      ]}
    >
      <View style={styles.passkeyHeader}>
        <Ionicons name="key" size={24} color={theme.primary} style={styles.passkeyIcon} />
        <View style={styles.passkeyInfo}>
          <Text style={[styles.passkeyName, { color: theme.text }]}>
            {passkey.name || 'Устройство'}
          </Text>
          <Text style={[styles.passkeyDate, { color: theme.textSecondary }]}>
            Создан: {formatPasskeyDate(passkey.created_at)}
          </Text>
          {passkey.last_used_at && (
            <Text style={[styles.passkeyDate, { color: theme.textSecondary }]}>
              Последний вход: {formatPasskeyDate(passkey.last_used_at)}
            </Text>
          )}
        </View>
        <View style={styles.passkeyActions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => onRename(passkey)}>
            <Ionicons name="create-outline" size={20} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onDelete(passkey)}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={theme.error} />
            ) : (
              <Ionicons name="trash-outline" size={20} color={theme.error} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  passkeyCard: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  passkeyCardLast: {
    borderBottomWidth: 0,
  },
  passkeyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  passkeyIcon: {
    marginRight: 12,
  },
  passkeyInfo: {
    flex: 1,
  },
  passkeyName: {
    fontSize: 16,
    fontWeight: '600',
  },
  passkeyDate: {
    fontSize: 13,
    marginTop: 2,
  },
  passkeyActions: {
    flexDirection: 'row',
    marginLeft: 'auto',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
});
