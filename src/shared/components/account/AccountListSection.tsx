/**
 * AccountListSection
 * Секция аккаунтов для мобильного ProfileScreen.
 * Показывает сохранённые аккаунты и кнопку добавления.
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
import { useAuthStore } from '@shared/store/authStore';
import { useAccountStore } from '@shared/store/accountStore';
import { Avatar } from '@shared/components/common/Avatar';
import { ProfileMenuSection } from '@/features/profile/components/common/ProfileMenuSection';
import { SavedAccount } from '@/types/account.types';

interface AccountListSectionProps {
  onAddAccount: () => void;
}

export const AccountListSection: React.FC<AccountListSectionProps> = ({ onAddAccount }) => {
  const { theme } = useTheme();
  const currentUser = useAuthStore(s => s.user);
  const {
    savedAccounts,
    isSwitching,
    quickSwitch,
    secureSwitch,
    removeAccount,
  } = useAccountStore();

  const otherAccounts = savedAccounts.filter(a => a.userId !== currentUser?.id);

  // Не показываем секцию если нет других аккаунтов
  if (otherAccounts.length === 0 && savedAccounts.length <= 1) {
    return (
      <ProfileMenuSection title="АККАУНТЫ">
        <TouchableOpacity
          style={[styles.addAccountRow, { backgroundColor: theme.backgroundSecondary }]}
          onPress={onAddAccount}
          disabled={isSwitching}
        >
          <View style={[styles.addIconContainer, { backgroundColor: theme.primary + '15' }]}>
            <Ionicons name="person-add-outline" size={18} color={theme.primary} />
          </View>
          <Text style={[styles.addAccountText, { color: theme.primary }]}>
            Добавить аккаунт
          </Text>
          <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
        </TouchableOpacity>
      </ProfileMenuSection>
    );
  }

  const handleQuickSwitch = async (account: SavedAccount) => {
    if (!account.hasSession) {
      onAddAccount();
      return;
    }
    await quickSwitch(account.userId);
  };

  return (
    <ProfileMenuSection title="АККАУНТЫ">
      {isSwitching && (
        <View style={[styles.switchingOverlay, { backgroundColor: theme.backgroundSecondary }]}>
          <ActivityIndicator size="small" color={theme.primary} />
          <Text style={[styles.switchingText, { color: theme.textSecondary }]}>
            Переключение...
          </Text>
        </View>
      )}

      {otherAccounts.map((account) => (
        <TouchableOpacity
          key={account.userId}
          style={[
            styles.accountRow,
            {
              backgroundColor: theme.backgroundSecondary,
              borderBottomWidth: 1,
              borderBottomColor: theme.borderLight,
            },
          ]}
          onPress={() => handleQuickSwitch(account)}
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
            {!account.hasSession && (
              <Text style={[styles.sessionExpired, { color: theme.textTertiary }]}>
                Требуется вход
              </Text>
            )}
          </View>
          <View style={styles.accountActions}>
            {account.hasSession && (
              <TouchableOpacity
                style={[styles.smallActionButton, { backgroundColor: theme.primary + '12' }]}
                onPress={() => secureSwitch(account.userId)}
                disabled={isSwitching}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="lock-closed-outline" size={14} color={theme.primary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.smallActionButton, { backgroundColor: 'rgba(239, 68, 68, 0.08)' }]}
              onPress={() => removeAccount(account.userId)}
              disabled={isSwitching}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={14} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      ))}

      {/* Add account button */}
      <TouchableOpacity
        style={[styles.addAccountRow, { backgroundColor: theme.backgroundSecondary }]}
        onPress={onAddAccount}
        disabled={isSwitching}
      >
        <View style={[styles.addIconContainer, { backgroundColor: theme.primary + '15' }]}>
          <Ionicons name="person-add-outline" size={18} color={theme.primary} />
        </View>
        <Text style={[styles.addAccountText, { color: theme.primary }]}>
          Добавить аккаунт
        </Text>
        <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
      </TouchableOpacity>
    </ProfileMenuSection>
  );
};

const styles = StyleSheet.create({
  switchingOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  switchingText: {
    fontSize: 13,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  accountInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  accountName: {
    fontSize: 15,
    fontWeight: '500',
  },
  accountEmail: {
    fontSize: 12,
    marginTop: 1,
  },
  sessionExpired: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 2,
  },
  accountActions: {
    flexDirection: 'row',
    gap: 6,
  },
  smallActionButton: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addAccountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  addIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addAccountText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
  },
});
