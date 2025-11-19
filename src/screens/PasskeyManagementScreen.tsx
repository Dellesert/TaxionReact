/**
 * Passkey Management Screen
 * Управление passkeys (биометрическая аутентификация)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@hooks/useTheme';
import { useNotification } from '@contexts/NotificationContext';
import { useActionModal } from '@contexts/ActionModalContext';
import * as authApi from '@api/auth.api';
import type { Passkey as PasskeyType } from '@types/user.types';
import { isPasskeySupported, registerPasskey, formatPasskeyError, getPlatformInfo } from '@utils/passkeyUtils';

const PasskeyManagementScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { showError, showSuccess } = useNotification();
  const { showConfirm } = useActionModal();

  const [passkeys, setPasskeys] = useState<PasskeyType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [passkeySupported, setPasskeySupported] = useState(false);

  // Modal for device name
  const [showNameModal, setShowNameModal] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [editingPasskey, setEditingPasskey] = useState<PasskeyType | null>(null);
  const [pendingCredential, setPendingCredential] = useState<any>(null);

  useEffect(() => {
    checkPasskeySupport();
    loadPasskeys();
  }, []);

  const checkPasskeySupport = async () => {
    try {
      const supported = await isPasskeySupported();
      setPasskeySupported(supported);
    } catch (error) {
      setPasskeySupported(false);
    }
  };

  const loadPasskeys = async () => {
    try {
      setIsLoading(true);
      const response = await authApi.listPasskeys();
      setPasskeys(response.passkeys || []);
    } catch (error: any) {
      showError('Не удалось загрузить список Passkey');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterPasskey = async () => {
    if (!passkeySupported) {
      showError('Passkey не поддерживается на этом устройстве');
      return;
    }

    setIsRegistering(true);
    try {
      // 1. Get creation options from server
      const beginResponse = await authApi.beginPasskeyRegister();

      // 2. Create credential on device (кросс-платформенно)
      const credential = await registerPasskey(
        beginResponse.publicKey.challenge,
        { publicKey: beginResponse.publicKey }
      );

      // 3. Get device name
      const defaultName = Platform.select({
        ios: 'iPhone',
        android: 'Android',
        web: 'Веб-браузер',
        default: 'Устройство',
      });

      setDeviceName(defaultName);
      setShowNameModal(true);

      // Store credential temporarily to finish registration after naming
      setPendingCredential(credential);
    } catch (error: any) {
      console.error('❌ Passkey registration error:', error);
      const errorMessage = formatPasskeyError(error);
      showError(errorMessage);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleFinishRegistration = async () => {
    if (!pendingCredential) {
      showError('Credential не найден');
      return;
    }

    try {
      // 4. Send credential to server with device name
      const registerResponse = await authApi.finishPasskeyRegister({
        credential: pendingCredential,
        name: deviceName,
      });

      showSuccess('Passkey успешно зарегистрирован!');
      setShowNameModal(false);
      setDeviceName('');
      setPendingCredential(null);

      // Reload passkeys list
      await loadPasskeys();
    } catch (error: any) {
      console.error('❌ Failed to finish registration:', error);
      showError(error.message || 'Не удалось завершить регистрацию Passkey');
    }
  };

  const handleDeletePasskey = async (passkey: PasskeyType) => {
    if (Platform.OS === 'web') {
      // Web: just proceed with deletion
      await performDeletePasskey(passkey);
    } else {
      // Mobile: show confirmation dialog
      showConfirm(
        'Удалить Passkey',
        `Вы уверены, что хотите удалить "${passkey.name || 'Устройство'}"?`,
        () => performDeletePasskey(passkey),
        undefined,
        { confirmText: 'Удалить', cancelText: 'Отмена', destructive: true }
      );
    }
  };

  const performDeletePasskey = async (passkey: PasskeyType) => {
    try {
      setIsDeleting(passkey.id);
      await authApi.deletePasskey(passkey.id);
      showSuccess('Passkey удален');
      await loadPasskeys();
    } catch (error: any) {
      showError('Не удалось удалить Passkey');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleRenamePasskey = (passkey: PasskeyType) => {
    setEditingPasskey(passkey);
    setDeviceName(passkey.name || '');
    setShowNameModal(true);
  };

  const handleFinishRename = async () => {
    if (!editingPasskey) return;

    try {
      // Backend expects 'name', not 'device_name'
      await authApi.updatePasskey(editingPasskey.id, { name: deviceName });
      showSuccess('Название обновлено');
      setShowNameModal(false);
      setDeviceName('');
      setEditingPasskey(null);
      await loadPasskeys();
    } catch (error: any) {
      showError('Не удалось обновить название');
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      backgroundColor: theme.backgroundSecondary,
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'ios' ? 0 : 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backButton: {
      padding: 8,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      flex: 1,
      textAlign: 'center',
    },
    headerRight: {
      width: 40,
    },
    content: {
      flex: 1,
    },
    section: {
      backgroundColor: theme.backgroundSecondary,
      marginBottom: 16,
      paddingVertical: 8,
    },
    infoCard: {
      backgroundColor: theme.backgroundSecondary,
      margin: 16,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    infoTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 8,
    },
    infoText: {
      fontSize: 14,
      color: theme.textSecondary,
      lineHeight: 20,
    },
    registerButton: {
      backgroundColor: theme.primary,
      margin: 16,
      padding: 16,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    registerButtonDisabled: {
      opacity: 0.6,
    },
    registerButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textTertiary,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
    },
    passkeyCard: {
      backgroundColor: theme.backgroundSecondary,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
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
      color: theme.text,
    },
    passkeyDate: {
      fontSize: 13,
      color: theme.textSecondary,
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
    emptyState: {
      padding: 32,
      alignItems: 'center',
    },
    emptyIcon: {
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    modalContent: {
      backgroundColor: theme.backgroundSecondary,
      borderRadius: 12,
      padding: 24,
      width: '100%',
      maxWidth: 400,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 16,
    },
    input: {
      backgroundColor: theme.background,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: theme.text,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 16,
    },
    modalButtons: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    modalButton: {
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 8,
      marginLeft: 8,
    },
    modalButtonCancel: {
      backgroundColor: theme.backgroundSecondary,
      borderWidth: 1,
      borderColor: theme.border,
    },
    modalButtonConfirm: {
      backgroundColor: theme.primary,
    },
    modalButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    modalButtonTextCancel: {
      color: theme.text,
    },
    modalButtonTextConfirm: {
      color: '#FFFFFF',
    },
  });

  if (!passkeySupported) {
    return (
      <View style={dynamicStyles.container}>
        <SafeAreaView style={{ backgroundColor: theme.backgroundSecondary }} edges={['top']}>
          <View style={dynamicStyles.header}>
            <TouchableOpacity
              style={dynamicStyles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={theme.primary} />
            </TouchableOpacity>
            <Text style={dynamicStyles.headerTitle}>Управление Passkey</Text>
            <View style={dynamicStyles.headerRight} />
          </View>
        </SafeAreaView>
        <View style={dynamicStyles.emptyState}>
          <Ionicons name="lock-closed-outline" size={64} color={theme.textTertiary} style={dynamicStyles.emptyIcon} />
          <Text style={dynamicStyles.emptyTitle}>Не поддерживается</Text>
          <Text style={dynamicStyles.emptyText}>
            Passkey не поддерживается на этом устройстве. Для использования Passkey требуется iOS 16+, Android 9+, или современный веб-браузер с поддержкой WebAuthn.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={dynamicStyles.container}>
      <SafeAreaView style={{ backgroundColor: theme.backgroundSecondary }} edges={['top']}>
        <View style={dynamicStyles.header}>
          <TouchableOpacity
            style={dynamicStyles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.primary} />
          </TouchableOpacity>
          <Text style={dynamicStyles.headerTitle}>Управление Passkey</Text>
          <View style={dynamicStyles.headerRight} />
        </View>
      </SafeAreaView>

      <ScrollView style={dynamicStyles.content}>
        <View style={dynamicStyles.infoCard}>
          <Text style={dynamicStyles.infoTitle}>🔐 Что такое Passkey?</Text>
          <Text style={dynamicStyles.infoText}>
            Passkey — это безопасный способ входа в приложение с помощью биометрии (Face ID, Touch ID, отпечаток пальца) или PIN-кода вашего устройства. Это быстрее и безопаснее, чем пароли.
          </Text>
        </View>

        <TouchableOpacity
          style={[dynamicStyles.registerButton, (isRegistering || isLoading) && dynamicStyles.registerButtonDisabled]}
          onPress={handleRegisterPasskey}
          disabled={isRegistering || isLoading}
        >
          {isRegistering ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons name="add-circle-outline" size={24} color="#FFFFFF" />
              <Text style={dynamicStyles.registerButtonText}>Добавить Passkey</Text>
            </>
          )}
        </TouchableOpacity>

        {isLoading ? (
          <View style={dynamicStyles.emptyState}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : passkeys.length === 0 ? (
          <View style={dynamicStyles.emptyState}>
            <Ionicons name="key-outline" size={64} color={theme.textTertiary} style={dynamicStyles.emptyIcon} />
            <Text style={dynamicStyles.emptyTitle}>Нет Passkey</Text>
            <Text style={dynamicStyles.emptyText}>
              Вы еще не добавили ни одного Passkey. Добавьте Passkey для быстрого и безопасного входа.
            </Text>
          </View>
        ) : (
          <View style={dynamicStyles.section}>
            <Text style={dynamicStyles.sectionTitle}>ЗАРЕГИСТРИРОВАННЫЕ PASSKEYS</Text>
            {passkeys.map((passkey, index) => (
              <View
                key={passkey.id}
                style={[
                  dynamicStyles.passkeyCard,
                  index === passkeys.length - 1 && dynamicStyles.passkeyCardLast,
                ]}
              >
                <View style={dynamicStyles.passkeyHeader}>
                  <Ionicons
                    name="key"
                    size={24}
                    color={theme.primary}
                    style={dynamicStyles.passkeyIcon}
                  />
                  <View style={dynamicStyles.passkeyInfo}>
                    <Text style={dynamicStyles.passkeyName}>
                      {passkey.name || 'Устройство'}
                    </Text>
                    <Text style={dynamicStyles.passkeyDate}>
                      Создан: {formatDate(passkey.created_at)}
                    </Text>
                    {passkey.last_used_at && (
                      <Text style={dynamicStyles.passkeyDate}>
                        Последний вход: {formatDate(passkey.last_used_at)}
                      </Text>
                    )}
                  </View>
                  <View style={dynamicStyles.passkeyActions}>
                    <TouchableOpacity
                      style={dynamicStyles.actionButton}
                      onPress={() => handleRenamePasskey(passkey)}
                    >
                      <Ionicons name="create-outline" size={20} color={theme.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={dynamicStyles.actionButton}
                      onPress={() => handleDeletePasskey(passkey)}
                      disabled={isDeleting === passkey.id}
                    >
                      {isDeleting === passkey.id ? (
                        <ActivityIndicator size="small" color={theme.error} />
                      ) : (
                        <Ionicons name="trash-outline" size={20} color={theme.error} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Device Name Modal */}
      <Modal
        visible={showNameModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowNameModal(false);
          setDeviceName('');
          setEditingPasskey(null);
        }}
      >
        <View style={dynamicStyles.modalOverlay}>
          <View style={dynamicStyles.modalContent}>
            <Text style={dynamicStyles.modalTitle}>
              {editingPasskey ? 'Переименовать устройство' : 'Название устройства'}
            </Text>
            <TextInput
              style={dynamicStyles.input}
              placeholder="Введите название устройства"
              placeholderTextColor={theme.textTertiary}
              value={deviceName}
              onChangeText={setDeviceName}
              autoFocus
            />
            <View style={dynamicStyles.modalButtons}>
              <TouchableOpacity
                style={[dynamicStyles.modalButton, dynamicStyles.modalButtonCancel]}
                onPress={() => {
                  setShowNameModal(false);
                  setDeviceName('');
                  setEditingPasskey(null);
                  if (!editingPasskey) {
                    setPendingCredential(null);
                  }
                }}
              >
                <Text style={[dynamicStyles.modalButtonText, dynamicStyles.modalButtonTextCancel]}>
                  Отмена
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[dynamicStyles.modalButton, dynamicStyles.modalButtonConfirm]}
                onPress={editingPasskey ? handleFinishRename : handleFinishRegistration}
              >
                <Text style={[dynamicStyles.modalButtonText, dynamicStyles.modalButtonTextConfirm]}>
                  {editingPasskey ? 'Сохранить' : 'Готово'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default PasskeyManagementScreen;
