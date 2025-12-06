import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

interface TaskAccessDeniedProps {
  onGoBack: () => void;
}

export const TaskAccessDenied: React.FC<TaskAccessDeniedProps> = ({ onGoBack }) => {
  const { theme } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.card }} edges={['top']}>
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        {/* Header */}
        <View
          style={{
            backgroundColor: theme.card,
            paddingTop: 12,
            paddingBottom: 16,
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          }}
        >
          <TouchableOpacity
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: theme.backgroundTertiary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={onGoBack}
          >
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* Access Denied Content */}
        <View style={styles.container}>
          <Ionicons name="lock-closed" size={64} color={theme.textTertiary} />
          <Text style={[styles.title, { color: theme.text }]}>Приватная задача</Text>
          <Text style={[styles.message, { color: theme.textSecondary }]}>
            Эта задача является приватной. Вы не имеете доступа к её просмотру.
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.primary }]}
            onPress={onGoBack}
          >
            <Text style={styles.buttonText}>Вернуться назад</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 24,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 24,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 32,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
