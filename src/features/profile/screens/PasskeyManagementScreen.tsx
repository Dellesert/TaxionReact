/**
 * Passkey Management Screen
 * Управление passkeys (биометрическая аутентификация)
 */

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@hooks/useTheme';
import { usePasskeyData } from '../hooks/usePasskeyData';
import { usePasskeyActions } from '../hooks/usePasskeyActions';
import { usePasskeyModal } from '../hooks/usePasskeyModal';
import { PasskeyCard } from '../components/PasskeyCard';
import { PasskeyEmptyState } from '../components/PasskeyEmptyState';
import { PasskeyInfoCard } from '../components/PasskeyInfoCard';
import { PasskeyNameModal } from '../components/PasskeyNameModal';
import { AddPasskeyButton } from '../components/AddPasskeyButton';

const PasskeyManagementScreen: React.FC = () => {
  const navigation = useNavigation();
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
        <SafeAreaView style={{ backgroundColor: theme.backgroundSecondary }} edges={['top']}>
          <View
            style={[
              styles.header,
              { backgroundColor: theme.backgroundSecondary, borderBottomColor: theme.border },
            ]}
          >
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color={theme.primary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Управление Passkey</Text>
            <View style={styles.headerRight} />
          </View>
        </SafeAreaView>
        <PasskeyEmptyState isLoading={false} isSupported={false} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={{ backgroundColor: theme.backgroundSecondary }} edges={['top']}>
        <View
          style={[
            styles.header,
            { backgroundColor: theme.backgroundSecondary, borderBottomColor: theme.border },
          ]}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Управление Passkey</Text>
          <View style={styles.headerRight} />
        </View>
      </SafeAreaView>

      <ScrollView style={styles.content}>
        <PasskeyInfoCard />

        <AddPasskeyButton
          onPress={handleRegister}
          isLoading={isLoading}
          isRegistering={isRegistering}
        />

        {isLoading || passkeys.length === 0 ? (
          <PasskeyEmptyState isLoading={isLoading} isSupported={true} />
        ) : (
          <View style={[styles.section, { backgroundColor: theme.backgroundSecondary }]}>
            <Text style={[styles.sectionTitle, { color: theme.textTertiary }]}>
              ЗАРЕГИСТРИРОВАННЫЕ PASSKEYS
            </Text>
            {passkeys.map((passkey, index) => (
              <PasskeyCard
                key={passkey.id}
                passkey={passkey}
                isLast={index === passkeys.length - 1}
                isDeleting={isDeleting === passkey.id}
                onRename={openForRename}
                onDelete={handleDeletePasskey}
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
        onCancel={cancelModal}
        onConfirm={handleModalConfirm}
      />
    </View>
  );
};

export default PasskeyManagementScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 0 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
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
    marginBottom: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
});
