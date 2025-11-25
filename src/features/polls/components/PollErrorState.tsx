import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { isPrivatePollError } from '../utils/pollHelpers';

interface PollErrorStateProps {
  error: string;
  onRetry: () => void;
  onGoBack: () => void;
}

export const PollErrorState: React.FC<PollErrorStateProps> = ({
  error,
  onRetry,
  onGoBack,
}) => {
  const { theme } = useTheme();
  const isPrivateError = isPrivatePollError(error);

  return (
    <View style={styles.centerContainer}>
      <Ionicons
        name={isPrivateError ? 'lock-closed' : 'alert-circle'}
        size={64}
        color={isPrivateError ? '#F59E0B' : '#EF4444'}
      />
      <Text style={[styles.errorText, isPrivateError && { color: '#F59E0B' }]}>
        {error}
      </Text>
      {!isPrivateError && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryButtonText}>Попробовать снова</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={[
          styles.retryButton,
          { backgroundColor: theme.backgroundSecondary, marginTop: 12 },
        ]}
        onPress={onGoBack}
      >
        <Text style={[styles.retryButtonText, { color: theme.text }]}>
          Вернуться назад
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginTop: 12,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
