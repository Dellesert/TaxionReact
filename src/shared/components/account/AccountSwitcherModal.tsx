/**
 * AccountSwitcherModal
 * Модалка переключения между аккаунтами.
 * Показывает текущий аккаунт, сохранённые аккаунты с опциями
 * quick switch / secure switch, кнопку добавления и выхода.
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { useAuthStore } from '@shared/store/authStore';
import { useAccountStore } from '@shared/store/accountStore';
import { Avatar } from '@shared/components/common/Avatar';
import { SavedAccount } from '@/types/account.types';

interface AccountSwitcherModalProps {
  visible: boolean;
  onClose: () => void;
  onAddAccount: () => void;
}

export const AccountSwitcherModal: React.FC<AccountSwitcherModalProps> = ({
  visible,
  onClose,
  onAddAccount,
}) => {
  const { theme, isDark } = useTheme();
  const currentUser = useAuthStore(s => s.user);
  const { logout } = useAuthStore();
  const {
    savedAccounts,
    isSwitching,
    quickSwitch,
    secureSwitch,
    removeAccount,
    loadAccounts,
  } = useAccountStore();

  const otherAccounts = savedAccounts.filter(a => a.userId !== currentUser?.id);

  // Refresh accounts list when modal opens
  useEffect(() => {
    if (visible) {
      loadAccounts();
    }
  }, [visible]);

  const handleQuickSwitch = async (account: SavedAccount) => {
    if (!account.hasSession) {
      // Нет сессии — переходим на логин
      onAddAccount();
      return;
    }
    await quickSwitch(account.userId);
    onClose();
  };

  const handleSecureSwitch = async (account: SavedAccount) => {
    await secureSwitch(account.userId);
    onClose();
  };

  const handleRemove = async (account: SavedAccount) => {
    await removeAccount(account.userId);
  };

  const handleLogout = async () => {
    onClose();
    await logout();
  };

  const handleAddAccount = () => {
    onClose();
    onAddAccount();
  };

  const dynamicStyles = StyleSheet.create({
    modalContent: {
      backgroundColor: isDark ? theme.card : '#FFFFFF',
    },
    currentAccountContainer: {
      borderBottomColor: theme.border,
    },
    accountName: {
      color: theme.text,
    },
    accountEmail: {
      color: theme.textSecondary,
    },
    sectionTitle: {
      color: theme.textTertiary,
    },
    accountItem: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    },
    sessionExpiredText: {
      color: theme.textTertiary,
    },
    divider: {
      backgroundColor: theme.border,
    },
    addButton: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    },
    addButtonText: {
      color: theme.primary,
    },
    cancelButton: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : theme.backgroundSecondary || '#F3F4F6',
    },
    cancelButtonText: {
      color: theme.text,
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View
          style={[styles.modalContent, dynamicStyles.modalContent]}
          onStartShouldSetResponder={() => true}
        >
          {/* Loading overlay */}
          {isSwitching && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.loadingText, { color: theme.text }]}>
                Переключение...
              </Text>
            </View>
          )}

          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Current account */}
            {currentUser && (
              <View style={[styles.currentAccountContainer, dynamicStyles.currentAccountContainer]}>
                <View style={styles.currentAccountRow}>
                  <Avatar
                    imageUrl={currentUser.avatar}
                    thumbnailUrl={currentUser.avatar_thumbnail}
                    name={currentUser.name || currentUser.email}
                    size={48}
                    userId={currentUser.id}
                  />
                  <View style={styles.currentAccountInfo}>
                    <Text style={[styles.currentAccountName, dynamicStyles.accountName]} numberOfLines={1}>
                      {currentUser.name || currentUser.email}
                    </Text>
                    {currentUser.name && (
                      <Text style={[styles.currentAccountEmail, dynamicStyles.accountEmail]} numberOfLines={1}>
                        {currentUser.email}
                      </Text>
                    )}
                  </View>
                  <View style={[styles.currentBadge, { backgroundColor: theme.primary + '20' }]}>
                    <Text style={[styles.currentBadgeText, { color: theme.primary }]}>
                      Текущий
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Other accounts */}
            {otherAccounts.length > 0 && (
              <View style={styles.sectionContainer}>
                <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>
                  СОХРАНЁННЫЕ АККАУНТЫ
                </Text>
                {otherAccounts.map((account) => (
                  <View
                    key={account.userId}
                    style={[styles.accountItem, dynamicStyles.accountItem]}
                  >
                    <TouchableOpacity
                      style={styles.accountItemMain}
                      onPress={() => handleQuickSwitch(account)}
                      activeOpacity={0.7}
                      disabled={isSwitching}
                    >
                      <Avatar
                        imageUrl={account.avatar}
                        thumbnailUrl={account.avatarThumbnail}
                        name={account.name || account.email}
                        size={40}
                        userId={account.userId}
                      />
                      <View style={styles.accountItemInfo}>
                        <Text style={[styles.accountItemName, dynamicStyles.accountName]} numberOfLines={1}>
                          {account.name || account.email}
                        </Text>
                        {account.name && (
                          <Text style={[styles.accountItemEmail, dynamicStyles.accountEmail]} numberOfLines={1}>
                            {account.email}
                          </Text>
                        )}
                        {!account.hasSession && (
                          <Text style={[styles.sessionExpiredText, dynamicStyles.sessionExpiredText]}>
                            Требуется вход
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                    <View style={styles.accountItemActions}>
                      {account.hasSession && (
                        <TouchableOpacity
                          style={[styles.actionButton, { backgroundColor: theme.primary + '15' }]}
                          onPress={() => handleSecureSwitch(account)}
                          disabled={isSwitching}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="lock-closed-outline" size={16} color={theme.primary} />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
                        onPress={() => handleRemove(account)}
                        disabled={isSwitching}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Divider */}
            <View style={[styles.divider, dynamicStyles.divider]} />

            {/* Add account */}
            <TouchableOpacity
              style={[styles.addButton, dynamicStyles.addButton]}
              onPress={handleAddAccount}
              disabled={isSwitching}
              activeOpacity={0.7}
            >
              <Ionicons name="person-add-outline" size={20} color={theme.primary} />
              <Text style={[styles.addButtonText, dynamicStyles.addButtonText]}>
                Добавить аккаунт
              </Text>
            </TouchableOpacity>

            {/* Logout */}
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              disabled={isSwitching}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              <Text style={styles.logoutButtonText}>Выйти</Text>
            </TouchableOpacity>

            {/* Cancel */}
            <TouchableOpacity
              style={[styles.cancelButton, dynamicStyles.cancelButton]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelButtonText, dynamicStyles.cancelButtonText]}>
                Отмена
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: 360,
    maxHeight: '80%',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  scrollView: {
    maxHeight: 500,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  // Current account
  currentAccountContainer: {
    paddingBottom: 16,
    marginBottom: 4,
    borderBottomWidth: 1,
  },
  currentAccountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentAccountInfo: {
    flex: 1,
    marginLeft: 12,
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
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Section
  sectionContainer: {
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  // Account item
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  accountItemMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  accountItemInfo: {
    flex: 1,
    marginLeft: 10,
  },
  accountItemName: {
    fontSize: 14,
    fontWeight: '500',
  },
  accountItemEmail: {
    fontSize: 12,
    marginTop: 1,
  },
  sessionExpiredText: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 2,
  },
  accountItemActions: {
    flexDirection: 'row',
    gap: 6,
    paddingRight: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Divider
  divider: {
    height: 1,
    marginVertical: 12,
  },
  // Add account
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 8,
    gap: 8,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  // Logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 8,
    gap: 8,
  },
  logoutButtonText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '600',
  },
  // Cancel
  cancelButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
