import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';

export const ChatEmptyState: React.FC = () => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" />
      <Text style={[styles.text, { color: theme.textSecondary }]}>Нет чатов</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  text: {
    fontSize: 16,
    marginTop: 16,
  },
});
