import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { InvitationData, getRoleLabel } from '../../utils/invitationHelpers';
import { useTheme } from '@shared/hooks/useTheme';

interface InvitationInfoBoxProps {
  data: InvitationData;
}

export const InvitationInfoBox: React.FC<InvitationInfoBoxProps> = ({ data }) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundSecondary,
          borderLeftColor: theme.primary,
        },
      ]}
    >
      <Text style={[styles.title, { color: theme.text }]}>Информация о приглашении</Text>

      <View style={styles.row}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>Имя:</Text>
        <Text style={[styles.value, { color: theme.text }]}>{data.name}</Text>
      </View>

      <View style={styles.row}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>Email:</Text>
        <Text style={[styles.value, { color: theme.text }]}>{data.email}</Text>
      </View>

      <View style={styles.row}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>Роль:</Text>
        <Text style={[styles.value, { color: theme.text }]}>{getRoleLabel(data.role)}</Text>
      </View>

      {data.department && (
        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Отдел:</Text>
          <Text style={[styles.value, { color: theme.text }]}>{data.department.name}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  value: {
    fontSize: 14,
    flex: 1,
    textAlign: 'right',
  },
});
