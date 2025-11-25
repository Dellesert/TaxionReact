import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NotificationBell } from '@components/common/NotificationBell';
import { useTheme } from '@hooks/useTheme';

interface CalendarHeaderProps {
  onAddPress: () => void;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({ onAddPress }) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <NotificationBell />
      </View>

      <Text style={[styles.title, { color: theme.text }]}>Календарь</Text>

      <TouchableOpacity onPress={onAddPress} style={styles.addButton}>
        <Ionicons name="add" size={30} color={theme.primary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  left: {
    width: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
