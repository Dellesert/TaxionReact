/**
 * AddPasskeyButton Component
 * Кнопка добавления нового Passkey
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';

interface AddPasskeyButtonProps {
  onPress: () => void;
  isLoading: boolean;
  isRegistering: boolean;
}

export const AddPasskeyButton: React.FC<AddPasskeyButtonProps> = ({
  onPress,
  isLoading,
  isRegistering,
}) => {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.registerButton,
        { backgroundColor: theme.primary },
        (isRegistering || isLoading) && styles.registerButtonDisabled,
      ]}
      onPress={onPress}
      disabled={isRegistering || isLoading}
    >
      {isRegistering ? (
        <ActivityIndicator color="#FFFFFF" size="small" />
      ) : (
        <>
          <Ionicons name="add-circle-outline" size={24} color="#FFFFFF" />
          <Text style={styles.registerButtonText}>Добавить Passkey</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  registerButton: {
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
});
