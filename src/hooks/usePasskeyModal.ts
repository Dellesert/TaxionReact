/**
 * usePasskeyModal Hook
 * Управление модальным окном для ввода имени устройства
 */

import { useState } from 'react';
import type { Passkey } from '@types/user.types';

export const usePasskeyModal = () => {
  const [showNameModal, setShowNameModal] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [editingPasskey, setEditingPasskey] = useState<Passkey | null>(null);
  const [pendingCredential, setPendingCredential] = useState<any>(null);

  /**
   * Open modal for new passkey registration
   */
  const openForRegistration = (credential: any, defaultName: string) => {
    setPendingCredential(credential);
    setDeviceName(defaultName);
    setShowNameModal(true);
  };

  /**
   * Open modal for passkey rename
   */
  const openForRename = (passkey: Passkey) => {
    setEditingPasskey(passkey);
    setDeviceName(passkey.name || '');
    setShowNameModal(true);
  };

  /**
   * Close modal and reset state
   */
  const closeModal = () => {
    setShowNameModal(false);
    setDeviceName('');
    setEditingPasskey(null);
    setPendingCredential(null);
  };

  /**
   * Cancel modal (with conditional credential cleanup)
   */
  const cancelModal = () => {
    setShowNameModal(false);
    setDeviceName('');
    setEditingPasskey(null);
    if (!editingPasskey) {
      setPendingCredential(null);
    }
  };

  return {
    showNameModal,
    deviceName,
    editingPasskey,
    pendingCredential,
    setDeviceName,
    openForRegistration,
    openForRename,
    closeModal,
    cancelModal,
  };
};
