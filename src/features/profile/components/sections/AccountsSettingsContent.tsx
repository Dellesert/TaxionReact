/**
 * AccountsSettingsContent
 * Desktop-контент для управления аккаунтами в Profile Split View.
 */

import React, { useCallback, useState } from 'react';
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
import { SavedAccount } from '@/types/account.types';
import { ConfirmDialog } from '@shared/components/common/ConfirmDialog';
import * as secureStorage from '@shared/utils/secureStorage';
import { STORAGE_KEYS } from '@shared/constants/app.constants';
import * as accountManager from '@services/accountManager';
import { websocketService } from '@services/websocket.service';
import { clearAllStorages } from '@shared/storage';
import { clearSyncMetadata } from '@shared/storage/syncMetadata';
import { useChatStore } from '@shared/store/chatStore';
import { useTaskStore } from '@shared/store/taskStore';
import { usePollStore } from '@shared/store/pollStore';
import { useCalendarStore } from '@shared/store/calendarStore';
import { useUserStore } from '@shared/store/userStore';

const AccountsSettingsContent: React.FC = () => {
  const { theme, isDark } = useTheme();
  const currentUser = useAuthStore(s => s.user);
  const {
    savedAccounts,
    isSwitching,
    quickSwitch,
    secureSwitch,
    removeAccount,
    deleteOwnAccount,
  } = useAccountStore();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [accountToRemove, setAccountToRemove] = useState<SavedAccount | null>(null);

  const otherAccounts = savedAccounts.filter(a => a.userId !== currentUser?.id);

  const handleDeleteOwnAccount = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const confirmDeleteOwnAccount = useCallback(async () => {
    setShowDeleteConfirm(false);
    await deleteOwnAccount();
  }, [deleteOwnAccount]);

  const handleRemoveAccount = useCallback((account: SavedAccount) => {
    setAccountToRemove(account);
  }, []);

  const confirmRemoveAccount = useCallback(async () => {
    if (accountToRemove) {
      await removeAccount(accountToRemove.userId);
      setAccountToRemove(null);
    }
  }, [accountToRemove, removeAccount]);

  const handleAddAccount = useCallback(async () => {
    const user = useAuthStore.getState().user;
    const sessionId = await secureStorage.getItemAsync(STORAGE_KEYS.SESSION_ID);

    if (user && sessionId) {
      await accountManager.saveAccountAfterLogin(user, sessionId);
    }

    websocketService.disconnect();

    useChatStore.getState().set({
      chats: [],
      tabs: {
        all: { pinnedChats: [], regularChats: [], offset: 0, hasMore: true, loaded: false },
        private: { pinnedChats: [], regularChats: [], offset: 0, hasMore: true, loaded: false },
        group: { pinnedChats: [], regularChats: [], offset: 0, hasMore: true, loaded: false },
        favorite: { pinnedChats: [], regularChats: [], offset: 0, hasMore: true, loaded: false },
      },
      messages: {},
      totalUnreadCount: 0,
    });
    useTaskStore.getState().clearCache();
    usePollStore.getState().clearCache();
    useCalendarStore.getState().clearCache();
    useUserStore.getState().clearCache();
    await clearAllStorages();
    await clearSyncMetadata();

    await secureStorage.deleteItemAsync(STORAGE_KEYS.SESSION_ID);
    await secureStorage.deleteItemAsync(STORAGE_KEYS.USER_DATA);

    useAuthStore.setState({
      user: null,
      sessionId: null,
      isAuthenticated: false,
    });
  }, []);

  const handleQuickSwitch = async (account: SavedAccount) => {
    if (!account.hasSession) {
      handleAddAccount();
      return;
    }
    await quickSwitch(account.userId);
  };

  return (
    <View style={styles.container}>
      {/* Loading */}
      {isSwitching && (
        <View style={[styles.switchingBanner, { backgroundColor: theme.primary + '10' }]}>
          <ActivityIndicator size="small" color={theme.primary} />
          <Text style={[styles.switchingText, { color: theme.primary }]}>
            Переключение аккаунта...
          </Text>
        </View>
      )}

      {/* Current account */}
      {currentUser && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textTertiary }]}>
            ТЕКУЩИЙ АККАУНТ
          </Text>
          <View style={[styles.currentAccountCard, {
            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            borderColor: theme.border,
          }]}>
            <Avatar
              imageUrl={currentUser.avatar}
              thumbnailUrl={currentUser.avatar_thumbnail}
              name={currentUser.name || currentUser.email}
              size={48}
              userId={currentUser.id}
            />
            <View style={styles.currentAccountInfo}>
              <Text style={[styles.currentAccountName, { color: theme.text }]} numberOfLines={1}>
                {currentUser.name || currentUser.email}
              </Text>
              {currentUser.name && (
                <Text style={[styles.currentAccountEmail, { color: theme.textSecondary }]} numberOfLines={1}>
                  {currentUser.email}
                </Text>
              )}
              <Text style={[styles.roleText, { color: theme.textTertiary }]}>
                {currentUser.role === 'admin' ? 'Администратор' :
                 currentUser.role === 'department_head' ? 'Руководитель отдела' :
                 currentUser.role === 'super_admin' ? 'Суперадмин' : 'Сотрудник'}
              </Text>
            </View>
            <View style={styles.currentAccountActions}>
              <View style={[styles.activeBadge, { backgroundColor: theme.primary + '20' }]}>
                <View style={[styles.activeDot, { backgroundColor: theme.primary }]} />
                <Text style={[styles.activeBadgeText, { color: theme.primary }]}>Активен</Text>
              </View>
              <TouchableOpacity
                style={[styles.deleteOwnBtn, { backgroundColor: 'rgba(239, 68, 68, 0.08)' }]}
                onPress={handleDeleteOwnAccount}
                disabled={isSwitching}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={16} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Other accounts */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textTertiary }]}>
          СОХРАНЁННЫЕ АККАУНТЫ
        </Text>

        {otherAccounts.length === 0 ? (
          <View style={[styles.emptyState, {
            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            borderColor: theme.border,
          }]}>
            <Ionicons name="people-outline" size={32} color={theme.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.textTertiary }]}>
              Нет сохранённых аккаунтов
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.textTertiary }]}>
              Добавьте аккаунт для быстрого переключения
            </Text>
          </View>
        ) : (
          otherAccounts.map((account) => (
            <View
              key={account.userId}
              style={[styles.accountCard, {
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                borderColor: theme.border,
              }]}
            >
              <TouchableOpacity
                style={styles.accountCardMain}
                onPress={() => handleQuickSwitch(account)}
                disabled={isSwitching}
                activeOpacity={0.7}
              >
                <Avatar
                  imageUrl={account.avatar}
                  thumbnailUrl={account.avatarThumbnail}
                  name={account.name || account.email}
                  size={40}
                  userId={account.userId}
                />
                <View style={styles.accountCardInfo}>
                  <Text style={[styles.accountCardName, { color: theme.text }]} numberOfLines={1}>
                    {account.name || account.email}
                  </Text>
                  {account.name && (
                    <Text style={[styles.accountCardEmail, { color: theme.textSecondary }]} numberOfLines={1}>
                      {account.email}
                    </Text>
                  )}
                  {!account.hasSession && (
                    <View style={styles.expiredRow}>
                      <Ionicons name="warning-outline" size={12} color="#F59E0B" />
                      <Text style={[styles.expiredText, { color: '#F59E0B' }]}>
                        Сессия истекла — требуется вход
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
              <View style={styles.accountCardActions}>
                {account.hasSession ? (
                  <>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: theme.primary + '12' }]}
                      onPress={() => handleQuickSwitch(account)}
                      disabled={isSwitching}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="swap-horizontal-outline" size={16} color={theme.primary} />
                      <Text style={[styles.actionBtnText, { color: theme.primary }]}>Быстрый</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#F59E0B15' }]}
                      onPress={() => secureSwitch(account.userId)}
                      disabled={isSwitching}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="lock-closed-outline" size={16} color="#F59E0B" />
                      <Text style={[styles.actionBtnText, { color: '#F59E0B' }]}>С выходом</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: theme.primary + '12' }]}
                    onPress={() => handleQuickSwitch(account)}
                    disabled={isSwitching}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="log-in-outline" size={16} color={theme.primary} />
                    <Text style={[styles.actionBtnText, { color: theme.primary }]}>Войти</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.removeBtn, { backgroundColor: 'rgba(239, 68, 68, 0.08)' }]}
                  onPress={() => handleRemoveAccount(account)}
                  disabled={isSwitching}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Add account */}
      <TouchableOpacity
        style={[styles.addAccountButton, { backgroundColor: theme.primary }]}
        onPress={handleAddAccount}
        disabled={isSwitching}
        activeOpacity={0.7}
      >
        <Ionicons name="person-add-outline" size={20} color="#FFFFFF" />
        <Text style={styles.addAccountButtonText}>Добавить аккаунт</Text>
      </TouchableOpacity>

      {/* Info */}
      <View style={styles.infoSection}>
        <Ionicons name="information-circle-outline" size={16} color={theme.textTertiary} />
        <Text style={[styles.infoText, { color: theme.textTertiary }]}>
          Быстрое переключение сохраняет сессию текущего аккаунта.{'\n'}
          Переключение с выходом уничтожает текущую сессию — потребуется повторный ввод пароля.
        </Text>
      </View>

      <ConfirmDialog
        visible={showDeleteConfirm}
        title="Удалить аккаунт"
        message="Вы уверены, что хотите полностью удалить свой аккаунт? Это действие необратимо."
        confirmText="Удалить"
        cancelText="Отмена"
        onConfirm={confirmDeleteOwnAccount}
        onCancel={() => setShowDeleteConfirm(false)}
        destructive
      />

      <ConfirmDialog
        visible={!!accountToRemove}
        title="Удалить сохранённый аккаунт"
        message={`Удалить аккаунт ${accountToRemove?.name || accountToRemove?.email || ''} из списка сохранённых?`}
        confirmText="Удалить"
        cancelText="Отмена"
        onConfirm={confirmRemoveAccount}
        onCancel={() => setAccountToRemove(null)}
        destructive
      />
    </View>
  );
};

export default AccountsSettingsContent;

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  switchingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  switchingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  // Current account
  currentAccountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  currentAccountInfo: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },
  currentAccountName: {
    fontSize: 16,
    fontWeight: '600',
  },
  currentAccountEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  roleText: {
    fontSize: 12,
    marginTop: 3,
  },
  currentAccountActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  deleteOwnBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 5,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 28,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 12,
  },
  // Account cards
  accountCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
  },
  accountCardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  accountCardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  accountCardName: {
    fontSize: 15,
    fontWeight: '500',
  },
  accountCardEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  expiredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  expiredText: {
    fontSize: 11,
    fontWeight: '500',
  },
  accountCardActions: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 6,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '500',
  },
  removeBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
  // Add account
  addAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 20,
  },
  addAccountButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  // Info
  infoSection: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 20,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
});
