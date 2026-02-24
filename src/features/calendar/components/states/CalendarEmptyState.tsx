import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

export const CalendarEmptyState: React.FC = () => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.icon, { backgroundColor: theme.backgroundSecondary }]}>
        <Ionicons name="calendar-outline" size={48} color={theme.textTertiary} />
      </View>
      <Text style={[styles.title, { color: theme.text }]}>Нет событий</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        Нажмите + чтобы создать новое событие
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  icon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
