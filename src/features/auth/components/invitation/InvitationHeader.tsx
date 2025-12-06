import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';

interface InvitationHeaderProps {
  subtitle: string;
}

export const InvitationHeader: React.FC<InvitationHeaderProps> = ({ subtitle }) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>✉️</Text>
      <Text style={[styles.title, { color: theme.text }]}>Приглашение в Tachyon</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 40,
  },
  icon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
});
