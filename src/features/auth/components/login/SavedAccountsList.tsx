/**
 * SavedAccountsList
 * Список сохранённых аккаунтов на экране логина.
 * Аккаунты с сессией — кнопка "Переключиться".
 * Аккаунты без сессии — предзаполняют email.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { Avatar } from '@shared/components/common/Avatar';
import { SavedAccount } from '@/types/account.types';

interface SavedAccountsListProps {
  accounts: SavedAccount[];
  isSwitching: boolean;
  onQuickSwitch: (account: SavedAccount) => void;
  onSelectAccount: (account: SavedAccount) => void;
}

export const SavedAccountsList: React.FC<SavedAccountsListProps> = ({
  accounts,
  isSwitching,
  onQuickSwitch,
  onSelectAccount,
}) => {
  const { theme, isDark } = useTheme();

  if (accounts.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={[styles.dividerRow]}>
        <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
        <Text style={[styles.dividerText, { color: theme.textTertiary }]}>
          Сохранённые аккаунты
        </Text>
        <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
      </View>

      {isSwitching && (
        <View style={styles.switchingRow}>
          <ActivityIndicator size="small" color={theme.primary} />
          <Text style={[styles.switchingText, { color: theme.textSecondary }]}>
            Переключение...
          </Text>
        </View>
      )}

      {accounts.map((account) => (
        <TouchableOpacity
          key={account.userId}
          style={[styles.accountRow, {
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
          }]}
          onPress={() => {
            if (account.hasSession) {
              onQuickSwitch(account);
            } else {
              onSelectAccount(account);
            }
          }}
          disabled={isSwitching}
          activeOpacity={0.7}
        >
          <Avatar
            imageUrl={account.avatar}
            thumbnailUrl={account.avatarThumbnail}
            name={account.name || account.email}
            size={36}
            userId={account.userId}
          />
          <View style={styles.accountInfo}>
            <Text style={[styles.accountName, { color: theme.text }]} numberOfLines={1}>
              {account.name || account.email}
            </Text>
            {account.name && (
              <Text style={[styles.accountEmail, { color: theme.textSecondary }]} numberOfLines={1}>
                {account.email}
              </Text>
            )}
          </View>
          {account.hasSession ? (
            <View style={[styles.switchBadge, { backgroundColor: theme.primary + '15' }]}>
              <Ionicons name="swap-horizontal-outline" size={14} color={theme.primary} />
              <Text style={[styles.switchBadgeText, { color: theme.primary }]}>
                Войти
              </Text>
            </View>
          ) : (
            <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '500',
  },
  switchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 8,
    marginBottom: 8,
  },
  switchingText: {
    fontSize: 13,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  accountInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  accountName: {
    fontSize: 14,
    fontWeight: '500',
  },
  accountEmail: {
    fontSize: 12,
    marginTop: 1,
  },
  switchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  switchBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
