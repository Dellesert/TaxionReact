import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

interface ChatErrorStateProps {
  error: string;
  onRetry: () => void;
}

export const ChatErrorState: React.FC<ChatErrorStateProps> = ({ error, onRetry }) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <Ionicons name="alert-circle" size={64} color={theme.error} />
      <Text style={[styles.errorText, { color: theme.textSecondary }]}>{error}</Text>
      <TouchableOpacity
        style={[styles.retryButton, { backgroundColor: theme.error }]}
        onPress={onRetry}
      >
        <Text style={styles.retryButtonText}>Попробовать снова</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
