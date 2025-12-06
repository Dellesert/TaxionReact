import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

interface NoAccessViewProps {
  title?: string;
  message?: string;
}

export const NoAccessView: React.FC<NoAccessViewProps> = ({
  title = 'Нет доступа',
  message = 'Только администраторы имеют доступ к этому разделу',
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <Ionicons name="lock-closed" size={64} color="#EF4444" />
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.message, { color: theme.textSecondary }]}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});
