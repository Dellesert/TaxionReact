/**
 * Passkey Management Content
 * Контент для управления passkeys (без header)
 */

import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';
import { usePasskeyData } from '../../hooks/usePasskeyData';
import { usePasskeyActions } from '../../hooks/usePasskeyActions';
import { usePasskeyModal } from '../../hooks/usePasskeyModal';
import { PasskeyCard } from '../passkeys/PasskeyCard';
import { PasskeyEmptyState } from '../passkeys/PasskeyEmptyState';
import { PasskeyInfoCard } from '../passkeys/PasskeyInfoCard';
import { PasskeyNameModal } from '../passkeys/PasskeyNameModal';
import { AddPasskeyButton } from '../passkeys/AddPasskeyButton';

const PasskeyManagementContent: React.FC = () => {
  const { theme } = useTheme();
  const { passkeys, isLoading, passkeySupported, loadPasskeys } = usePasskeyData();
  const {
    isRegistering,
    isDeleting,
    handleRegisterPasskey,
    finishRegistration,
    handleDeletePasskey,
    handleRenamePasskey,
  } = usePasskeyActions(passkeySupported, loadPasskeys);
  const {
    showNameModal,
    deviceName,
    editingPasskey,
    pendingCredential,
    setDeviceName,
    openForRegistration,
    openForRename,
    closeModal,
    cancelModal,
  } = usePasskeyModal();

  const handleRegister = async () => {
    const result = await handleRegisterPasskey();
    if (result) {
      openForRegistration(result.credential, result.defaultName);
    }
  };

  const handleModalConfirm = async () => {
    if (editingPasskey) {
      const success = await handleRenamePasskey(editingPasskey.id, deviceName);
      if (success) {
        closeModal();
      }
    } else {
      const success = await finishRegistration(pendingCredential, deviceName);
      if (success) {
        closeModal();
      }
    }
  };

  if (!passkeySupported) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <PasskeyEmptyState isLoading={false} isSupported={false} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <PasskeyInfoCard />

        <AddPasskeyButton onPress={handleRegister} isLoading={isRegistering} isRegistering={isRegistering} />

        {isLoading ? (
          <PasskeyEmptyState isLoading={true} isSupported={passkeySupported} />
        ) : passkeys.length === 0 ? (
          <PasskeyEmptyState isLoading={false} isSupported={passkeySupported} />
        ) : (
          <View style={styles.passkeysList}>
            {passkeys.map((passkey, index) => (
              <PasskeyCard
                key={passkey.id}
                passkey={passkey}
                isLast={index === passkeys.length - 1}
                onRename={openForRename}
                onDelete={handleDeletePasskey}
                isDeleting={!!isDeleting}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <PasskeyNameModal
        visible={showNameModal}
        deviceName={deviceName}
        isEditing={!!editingPasskey}
        onChangeText={setDeviceName}
        onConfirm={handleModalConfirm}
        onCancel={cancelModal}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  passkeysList: {
    marginTop: 8,
    gap: 12,
  },
});

export default PasskeyManagementContent;
