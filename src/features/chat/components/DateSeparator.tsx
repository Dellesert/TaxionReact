import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';

interface DateSeparatorProps {
  date: string; // "Сегодня", "Вчера", или "15 октября"
}

export const DateSeparator: React.FC<DateSeparatorProps> = ({ date }) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.dateText, { color: theme.textSecondary }]}>
        {date}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
