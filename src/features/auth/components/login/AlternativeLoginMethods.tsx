import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';

interface AlternativeLoginMethodsProps {
  passkeySupported: boolean;
  isPasskeyLoading: boolean;
  isLoading: boolean;
  onPasskeyLogin: () => void;
  onAcceptInvitation: () => void;
}

export const AlternativeLoginMethods: React.FC<AlternativeLoginMethodsProps> = ({
  passkeySupported,
  isPasskeyLoading,
  isLoading,
  onPasskeyLogin,
  onAcceptInvitation,
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      {passkeySupported && (
        <TouchableOpacity
          style={styles.link}
          onPress={onPasskeyLogin}
          disabled={isPasskeyLoading || isLoading}
          activeOpacity={0.7}
        >
          {isPasskeyLoading ? (
            <ActivityIndicator color={theme.primary} size="small" />
          ) : (
            <Text style={[styles.text, { color: theme.textSecondary }]}>🔑 Быстрый вход</Text>
          )}
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.link}
        onPress={onAcceptInvitation}
        disabled={isLoading}
        activeOpacity={0.7}
      >
        <Text style={[styles.text, { color: theme.textSecondary }]}>✉️ Есть приглашение?</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 24,
  },
  link: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  text: {
    fontSize: 15,
    fontWeight: '500',
  },
});
